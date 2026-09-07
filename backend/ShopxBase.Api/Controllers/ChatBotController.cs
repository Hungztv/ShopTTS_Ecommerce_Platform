using Microsoft.AspNetCore.Mvc;
using ShopxBase.Domain.Interfaces;
using ShopxBase.Infrastructure.Services;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Globalization;

namespace ShopxBase.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class ChatBotController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ChatBotController> _logger;
    private readonly IChatBotProductService _productService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEmbeddingService _embeddingService;
    private readonly IVectorSearchService _vectorSearchService;
    private readonly IUserBehaviorService _behaviorService;

    private const string GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private const string DEFAULT_MODEL = "openai/gpt-oss-120b";

    // Fallback models when primary model fails or hits rate limit
    private static readonly string[] DEFAULT_FALLBACK_MODELS = new[]
    {
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
        "groq/compound-mini"
    };

    public ChatBotController(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<ChatBotController> logger,
        IChatBotProductService productService,
        IUnitOfWork unitOfWork,
        IEmbeddingService embeddingService,
        IVectorSearchService vectorSearchService,
        IUserBehaviorService behaviorService)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
        _productService = productService;
        _unitOfWork = unitOfWork;
        _embeddingService = embeddingService;
        _vectorSearchService = vectorSearchService;
        _behaviorService = behaviorService;
    }

    // ════════════════════════════════════════════════════════════
    //  POST /api/ChatBot/send — Main chat endpoint (non-streaming)
    // ════════════════════════════════════════════════════════════
    [HttpPost("send")]
    public async Task<IActionResult> SendMessage([FromBody] ChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            return BadRequest(new { success = false, message = "Tin nhắn không được để trống" });

        var apiKey = GetApiKey();
        if (apiKey == null)
            return StatusCode(500, new { success = false, message = "ChatBot chưa được cấu hình" });

        try
        {
            // ── Intent detection + smart product & context resolution ──
            var intent = DetectIntent(request.Message);
            var userId = GetUserId();
            var (products, extraContext) = await ResolveContextAndProductsAsync(
                request.Message, intent, request.SessionId, userId);

            // ── Inject user behavior context for all intents ──
            try
            {
                var behaviorContext = await _behaviorService.GetRecommendationContextAsync(userId, request.SessionId);
                if (!string.IsNullOrEmpty(behaviorContext))
                    extraContext = string.IsNullOrEmpty(extraContext)
                        ? behaviorContext
                        : $"{extraContext}\n\n{behaviorContext}";
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get behavior context, continuing without it");
            }

            // ── Auto-track search queries ──
            if (intent == ChatIntent.SearchProduct || intent == ChatIntent.PriceRange)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _behaviorService.TrackAsync(new TrackBehaviorRequest
                        {
                            UserId = GetUserId(),
                            SessionId = request.SessionId,
                            BehaviorType = ShopxBase.Domain.Entities.BehaviorType.Search,
                            SearchQuery = request.Message,
                            SourcePage = "chatbot"
                        });
                    }
                    catch { /* fire & forget */ }
                });
            }

            // ── RAG: Embed query → vector search → inject context ──
            var ragContext = await GetRagContextAsync(request.Message, products, intent);
            if (!string.IsNullOrEmpty(ragContext))
                extraContext = string.IsNullOrEmpty(extraContext)
                    ? ragContext
                    : $"{extraContext}\n\n{ragContext}";

            var categories = await _productService.GetAvailableCategoriesAsync();
            var messages = BuildMessagesWithContext(request, products, categories, extraContext, intent);

            var (response, errorCode) = await CallGroqAsync(apiKey, messages);

            if (response == null)
            {
                // If rate limited, return a user-friendly message
                if (errorCode == "rate_limit_exceeded")
                    return StatusCode(429, new { success = false, message = "AI đang quá tải, vui lòng thử lại sau 1-2 phút" });
                return StatusCode(502, new { success = false, message = "Chatbot đang gặp sự cố" });
            }

            var reply = response.Choices?.FirstOrDefault()?.Message?.Content
                ?? "Xin lỗi, tôi không thể trả lời lúc này. Vui lòng thử lại sau.";

            // Extract suggested follow-ups from AI response
            var (cleanReply, suggestions) = ExtractSuggestions(reply);

            return Ok(new
            {
                success = true,
                data = new
                {
                    reply = cleanReply,
                    products = products.Select(MapProductResponse),
                    suggestions,
                    intent = intent.ToString(),
                    model = response.Model ?? GetModelsToTry().First(),
                    usage = response.Usage
                }
            });
        }
        catch (TaskCanceledException)
        {
            return StatusCode(504, new { success = false, message = "Chatbot phản hồi quá lâu, vui lòng thử lại" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ChatBot SendMessage");
            return StatusCode(500, new { success = false, message = "Đã xảy ra lỗi khi xử lý tin nhắn" });
        }
    }

    // ════════════════════════════════════════════════════════════
    //  POST /api/ChatBot/stream — Streaming response (SSE)
    // ════════════════════════════════════════════════════════════
    [HttpPost("stream")]
    public async Task StreamMessage([FromBody] ChatRequest request)
    {
        Response.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";

        if (string.IsNullOrWhiteSpace(request.Message))
        {
            await WriteSSE("error", JsonSerializer.Serialize(new { message = "Tin nhắn không được để trống" }));
            return;
        }

        var apiKey = GetApiKey();
        if (apiKey == null)
        {
            await WriteSSE("error", JsonSerializer.Serialize(new { message = "ChatBot chưa được cấu hình" }));
            return;
        }

        try
        {
            // ── Intent detection + smart product & context resolution ──
            var intent = DetectIntent(request.Message);
            var sUserId = GetUserId();
            var (products, extraContext) = await ResolveContextAndProductsAsync(
                request.Message, intent, request.SessionId, sUserId);

            // ── Inject user behavior context for all intents ──
            try
            {
                var sBehaviorCtx = await _behaviorService.GetRecommendationContextAsync(sUserId, request.SessionId);
                if (!string.IsNullOrEmpty(sBehaviorCtx))
                    extraContext = string.IsNullOrEmpty(extraContext)
                        ? sBehaviorCtx
                        : $"{extraContext}\n\n{sBehaviorCtx}";
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get behavior context for streaming, continuing without it");
            }

            // ── Auto-track search queries (streaming) ──
            if (intent == ChatIntent.SearchProduct || intent == ChatIntent.PriceRange)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _behaviorService.TrackAsync(new TrackBehaviorRequest
                        {
                            UserId = GetUserId(),
                            SessionId = request.SessionId,
                            BehaviorType = ShopxBase.Domain.Entities.BehaviorType.Search,
                            SearchQuery = request.Message,
                            SourcePage = "chatbot"
                        });
                    }
                    catch { /* fire & forget */ }
                });
            }

            // ── RAG: Embed query → vector search → inject context ──
            var ragContext = await GetRagContextAsync(request.Message, products, intent);
            if (!string.IsNullOrEmpty(ragContext))
                extraContext = string.IsNullOrEmpty(extraContext)
                    ? ragContext
                    : $"{extraContext}\n\n{ragContext}";

            // Send products first
            if (products.Any())
            {
                await WriteSSE("products", JsonSerializer.Serialize(
                    products.Select(MapProductResponse),
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
                ));
            }

            // Send intent
            await WriteSSE("intent", intent.ToString());

            // Stream AI response
            var categories = await _productService.GetAvailableCategoriesAsync();
            var messages = BuildMessagesWithContext(request, products, categories, extraContext, intent);

            // Try primary model first, fallback on error or rate limit
            var modelsToTry = GetModelsToTry();

            HttpResponseMessage? httpResponse = null;
            string? usedModel = null;

            foreach (var model in modelsToTry)
            {
                try
                {
                    var client = _httpClientFactory.CreateClient();
                    client.DefaultRequestHeaders.Clear();
                    client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
                    client.Timeout = TimeSpan.FromSeconds(45);

                    var requestBody = new Dictionary<string, object>
                    {
                        ["model"] = model,
                        ["messages"] = messages,
                        ["temperature"] = 0.7,
                        ["max_tokens"] = 4096,
                        ["stream"] = true
                    };

                    var json = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
                    });

                    var httpRequest = new HttpRequestMessage(HttpMethod.Post, GROQ_API_URL)
                    {
                        Content = new StringContent(json, Encoding.UTF8, "application/json")
                    };

                    httpResponse = await client.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead);

                    if (httpResponse.IsSuccessStatusCode)
                    {
                        usedModel = model;
                        if (model != modelsToTry.First())
                            _logger.LogInformation("GROQ stream: Using fallback model {Model}", model);
                        break;
                    }

                    // On error or rate limit, log and try next model
                    var errBody = await httpResponse.Content.ReadAsStringAsync();
                    _logger.LogWarning("GROQ stream failed on {Model}: {Status} - {Body}. Trying next fallback...",
                        model, httpResponse.StatusCode, errBody);

                    httpResponse.Dispose();
                    httpResponse = null;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "GROQ stream exception on {Model}. Trying next fallback...", model);
                    httpResponse?.Dispose();
                    httpResponse = null;
                }
            }

            if (httpResponse == null || !httpResponse.IsSuccessStatusCode)
            {
                await WriteSSE("error", JsonSerializer.Serialize(new { message = "AI đang quá tải hoặc gặp sự cố, vui lòng thử lại sau 1-2 phút" }));
                return;
            }

            using var stream = await httpResponse.Content.ReadAsStreamAsync();
            using var reader = new StreamReader(stream);

            var fullContent = new StringBuilder();

            string? line;
            while ((line = await reader.ReadLineAsync()) != null)
            {
                if (string.IsNullOrEmpty(line)) continue;
                if (!line.StartsWith("data: ")) continue;

                var data = line["data: ".Length..];
                if (data == "[DONE]") break;

                try
                {
                    using var doc = JsonDocument.Parse(data);
                    if (doc.RootElement.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
                    {
                        var choice = choices[0];
                        if (choice.TryGetProperty("delta", out var delta) && delta.TryGetProperty("content", out var contentProp))
                        {
                            var chunk = contentProp.GetString();
                            if (!string.IsNullOrEmpty(chunk))
                            {
                                fullContent.Append(chunk);
                                await WriteSSE("token", chunk);
                            }
                        }
                    }
                }
                catch { /* skip malformed chunks */ }
            }

            // Extract suggestions from full response
            var (cleanReply, suggestions) = ExtractSuggestions(fullContent.ToString());
            if (cleanReply != fullContent.ToString())
            {
                // JSON-encode to preserve multiline content in SSE
                await WriteSSE("clean_reply", JsonSerializer.Serialize(cleanReply));
            }
            if (suggestions.Length > 0)
            {
                await WriteSSE("suggestions", JsonSerializer.Serialize(suggestions));
            }

            await WriteSSE("done", "{}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in ChatBot StreamMessage");
            await WriteSSE("error", JsonSerializer.Serialize(new { message = "Đã xảy ra lỗi" }));
        }
    }

    // ════════════════════════════════════════════════════════════
    //  GET /api/ChatBot/recommend/{productId}
    // ════════════════════════════════════════════════════════════
    [HttpGet("recommend/{productId:int}")]
    public async Task<IActionResult> GetRecommendations(int productId)
    {
        try
        {
            var similar = await _productService.GetSimilarProductsAsync(productId, 8);
            return Ok(new { success = true, data = similar.Select(MapProductResponse) });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recommendations for product {ProductId}", productId);
            return StatusCode(500, new { success = false, message = "Không thể lấy gợi ý sản phẩm" });
        }
    }

    // ════════════════════════════════════════════════════════════
    //  GET /api/ChatBot/trending
    // ════════════════════════════════════════════════════════════
    [HttpGet("trending")]
    public async Task<IActionResult> GetTrending([FromQuery] int limit = 8)
    {
        try
        {
            var trending = await _productService.GetTrendingProductsAsync(null, limit);
            return Ok(new { success = true, data = trending.Select(MapProductResponse) });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trending products");
            return StatusCode(500, new { success = false, message = "Không thể lấy sản phẩm trending" });
        }
    }

    // ════════════════════════════════════════════════════════════
    //  GET /api/ChatBot/coupons — Active coupons
    // ════════════════════════════════════════════════════════════
    [HttpGet("coupons")]
    public async Task<IActionResult> GetActiveCoupons()
    {
        try
        {
            var now = DateTime.UtcNow;
            var coupons = await _unitOfWork.Coupons
                .FindAsync(c => !c.IsDeleted && c.DateStart <= now && c.DateExpired >= now
                    && c.Quantity > c.UsedCount && c.Status == 1);

            return Ok(new
            {
                success = true,
                data = coupons.Select(c => new
                {
                    c.Code,
                    c.Name,
                    c.Description,
                    discount = c.IsPercent ? $"{c.DiscountValue}%" : $"{c.DiscountValue:N0}đ",
                    minOrder = c.MinimumOrderValue,
                    expiresAt = c.DateExpired,
                    remaining = c.Quantity - c.UsedCount
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active coupons");
            return StatusCode(500, new { success = false, message = "Không thể lấy mã giảm giá" });
        }
    }

    // ════════════════════════════════════════════════════════════
    //  POST /api/ChatBot/index — Index a document for RAG
    // ════════════════════════════════════════════════════════════
    [HttpPost("index")]
    public async Task<IActionResult> IndexDocument([FromBody] IndexDocumentRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
                return BadRequest(new { success = false, message = "Title và Content không được để trống" });

            var embedding = await _embeddingService.EmbedAsync($"{request.Title}\n{request.Content}");
            if (embedding == null)
                return StatusCode(502, new { success = false, message = "Không thể tạo embedding (Gemini API lỗi)" });

            var doc = await _vectorSearchService.IndexDocumentAsync(
                request.Title, request.Content, request.Source, request.SourceId, embedding);

            return Ok(new { success = true, data = new { id = doc?.Id, title = doc?.Title } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error indexing document");
            return StatusCode(500, new { success = false, message = "Lỗi khi index document" });
        }
    }

    // ════════════════════════════════════════════════════════════
    //  POST /api/ChatBot/seed-products — Seed all products into vector DB
    // ════════════════════════════════════════════════════════════
    [HttpPost("seed-products")]
    public async Task<IActionResult> SeedProducts()
    {
        try
        {
            var products = await _unitOfWork.ProductRepository.GetAllWithDetailsAsync();
            var documents = products
                .Where(p => !p.IsDeleted && p.Quantity > 0)
                .Select(p => new DocumentInput
                {
                    Title = p.Name,
                    Content = $"Sản phẩm: {p.Name}\n" +
                              $"Giá: {p.Price:N0}đ\n" +
                              $"Thương hiệu: {p.Brand?.Name ?? "N/A"}\n" +
                              $"Danh mục: {p.Category?.Name ?? "N/A"}\n" +
                              $"Shop: {p.Shop?.Name ?? "N/A"}\n" +
                              $"Đánh giá: {p.AverageScore:F1}/5 ({p.RatingCount} lượt)\n" +
                              $"Đã bán: {p.SoldOut}\n" +
                              $"Mô tả: {p.Description?[..Math.Min(p.Description.Length, 500)] ?? "N/A"}",
                    Source = "product",
                    SourceId = p.Id
                });

            var count = await _vectorSearchService.BulkIndexAsync(documents, _embeddingService);

            return Ok(new { success = true, message = $"Đã index {count} sản phẩm vào vector DB" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding products to vector DB");
            return StatusCode(500, new { success = false, message = "Lỗi khi seed products" });
        }
    }

    // ══════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ══════════════════════════════════════════════════

    // ── RAG: Embed query → vector search → return context string ──
    private async Task<string> GetRagContextAsync(
        string userMessage, List<ChatProductInfo>? foundProducts = null, ChatIntent? intent = null)
    {
        // Không inject context sản phẩm RAG vào các cuộc hội thoại về chính sách, người bán, hệ thống shop, đơn hàng, mặt hàng không hỗ trợ, hoặc lời chào
        if (intent == ChatIntent.StorePolicy ||
            intent == ChatIntent.SellerInquiry ||
            intent == ChatIntent.ShopDirectory ||
            intent == ChatIntent.OrderTracking ||
            intent == ChatIntent.UnsupportedProduct ||
            intent == ChatIntent.Greeting)
        {
            return "";
        }

        try
        {
            // 1️⃣ Embed the user query using Gemini (RETRIEVAL_QUERY task type)
            var geminiService = _embeddingService as GeminiEmbeddingService;
            var queryEmbedding = geminiService != null
                ? await geminiService.EmbedQueryAsync(userMessage)
                : await _embeddingService.EmbedAsync(userMessage);

            if (queryEmbedding == null || queryEmbedding.Length == 0)
            {
                _logger.LogWarning("RAG: Failed to embed user query, skipping vector search");
                return "";
            }

            // 2️⃣ Search Supabase for top 3 closest chunks
            var results = await _vectorSearchService.SearchAsync(queryEmbedding, topK: 3, threshold: 0.45);

            if (!results.Any())
            {
                _logger.LogInformation("RAG: No relevant documents found for query");
                return "";
            }

            // CRITICAL: Nếu đã tìm được sản phẩm chính xác từ DB cho danh mục cụ thể (vd: Bàn phím),
            // loại bỏ các tài liệu RAG sản phẩm thuộc danh mục hoàn toàn khác (vd: iPad, Vivobook...)
            if (foundProducts != null && foundProducts.Any())
            {
                var allowedProductIds = foundProducts.Select(p => (int?)p.Id).ToHashSet();
                var allowedCategories = foundProducts
                    .Select(p => p.CategoryName.ToLowerInvariant())
                    .Where(c => !string.IsNullOrEmpty(c))
                    .ToList();

                results = results.Where(r =>
                    r.Source != "product" ||
                    (r.SourceId.HasValue && allowedProductIds.Contains(r.SourceId)) ||
                    allowedCategories.Any(c => r.Content.ToLowerInvariant().Contains(c))
                ).ToList();

                if (!results.Any())
                {
                    return "";
                }
            }

            // 3️⃣ Format results as context for the LLM
            var contextLines = results.Select((r, i) =>
                $"[Tài liệu {i + 1}] (Độ liên quan: {r.Similarity:P0})\n" +
                $"Nguồn: {r.Source ?? "N/A"} | {r.Title}\n" +
                $"{r.Content}"
            );

            _logger.LogInformation("RAG: Found {Count} relevant documents (best similarity: {Sim:P0})",
                results.Count, results.First().Similarity);

            return $"📚 KIẾN THỨC BỔ SUNG (RAG):\n{string.Join("\n\n", contextLines)}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "RAG context retrieval failed");
            return "";
        }
    }

    private string? GetApiKey()
    {
        var key = Environment.GetEnvironmentVariable("GROQ_API_KEY")
            ?? _configuration["Groq:ApiKey"];
        if (string.IsNullOrEmpty(key))
        {
            _logger.LogError("GROQ_API_KEY is not configured");
            return null;
        }
        return key;
    }

    private List<string> GetModelsToTry(string? overrideModel = null)
    {
        var models = new List<string>();
        if (!string.IsNullOrEmpty(overrideModel))
        {
            models.Add(overrideModel);
            return models;
        }

        var configuredModel = Environment.GetEnvironmentVariable("GROQ_MODEL")
            ?? _configuration["Groq:Model"];

        var primary = !string.IsNullOrWhiteSpace(configuredModel) ? configuredModel.Trim() : DEFAULT_MODEL;
        models.Add(primary);

        foreach (var fallback in DEFAULT_FALLBACK_MODELS)
        {
            if (!models.Contains(fallback, StringComparer.OrdinalIgnoreCase))
                models.Add(fallback);
        }

        return models;
    }

    private string? GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
    }

    // ── Unified Smart Search & Recommendation ──
    private async Task<(List<ChatProductInfo> Products, string ExtraContext)> ResolveContextAndProductsAsync(
        string message, ChatIntent intent, string? sessionId, string? userId)
    {
        var (minPrice, maxPrice) = ExtractPriceRange(message);
        var products = new List<ChatProductInfo>();
        var extraContext = "";

        switch (intent)
        {
            case ChatIntent.Greeting:
                products = new List<ChatProductInfo>();
                extraContext = "Khách hàng gửi lời chào hoặc cảm ơn. Hãy chào đón nồng nhiệt bằng phong cách ShopTTS AI thân thiện, giới thiệu ngắn gọn các ngành hàng công nghệ chính và hỏi xem có thể hỗ trợ gì cho khách.";
                break;

            case ChatIntent.UnsupportedProduct:
                products = new List<ChatProductInfo>();
                _productService.IsUnsupportedProduct(message, out var unsupportedItem);
                extraContext = GetUnsupportedProductContext(unsupportedItem);
                break;

            case ChatIntent.StorePolicy:
                products = new List<ChatProductInfo>();
                extraContext = GetStorePolicyContext(message);
                break;

            case ChatIntent.SellerInquiry:
                products = new List<ChatProductInfo>();
                extraContext = GetSellerContext();
                break;

            case ChatIntent.ShopDirectory:
                products = new List<ChatProductInfo>();
                extraContext = await GetShopsDirectoryContextAsync();
                break;

            case ChatIntent.OrderTracking:
                extraContext = await GetOrderContextAsync(message, userId);
                products = new List<ChatProductInfo>();
                break;

            case ChatIntent.CouponInquiry:
                extraContext = await GetCouponContextAsync();
                products = new List<ChatProductInfo>();
                break;

            case ChatIntent.CategoryBrowse:
                var cats = await _productService.GetAvailableCategoriesAsync();
                extraContext = $"DANH MỤC SẢN PHẨM CÓ SẴN ({cats.Count} danh mục): {string.Join(", ", cats)}";
                products = await _productService.GetTrendingProductsAsync(null, 6);
                break;

            case ChatIntent.Comparison:
                products = await ComparisonSearchAsync(message);
                extraContext = "Khách hàng muốn SO SÁNH sản phẩm. Hãy đối chiếu chi tiết các sản phẩm trong dữ liệu (Giá bán, Cấu hình/Thông số, Ưu điểm và Khuyên nên chọn sản phẩm nào cho ai).";
                break;

            case ChatIntent.Trending:
                products = await _productService.SmartSearchAsync(message, minPrice, maxPrice, 8);
                if (!products.Any())
                {
                    products = await _productService.GetTrendingProductsAsync(null, 8);
                }
                extraContext = "🔥 ĐÂY LÀ CÁC SẢN PHẨM BÁN CHẠY NHẤT & ĐƯỢC YÊU THÍCH NHẤT TRÊN HỆ THỐNG.";
                break;

            case ChatIntent.Recommendation:
            case ChatIntent.PriceRange:
            case ChatIntent.SearchProduct:
            default:
                products = await _productService.SmartSearchAsync(message, minPrice, maxPrice, 8);

                // Nếu hỏi gợi ý chung mà không nêu danh mục/sản phẩm cụ thể, lấy recommendation từ hành vi
                if (!products.Any() && (intent == ChatIntent.Recommendation || (intent != ChatIntent.SearchProduct && message.Length < 15)))
                {
                    var recProducts = await _behaviorService.GetPersonalizedRecommendationsAsync(userId, sessionId, 6);
                    if (recProducts.Any())
                    {
                        products = recProducts;
                        extraContext = "🎯 ĐÂY LÀ SẢN PHẨM ĐƯỢC CÁ NHÂN HÓA dựa trên lịch sử mua sắm của khách.";
                    }
                }

                if (products.Any() && (minPrice.HasValue || maxPrice.HasValue))
                {
                    var priceDesc = minPrice.HasValue && maxPrice.HasValue
                        ? $"từ {minPrice:N0}đ đến {maxPrice:N0}đ"
                        : minPrice.HasValue
                            ? $"từ {minPrice:N0}đ trở lên"
                            : $"dưới {maxPrice:N0}đ";
                    extraContext = $"💰 Khách hàng đang tìm sản phẩm trong khoảng giá {priceDesc}. Hãy ưu tiên giới thiệu các sản phẩm đúng tầm giá này.";

                    // Nếu khách tìm mức giá tối đa nhưng tất cả sản phẩm tìm được đều có giá cao hơn
                    if (maxPrice.HasValue && products.All(p => p.Price > maxPrice.Value))
                    {
                        var lowestP = products.OrderBy(p => p.Price).First();
                        extraContext += $"\n\n⚠️ LƯU Ý BẮT BUỘC VỀ NGÂN SÁCH: Khách hàng tìm kiếm sản phẩm với giá dưới {maxPrice:N0}đ. Tuy nhiên hiện tại trong kho ShopTTS, sản phẩm có giá thấp nhất thuộc danh mục này là **{lowestP.Name}** với giá **{lowestP.Price:N0}đ** (chỉ chênh lệch {lowestP.Price - maxPrice.Value:N0}đ). Bạn PHẢI TRUNG THỰC THÔNG BÁO RÕ RÀNG cho khách: 'Hiện tại ShopTTS chưa có mẫu nào dưới {maxPrice:N0}đ, nhưng mẫu có giá tốt nhất và gần nhất với ngân sách của bạn là {lowestP.Name} ({lowestP.Price:N0}đ)'. TUYỆT ĐỐI KHÔNG được bịa rằng có mẫu dưới {maxPrice:N0}đ!";
                    }
                }
                else if (!products.Any() && (intent == ChatIntent.SearchProduct || intent == ChatIntent.PriceRange))
                {
                    extraContext = "⚠️ KHÔNG TÌM THẤY SẢN PHẨM TRONG KHO: Hiện tại hệ thống không tìm thấy sản phẩm nào khớp với tiêu chí tìm kiếm này của khách. Hãy thông báo chân thành rằng ShopTTS hiện chưa có sản phẩm đúng yêu cầu đó, và gợi ý khách tham khảo các sản phẩm hoặc danh mục liên quan gần nhất hiện có trên sàn. TUYỆT ĐỐI KHÔNG bịa ra sản phẩm!";
                }
                break;
        }

        // Tự động gán HighlightBadge cho danh sách sản phẩm
        AssignHighlightBadges(products);

        return (products, extraContext);
    }

    private static void AssignHighlightBadges(List<ChatProductInfo> products)
    {
        if (products == null || !products.Any()) return;

        var maxSold = products.Max(p => p.SoldOut);
        var minPrice = products.Min(p => p.Price);
        var maxScore = products.Max(p => p.AverageScore);

        foreach (var p in products)
        {
            if (maxSold > 5 && p.SoldOut == maxSold)
            {
                p.HighlightBadge = "🔥 Bán chạy nhất";
            }
            else if (maxScore >= 4.7m && p.AverageScore == maxScore)
            {
                p.HighlightBadge = "⭐ Đánh giá cao";
            }
            else if (products.Count > 1 && p.Price == minPrice)
            {
                p.HighlightBadge = "💰 Giá tốt nhất";
            }
            else if (p.RatingCount >= 10)
            {
                p.HighlightBadge = "👍 Đáng mua";
            }
        }
    }

    // ── Intent Detection ──
    private ChatIntent DetectIntent(string message)
    {
        var lower = message.ToLower().Trim();

        // 0. Mặt hàng không kinh doanh (tủ lạnh, máy giặt, xe máy...)
        if (_productService.IsUnsupportedProduct(lower, out _))
            return ChatIntent.UnsupportedProduct;

        // 1. Kênh người bán / Đăng ký mở shop
        if (Regex.IsMatch(lower, @"(mở shop|mo shop|bán hàng trên|ban hang tren|đăng ký bán hàng|dang ky ban hang|người bán|nguoi ban|kênh người bán|kenh nguoi ban|mở gian hàng|mo gian hang|chính sách người bán|hoa hồng|hoa hong)"))
            return ChatIntent.SellerInquiry;

        // 2. Hệ thống cửa hàng / Showroom / Địa chỉ chi nhánh
        if (Regex.IsMatch(lower, @"(hệ thống cửa hàng|he thong cua hang|danh sách cửa hàng|danh sach cua hang|danh sách shop|danh sach shop|các shop|cac shop|showroom|chi nhánh|chi nhanh|địa chỉ cửa hàng|dia chi cua hang)"))
            return ChatIntent.ShopDirectory;

        // 3. Tra cứu & Quản lý đơn hàng (hủy đơn, đổi địa chỉ, theo dõi đơn...)
        if (Regex.IsMatch(lower, @"(đơn hàng|don hang|order|tracking|theo dõi|tình trạng đơn|mã đơn|tra cứu đơn|kiểm tra đơn|ord-|hủy đơn|huy don|đổi địa chỉ)"))
            return ChatIntent.OrderTracking;

        // 4. Mã giảm giá / Coupon / Voucher
        if (Regex.IsMatch(lower, @"(mã giảm|ma giam|coupon|voucher|khuyến mãi|khuyen mai|giảm giá|giam gia|mã code|discount|ưu đãi|deal)"))
            return ChatIntent.CouponInquiry;

        // 5. So sánh sản phẩm
        if (Regex.IsMatch(lower, @"(so sánh|so sanh|khác gì|khac gi|hay hơn|tốt hơn|nên mua cái nào|nên chọn|compare|vs|versus|giữa .* và)"))
            return ChatIntent.Comparison;

        // 6. Lời chào hỏi / cảm ơn
        if (Regex.IsMatch(lower, @"^(chào|chao|hello|hi|alo|xin chào|xin chao|good morning|good afternoon|good evening|hey|cảm ơn|cam on|thanks|thank you|tạm biệt|tam biet|bye)\b"))
        {
            if (!Regex.IsMatch(lower, @"(điện thoại|laptop|tai nghe|đồng hồ|máy tính|mua|giá|sản phẩm|tư vấn|tìm|cần)"))
                return ChatIntent.Greeting;
        }

        // 7. Chính sách cửa hàng (đổi trả, bảo hành, ship, thanh toán, hotline...)
        if (Regex.IsMatch(lower, @"(chính sách|chinh sach|đổi trả|doi tra|bảo hành|bao hanh|vận chuyển|van chuyen|giao hàng|giao hang|phí ship|phi ship|freeship|miễn phí ship|thanh toán|thanh toan|cod|trả góp|tra gop|thời gian nhận|bao lâu nhận|hotline|tổng đài|email hỗ trợ|địa chỉ|dia chi|trụ sở|tru so)"))
        {
            if (!Regex.IsMatch(lower, @"(mua|bán|giá|điện thoại|laptop|tai nghe|bàn phím|chuột)"))
                return ChatIntent.StorePolicy;
        }

        // 8. Duyệt danh mục
        if (Regex.IsMatch(lower, @"^(danh mục|danh muc|loại sản phẩm|có những gì|bán những gì|categories|chủng loại|phân loại)\b"))
            return ChatIntent.CategoryBrowse;

        // 9. Tìm sản phẩm cụ thể theo danh mục hoặc từ khóa thiết bị
        if (Regex.IsMatch(lower, @"(bàn phím|ban phim|keyboard|chuột|chuot|mouse|keychron|akko|màn hình|man hinh|monitor|laptop|macbook|notebook|thinkpad|vivobook|zenbook|legion|tuf|omen|spectre|inspiron|phone|smartphone|điện thoại|dien thoai|tai nghe|headphone|earbuds|airpods|đồng hồ|dong ho|smartwatch|ipad|máy tính bảng|may tinh bang|máy tính|may tinh|tivi|tv|loa|airtag|samsung|apple|iphone|xiaomi|oppo|dell|asus|lenovo|hp|msi|giày|quần|áo|túi|balo|camera|wifi|router)"))
            return ChatIntent.SearchProduct;

        // 10. Khoảng giá
        if (Regex.IsMatch(lower, @"(tầm giá|khoảng giá|ngân sách|tài chính|dưới \d|trên \d|từ \d.*đến|\d+\s*(triệu|trieu|củ|cu|tr|m|k|nghìn|ngàn)|budget|rẻ nhất|đắt nhất|bao nhiêu tiền)"))
            return ChatIntent.PriceRange;

        // 11. Trending / Bán chạy
        if (Regex.IsMatch(lower, @"(bán chạy|ban chay|trending|phổ biến|pho bien|\bhot\b|best seller|nhiều người mua|nổi bật|xu hướng|yêu thích|đáng mua nhất|\btop\b)"))
            return ChatIntent.Trending;

        // 12. Gợi ý cá nhân hóa
        if (Regex.IsMatch(lower, @"(gợi ý cho tôi|đề xuất|phù hợp với tôi|recommend|cá nhân|dành cho tôi|tư vấn cho tôi|hợp với tôi|chọn giúp tôi|tư vấn)"))
            return ChatIntent.Recommendation;

        // 13. Tìm kiếm chung
        if (Regex.IsMatch(lower, @"(tìm|mua|cần|muốn|gợi ý|suggest|giới thiệu|cho tôi|search|sản phẩm)"))
            return ChatIntent.SearchProduct;

        return ChatIntent.General;
    }

    // ── Comparison Search: extract product names and search each separately ──
    private async Task<List<ChatProductInfo>> ComparisonSearchAsync(string message)
    {
        var productNames = ExtractProductNamesForComparison(message);
        var allProducts = new List<ChatProductInfo>();

        foreach (var name in productNames)
        {
            var results = await _productService.SmartSearchAsync(name, null, null, 3);
            allProducts.AddRange(results);
        }

        // Deduplicate by Id
        return allProducts
            .GroupBy(p => p.Id)
            .Select(g => g.First())
            .Take(6)
            .ToList();
    }

    // Extract actual product/brand names from comparison queries
    private static List<string> ExtractProductNamesForComparison(string message)
    {
        var lower = message.ToLower();
        var names = new List<string>();

        // Remove comparison stop words
        var comparisonWords = new HashSet<string>
        {
            "so", "sánh", "sanh", "khác", "khac", "gì", "gi", "hay", "hơn",
            "hon", "tốt", "tot", "nên", "nen", "mua", "với", "voi", "và", "va",
            "vs", "versus", "compare", "giữa", "giua", "cho", "tôi", "toi",
            "được", "duoc", "không", "khong", "có", "co", "the", "thế", "nào",
            "nao", "bạn", "ban", "ơi", "oi", "đi", "di", "xem", "thử", "thu",
            "giùm", "gium", "hộ", "ho", "cái", "cai", "chiếc", "chiec",
            "điện", "dien", "thoại", "thoai", "máy", "may"
        };

        // Split by common separators: "và", "vs", "với", "hay", ","
        var parts = Regex.Split(lower, @"\b(?:và|vs|versus|với|hay|hoặc)\b|,")
            .Select(p => p.Trim())
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .ToList();

        foreach (var part in parts)
        {
            var words = part.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(w => !comparisonWords.Contains(w) && w.Length >= 2)
                .ToList();

            if (words.Count > 0)
            {
                var cleaned = string.Join(" ", words);
                if (cleaned.Length >= 2)
                    names.Add(cleaned);
            }
        }

        if (!names.Any())
        {
            var fallback = RemoveStopWords(lower);
            if (!string.IsNullOrWhiteSpace(fallback))
                names.Add(fallback);
        }

        return names.Distinct().ToList();
    }

    // ── Smart Search: extract keywords, brand, category, price from natural language ──
    private async Task<List<ChatProductInfo>> SmartSearchAsync(string message)
    {
        var products = await _productService.SearchProductsAsync(message, 8);

        if (!products.Any())
        {
            var cleaned = RemoveStopWords(message);
            if (cleaned != message && !string.IsNullOrWhiteSpace(cleaned))
            {
                products = await _productService.SearchProductsAsync(cleaned, 8);
            }
        }

        return products;
    }

    private static string RemoveStopWords(string msg)
    {
        var stopWords = new HashSet<string>
        {
            "tôi", "cho", "toi", "muốn", "muon", "cần", "can", "tìm", "tim", "mua",
            "gợi", "goi", "ý", "y", "giới", "gioi", "thiệu", "thieu", "hãy", "hay",
            "bạn", "ban", "có", "co", "không", "khong", "nào", "nao", "gì", "gi",
            "được", "duoc", "xin", "vui", "lòng", "long", "ơi", "oi", "nhé", "nhe",
            "đi", "di", "thử", "thu", "xem", "một", "mot", "vài", "vai", "những",
            "nhung", "các", "cac", "của", "cua", "với", "voi", "và", "va",
            "hoặc", "hoac", "trong", "ngoài", "ngoai", "đang", "dang", "sẽ", "se",
            "đã", "da", "rồi", "roi", "lại", "lai", "nữa", "nua", "thêm", "them"
        };

        var words = msg.ToLower()
            .Split(new[] { ' ', ',', '.', '!', '?', ';', ':' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(w => !stopWords.Contains(w) && w.Length >= 2);

        return string.Join(" ", words);
    }

    // ── Extract price from message ──
    private static decimal ParsePriceUnit(string numberStr, string unit)
    {
        var val = decimal.Parse(numberStr.Replace(",", "."), CultureInfo.InvariantCulture);
        var u = unit.ToLowerInvariant();
        if (u is "k" or "nghìn" or "nghin" or "ngàn" or "ngan" or "lit" or "lít")
            return val * 1_000m;
        return val * 1_000_000m; // triệu, tr, củ, m...
    }

    private static (decimal? Min, decimal? Max) ExtractPriceRange(string message)
    {
        var lower = message.ToLower();
        decimal? min = null, max = null;
        const string units = @"triệu|trieu|tr|m|củ|cu|nghìn|nghin|ngàn|ngan|k|lit|lít";

        // 1. "dưới / nhỏ hơn / < / không quá / tối đa X [đơn vị]"
        var underMatch = Regex.Match(lower, $@"(?:dưới|duoi|nho hon|<|khong qua|toi da)\s+(\d+(?:[.,]\d+)?)\s*({units})\b");
        if (underMatch.Success)
        {
            max = ParsePriceUnit(underMatch.Groups[1].Value, underMatch.Groups[2].Value);
        }

        // 2. "trên / lớn hơn / > / tối thiểu X [đơn vị]"
        var overMatch = Regex.Match(lower, $@"(?:trên|tren|lon hon|>|toi thieu)\s+(\d+(?:[.,]\d+)?)\s*({units})\b");
        if (overMatch.Success)
        {
            min = ParsePriceUnit(overMatch.Groups[1].Value, overMatch.Groups[2].Value);
        }

        // 3. "từ X đến Y [đơn vị]"
        var rangeMatch = Regex.Match(lower, $@"(?:từ|tu|tầm|tam|khoảng|khoang)\s+(\d+(?:[.,]\d+)?)\s*(?:{units})?\s*(?:đến|den|tới|toi|-)\s*(\d+(?:[.,]\d+)?)\s*({units})\b");
        if (rangeMatch.Success)
        {
            var unit = rangeMatch.Groups[3].Value;
            min = ParsePriceUnit(rangeMatch.Groups[1].Value, unit);
            max = ParsePriceUnit(rangeMatch.Groups[2].Value, unit);
        }

        // 4. "tầm / khoảng / tài chính / có / budget X [đơn vị]" (without range → ±25%)
        if (min == null && max == null)
        {
            var aroundMatch = Regex.Match(lower, $@"(?:tầm|tam|khoảng|khoang|tài chính|tai chinh|ngân sách|ngan sach|có|co|budget|giá|gia)\s*(\d+(?:[.,]\d+)?)\s*({units})\b");
            if (aroundMatch.Success)
            {
                var val = ParsePriceUnit(aroundMatch.Groups[1].Value, aroundMatch.Groups[2].Value);
                min = Math.Max(0, val * 0.75m);
                max = val * 1.25m;
            }
        }

        // 5. Bare "X [đơn vị]" nếu không có từ khóa trên
        if (min == null && max == null)
        {
            var bareMatch = Regex.Match(lower, $@"\b(\d+(?:[.,]\d+)?)\s*({units})\b");
            if (bareMatch.Success)
            {
                var val = ParsePriceUnit(bareMatch.Groups[1].Value, bareMatch.Groups[2].Value);
                min = Math.Max(0, val * 0.75m);
                max = val * 1.25m;
            }
        }

        return (min, max);
    }

    // ── Order context for tracking & management ──
    private async Task<string> GetOrderContextAsync(string message, string? userId)
    {
        var lower = message.ToLower();
        var isCancelInquiry = Regex.IsMatch(lower, @"(hủy đơn|huy don|hủy|huy|cancel)");

        // Try to extract order code — support ORD-20260228102553-7014, ORD-12345, etc.
        var codeMatch = Regex.Match(message, @"(ORD[-\s]?[\w-]+)", RegexOptions.IgnoreCase);
        if (!codeMatch.Success)
            codeMatch = Regex.Match(message, @"([A-Z]{2,4}[-\s]?\d[\w-]*)", RegexOptions.IgnoreCase);

        if (codeMatch.Success)
        {
            var orderCode = codeMatch.Value.Trim().ToUpper();

            // Use specialized repository for better lookup
            var order = await _unitOfWork.OrderRepository.GetByCodeAsync(orderCode);

            // Fallback: try contains match if exact match fails
            if (order == null)
            {
                var orders = await _unitOfWork.Orders
                    .FindAsync(o => o.OrderCode.ToUpper().Contains(orderCode) || orderCode.Contains(o.OrderCode.ToUpper()));
                order = orders.FirstOrDefault();
            }

            if (order != null)
            {
                var statusText = order.Status switch
                {
                    0 => "⏳ Chờ xử lý",
                    1 => "✅ Đã xác nhận",
                    2 => "🚚 Đang giao hàng",
                    3 => "📦 Đã giao thành công",
                    4 => "❌ Đã hủy",
                    _ => "Không xác định"
                };

                // Load order details (items) if available
                var orderWithDetails = await _unitOfWork.OrderRepository.GetWithDetailsAsync(order.Id);
                var itemsInfo = "";
                if (orderWithDetails?.OrderDetails?.Any() == true)
                {
                    var itemLines = orderWithDetails.OrderDetails.Select((d, i) =>
                        $"  {i + 1}. {d.ProductName} — SL: {d.Quantity} — Giá: {d.Price:N0}đ — Shop: {d.ShopName ?? "N/A"}"
                    );
                    itemsInfo = $"\n- Sản phẩm đã đặt:\n{string.Join("\n", itemLines)}";
                }

                var cancelNote = "";
                if (isCancelInquiry)
                {
                    cancelNote = order.Status == 0
                        ? "\n\n💡 HƯỚNG DẪN HỦY: Đơn hàng này đang ở trạng thái '⏳ Chờ xử lý'. Khách có thể tự bấm nút 'Hủy đơn hàng' trực tiếp tại trang [Đơn hàng của tôi](/orders)."
                        : $"\n\n⚠️ LƯU Ý HỦY ĐƠN: Đơn hàng hiện đang ở trạng thái '{statusText}', do đó không thể tự hủy trên web. Hãy hướng dẫn khách liên hệ ngay Hotline 1900 xxxx để được hỗ trợ can thiệp.";
                }

                return $@"⚠️ ĐÃ TÌM THẤY ĐƠN HÀNG TRONG HỆ THỐNG — BẮT BUỘC HIỂN THỊ THÔNG TIN NÀY CHO KHÁCH:
- Mã đơn: {order.OrderCode}
- Trạng thái: {statusText}
- Người nhận: {order.Name}
- SĐT: {order.PhoneNumber}
- Địa chỉ: {order.Address}
- Tạm tính: {order.Subtotal:N0}đ
- Phí vận chuyển: {order.ShippingCost:N0}đ
- Giảm giá: {order.DiscountAmount:N0}đ{(string.IsNullOrEmpty(order.CouponCode) ? "" : $" (Mã: {order.CouponCode})")}
- Tổng tiền: {order.Total:N0}đ
- Thanh toán: {order.PaymentMethod} ({order.PaymentStatus})
- Ngày đặt: {order.CreatedAt:dd/MM/yyyy HH:mm}{itemsInfo}{cancelNote}

HÃY TRÌNH BÀY THÔNG TIN NÀY MỘT CÁCH ĐẸP MẮT BẰNG MARKDOWN, KHÔNG ĐƯỢC NÓI 'KHÔNG THỂ TRUY CẬP' HAY 'VÌ LÝ DO BẢO MẬT'.";
            }
        }

        // If no code was provided but user is logged in, lookup recent orders of this user
        if (!string.IsNullOrEmpty(userId))
        {
            var userOrders = (await _unitOfWork.Orders.FindAsync(o => o.UserId == userId))
                .OrderByDescending(o => o.CreatedAt)
                .Take(3)
                .ToList();

            if (userOrders.Any())
            {
                var orderLines = userOrders.Select((o, i) =>
                {
                    var st = o.Status switch
                    {
                        0 => "⏳ Chờ xử lý",
                        1 => "✅ Đã xác nhận",
                        2 => "🚚 Đang giao",
                        3 => "📦 Đã giao thành công",
                        4 => "❌ Đã hủy",
                        _ => "Chưa xác định"
                    };
                    return $"{i + 1}. Mã đơn: `{o.OrderCode}` | Ngày: {o.CreatedAt:dd/MM/yyyy} | Tổng: {o.Total:N0}đ | Trạng thái: {st}";
                });

                return $@"📋 CÁC ĐƠN HÀNG GẦN ĐÂY CỦA BẠN:
{string.Join("\n", orderLines)}

Hãy thông báo danh sách này cho khách hàng và hướng dẫn khách cung cấp mã đơn cụ thể nếu muốn xem chi tiết hoặc thao tác.";
            }
        }

        if (isCancelInquiry)
        {
            return "Khách hàng muốn hủy đơn hàng nhưng chưa cung cấp mã đơn. Hãy hướng dẫn: Nếu đơn đang ở trạng thái 'Chờ xử lý', khách có thể vào mục [Đơn hàng của tôi](/orders) để bấm hủy, hoặc cung cấp mã đơn (ORD-...) để bạn kiểm tra.";
        }

        return "KHÔNG TÌM THẤY ĐƠN HÀNG VỚI MÃ NÀY. Hãy yêu cầu khách cung cấp lại mã đơn hàng chính xác (dạng ORD-...) hoặc truy cập mục [Đơn hàng của tôi](/orders) trên ShopTTS để kiểm tra.";
    }

    // ── Store Policy Context ──
    private static string GetStorePolicyContext(string message)
    {
        return @"📌 THÔNG TIN CHÍNH SÁCH CHUẨN XÁC CỦA SÀN THƯƠNG MẠI ĐIỆN TỬ SHOPTTS:
Bạn BẮT BUỘC phải dựa vào các thông tin chính thức dưới đây để giải đáp, TUYỆT ĐỐI KHÔNG tự bịa số ngày hay mức phí:

1. CHÍNH SÁCH ĐỔI TRẢ (RETURN POLICY):
   - Thời hạn: **30 ngày** kể từ ngày khách nhận hàng thành công.
   - Điều kiện: Đổi mới 1-1 hoặc hoàn tiền miễn phí 100% đối với các sản phẩm có lỗi kỹ thuật từ nhà sản xuất, giao sai mẫu, sai số lượng hoặc hư hỏng do vận chuyển.
   - Yêu cầu: Sản phẩm còn nguyên vẹn, đầy đủ phụ kiện, tem mác, hộp và hóa đơn/chứng từ mua hàng.
   - Phí đổi trả: **Miễn phí 100%** chi phí vận chuyển đổi trả nếu lỗi từ phía ShopTTS hoặc người bán.

2. CHÍNH SÁCH BẢO HÀNH (WARRANTY):
   - Cam kết: 100% sản phẩm là hàng chính hãng mới nguyên seal.
   - Thời gian bảo hành: Từ **12 đến 24 tháng** chính hãng tùy theo từng dòng sản phẩm và quy định của nhà sản xuất (Apple, Samsung, Logitech, Asus, Lenovo, Sony, Keychron, Akko...).
   - Địa điểm bảo hành: Khách hàng có thể mang tới Trung tâm bảo hành ủy quyền của hãng trên toàn quốc hoặc gửi về trung tâm hỗ trợ của ShopTTS.

3. CHÍNH SÁCH VẬN CHUYỂN & GIAO HÀNG (SHIPPING):
   - **MIỄN PHÍ VẬN CHUYỂN (FREESHIP)**: Áp dụng cho tất cả đơn hàng từ **500.000đ** trở lên trên toàn quốc.
   - Phí ship tiêu chuẩn: Đồng giá **30.000đ** cho đơn hàng dưới 500.000đ.
   - Thời gian giao hàng dự kiến:
     + Nội thành Hà Nội & TP. Hồ Chí Minh: 1 - 2 ngày làm việc.
     + Các tỉnh thành khác trên toàn quốc: 2 - 4 ngày làm việc.
     + Vùng sâu vùng xa, hải đảo: 3 - 5 ngày làm việc.
   - Đơn vị vận chuyển đối tác: GHN (Giao Hàng Nhanh), GHTK (Giao Hàng Tiết Kiệm), Viettel Post.

4. PHƯƠNG THỨC THANH TOÁN (PAYMENT METHODS):
   - Thanh toán khi nhận hàng (**COD - Cash on Delivery**): Khách được kiểm tra hàng trước khi thanh toán tiền mặt.
   - Chuyển khoản ngân hàng trực tuyến qua cổng **VNPAY / VietQR / Quét mã QR code** ngân hàng tức thì.
   - Thanh toán trực tuyến qua thẻ tín dụng / ghi nợ quốc tế (**Visa, Mastercard, JCB**).

5. THÔNG TIN LIÊN HỆ & TRỤ SỞ:
   - Hotline hỗ trợ: **1900 xxxx** (Phục vụ từ 8h00 - 21h00 hàng ngày, cả Thứ 7 & CN).
   - Email: **support@shoptts.vn**.
   - Trụ sở văn phòng: Tòa nhà Innovation, Hà Nội.
   - Danh sách các cửa hàng / đại lý: Khách hàng có thể tra cứu toàn bộ tại trang **Hệ thống cửa hàng** (`/shops`).

6. HƯỚNG DẪN HỦY ĐƠN HÀNG:
   - Đơn ở trạng thái '⏳ Chờ xử lý': Khách hàng có thể tự bấm nút **'Hủy đơn'** ngay tại mục **[Đơn hàng của tôi](/orders)**.
   - Đơn đã '✅ Đã xác nhận' hoặc '🚚 Đang giao': Không thể tự hủy trên web; khách hàng cần liên hệ ngay Hotline 1900 xxxx để nhân viên can thiệp chặn giao.";
    }

    // ── Seller / Merchant Context ──
    private static string GetSellerContext()
    {
        return @"📌 HƯỚNG DẪN MỞ GIAN HÀNG & BÁN HÀNG TRÊN SHOPTTS:
1. Đăng ký mở shop:
   - Truy cập trang đăng ký đối tác người bán tại đường dẫn: `/seller/register` (hoặc bấm nút 'Kênh Người Bán' trên đầu trang web).
   - Điền thông tin gian hàng: Tên shop, số điện thoại, email, thông tin định danh (CCCD/Mã số thuế) và tài khoản ngân hàng để nhận thanh toán doanh thu.
2. Quản lý bán hàng:
   - Sau khi đăng ký thành công, truy cập cổng quản lý người bán tại: `/seller`.
   - Đăng tải sản phẩm không giới hạn, quản lý kho hàng, đơn hàng và theo dõi doanh thu trực quan.
3. Chính sách & Quyền lợi:
   - Miễn phí 100% phí tạo gian hàng ban đầu.
   - Tích hợp sẵn hệ thống kết nối đơn vị vận chuyển và thanh toán tự động.
   - Hỗ trợ công cụ tạo voucher khuyến mãi riêng cho từng shop.
   - Hotline hỗ trợ đối tác bán hàng: 1900 xxxx (8h00 - 21h00) | Email: support@shoptts.vn.";
    }

    // ── Shop Directory Context ──
    private async Task<string> GetShopsDirectoryContextAsync()
    {
        try
        {
            var activeShops = await _unitOfWork.Shops.FindAsync(s => !s.IsDeleted);
            var shopList = activeShops.ToList();
            var shopNames = shopList.Select(s => s.Name).Take(8).ToList();
            return $@"📌 HỆ THỐNG CỬA HÀNG (SHOPS) TRÊN SHOPTTS:
- Khách hàng có thể xem toàn bộ hệ thống các gian hàng đối tác uy tín đang hoạt động tại trang **Hệ thống cửa hàng**: `/shops`.
- Hiện tại có {shopList.Count} gian hàng chính thức trên sàn (ví dụ: {string.Join(", ", shopNames)}...).
- Khách hàng có thể xem từng gian hàng chi tiết tại đường dẫn `/shops/[slug]`.
- Trụ sở chính và văn phòng hỗ trợ ShopTTS: Tòa nhà Innovation, Hà Nội. Hotline: 1900 xxxx.";
        }
        catch
        {
            return "📌 HỆ THỐNG CỬA HÀNG: Khách hàng có thể xem danh bạ toàn bộ các shop đang hoạt động tại trang **Hệ thống cửa hàng**: `/shops`.";
        }
    }

    // ── Unsupported Product Context ──
    private static string GetUnsupportedProductContext(string item)
    {
        var name = string.IsNullOrWhiteSpace(item) ? "mặt hàng này" : item;
        return $@"⚠️ MẶT HÀNG SÀN CHƯA KINH DOANH: Khách hàng đang hỏi về '{name}'.
ShopTTS là sàn thương mại điện tử chuyên sâu về **Thiết bị công nghệ, Điện thoại, Laptop, Màn hình, Bàn phím cơ, Chuột máy tính, Phụ kiện, Đồng hồ thông minh, Thiết bị mạng, Gaming và Thời trang**.
Hiện tại ShopTTS CHƯA KINH DOANH các mặt hàng điện lạnh cỡ lớn (tủ lạnh, máy giặt, điều hòa), xe cộ phương tiện, bất động sản, vé máy bay hay sách vở.
BẮT BUỘC:
1. Thông báo chân thành, lịch sự cho khách biết ShopTTS hiện chưa kinh doanh mặt hàng '{name}'.
2. Giới thiệu các ngành hàng công nghệ chủ lực hiện có trên ShopTTS.
3. TUYỆT ĐỐI KHÔNG tự tiện lấy laptop, điện thoại hay sản phẩm khác ra làm sản phẩm tương ứng!";
    }

    // ── Coupon context ──
    private async Task<string> GetCouponContextAsync()
    {
        var now = DateTime.UtcNow;
        var coupons = await _unitOfWork.Coupons
            .FindAsync(c => !c.IsDeleted && c.DateStart <= now && c.DateExpired >= now
                && c.Quantity > c.UsedCount && c.Status == 1);

        var couponList = coupons.ToList();
        if (!couponList.Any())
            return "HIỆN KHÔNG CÓ MÃ GIẢM GIÁ NÀO ĐANG HOẠT ĐỘNG.";

        var lines = couponList.Select(c =>
        {
            var discount = c.IsPercent ? $"{c.DiscountValue}%" : $"{c.DiscountValue:N0}đ";
            return $"- {c.Code}: Giảm {discount} | Đơn tối thiểu: {c.MinimumOrderValue:N0}đ | " +
                   $"Còn {c.Quantity - c.UsedCount} lượt | HSD: {c.DateExpired:dd/MM/yyyy}";
        });

        return $"MÃ GIẢM GIÁ ĐANG HOẠT ĐỘNG ({couponList.Count} mã):\n{string.Join("\n", lines)}";
    }

    // ── Build messages with rich context ──
    private static List<GroqMessage> BuildMessagesWithContext(
        ChatRequest request,
        List<ChatProductInfo> products,
        List<string> categories,
        string extraContext,
        ChatIntent intent)
    {
        var productContext = "";
        if (products.Any())
        {
            var productLines = products.Select((p, i) =>
            {
                var badgeStr = !string.IsNullOrEmpty(p.HighlightBadge) ? $" [{p.HighlightBadge}]" : "";
                var stockStr = p.IsInStock ? "✅ Còn hàng" : "❌ Tạm hết hàng";
                var descStr = !string.IsNullOrEmpty(p.ShortDescription) ? $"\n   - Mô tả tóm tắt: {p.ShortDescription}" : "";
                return $"{i + 1}. [ID: {p.Id}] **{p.Name}**{badgeStr}\n" +
                       $"   - Giá bán: {p.Price:N0}đ | Hãng: {p.BrandName} | Danh mục: {p.CategoryName} | Shop: {p.ShopName ?? "ShopTTS Official"}\n" +
                       $"   - Đánh giá: ⭐ {p.AverageScore:F1}/5 ({p.RatingCount} lượt đánh giá) | Đã bán: {p.SoldOut:N0} sản phẩm | {stockStr}{descStr}";
            });
            productContext = $"\n\n📦 DỮ LIỆU SẢN PHẨM THỰC TẾ TỪ HỆ THỐNG SHOPTTS ({products.Count} sản phẩm có sẵn):\n{string.Join("\n\n", productLines)}";
        }

        var categoryInfo = categories.Any()
            ? $"\n\n🏷️ DANH MỤC SẢN PHẨM ĐANG KINH DOANH ({categories.Count} danh mục): {string.Join(", ", categories)}"
            : "";

        var extra = !string.IsNullOrEmpty(extraContext) ? $"\n\n📋 THÔNG TIN BỔ SUNG:\n{extraContext}" : "";

        var systemPrompt = $@"Bạn là **ShopTTS AI** — Chuyên viên tư vấn mua sắm cao cấp & tận tâm của sàn thương mại điện tử ShopTTS (Việt Nam).

🎯 PHONG CÁCH TƯ VẤN:
- Giọng điệu: Thân thiện, chuyên nghiệp, khách quan, thấu hiểu khách hàng, dùng emoji tinh tế và vừa phải.
- Luôn đặt lợi ích của người mua lên hàng đầu: tư vấn đúng nhu cầu thực tế, không tâng bốc quá đà.
- Phân tích có chiều sâu kỹ thuật nhưng giải thích bằng ngôn ngữ dễ hiểu, thực tế.

📋 NGUYÊN TẮC BẮT BUỘC:
1. TÍNH CHÍNH XÁC TUYỆT ĐỐI VỀ DỮ LIỆU & DANH MỤC:
   - CHỈ tư vấn và phân tích các sản phẩm CÓ THẬT trong danh sách [DỮ LIỆU SẢN PHẨM THỰC TẾ TỪ HỆ THỐNG SHOPTTS] bên dưới. TUYỆT ĐỐI KHÔNG bịa đặt sản phẩm, giá bán hay thông số ngoài danh sách.
   - TUYỆT ĐỐI KHÔNG đưa các sản phẩm KHÔNG LIÊN QUAN đến danh mục khách đang hỏi vào câu trả lời (Ví dụ: khách hỏi 'bàn phím' thì TUYỆT ĐỐI KHÔNG liệt kê máy tính bảng iPad, laptop, áo quần... vào danh sách sản phẩm hay bảng so sánh).
2. TRUNG THỰC VỀ NGÂN SÁCH & TỒN KHO:
   - Nếu trong kho không có sản phẩm nào có giá đúng chính xác dưới mức ngân sách của khách (ví dụ: khách tìm dưới 900k nhưng mẫu rẻ nhất trong kho là 990k), bạn PHẢI THẲNG THẮN VÀ TRUNG THỰC: 'Hiện tại ShopTTS chưa có mẫu [danh mục] nào có giá dưới [ngân sách]đ. Tuy nhiên, mẫu có giá tốt nhất và gần ngân sách nhất của bạn là [Tên sản phẩm] với giá [Giá]đ...'.
   - TUYỆT ĐỐI KHÔNG mâu thuẫn: Không bao giờ được vừa nói 'không có mẫu nào dưới 900k' rồi lại nói 'ShopTTS có nhiều mẫu từ dưới 1 triệu'.
3. ĐỒNG BỘ TUYỆT ĐỐI VỚI GIAO DIỆN: Các sản phẩm trong danh sách bên dưới CHÍNH LÀ các thẻ sản phẩm đang hiển thị trực tiếp trước mắt khách hàng trong khung chat. Bạn PHẢI tập trung phân tích ưu/nhược điểm và gợi ý từ chính các sản phẩm này để khách có thể bấm 'Xem chi tiết' hoặc 'Thêm vào giỏ' ngay lập tức.
4. Định dạng giá tiền: Luôn viết rõ ràng bằng VNĐ có dấu chấm phân cách (ví dụ: **990.000đ**, **15.990.000đ**).
5. KHÔNG đề cập đến sàn thương mại điện tử đối thủ (Shopee, Lazada, Tiki, TikTok Shop). Luôn khẳng định sản phẩm có sẵn tại ShopTTS.
6. Khi người dùng hỏi so sánh (Comparison): Phải so sánh chi tiết các khía cạnh (Giá, Hiệu năng, Màn hình/Thiết kế, Camera, Pin) và kết luận rõ ai nên chọn máy nào.

💡 QUY CHUẨN CẤU TRÚC PHẢN HỒI KHI TƯ VẤN:
1. **Mở đầu thấu cảm**: Tóm tắt lại đúng tiêu chí/ngân sách của khách để tạo sự an tâm.
2. **Đánh giá từng sản phẩm đề xuất**:
   - **Tên sản phẩm** kèm giá in đậm và đánh giá ⭐
   - 🌟 **Ưu điểm nổi bật**: Phân tích điểm mạnh thực tế (chip, màn hình, camera, thời lượng pin, thiết kế).
   - ⚠️ **Lưu ý nhỏ**: Điểm hạn chế hoặc điều cần lưu ý để đảm bảo tính khách quan.
   - 🎯 **Phù hợp nhất cho**: Đối tượng cụ thể (game thủ, học sinh sinh viên, dân văn phòng, chụp ảnh du lịch...).
3. **Lời khuyên chốt hạ (Best Pick)**:
   - Đưa ra nhận định rõ ràng: đâu là 'Lựa chọn toàn diện nhất', đâu là 'Lựa chọn tiết kiệm chi phí nhất'.
4. **Gợi ý câu hỏi thông minh**:
   Cuối phản hồi, BẮT BUỘC thêm 2-3 câu hỏi gợi ý để khách bấm hỏi tiếp:
   [suggest]Gợi ý 1[/suggest]
   [suggest]Gợi ý 2[/suggest]
   [suggest]Gợi ý 3[/suggest]

📦 TRA CỨU ĐƠN HÀNG:
- Khi có dữ liệu đơn hàng trong [THÔNG TIN BỔ SUNG]: BẮT BUỘC hiển thị TOÀN BỘ thông tin (Mã đơn, Người nhận, SĐT, Địa chỉ, Sản phẩm, Tạm tính, Ship, Giảm giá, Tổng tiền, Trạng thái đơn, Thanh toán) bằng Markdown sạch đẹp. TUYỆT ĐỐI KHÔNG nói 'không thể tra cứu' hay 'vì lý do bảo mật'.

Hotline hỗ trợ: 1900-xxxx | Email: support@shoptts.vn | Giờ phục vụ: 8:00 - 22:00
{productContext}{categoryInfo}{extra}";

        var messages = new List<GroqMessage>
        {
            new() { Role = "system", Content = systemPrompt }
        };

        if (request.History?.Count > 0)
        {
            foreach (var msg in request.History.TakeLast(12))
            {
                messages.Add(new GroqMessage { Role = msg.Role, Content = msg.Content });
            }
        }

        messages.Add(new GroqMessage { Role = "user", Content = request.Message });
        return messages;
    }

    // ── Extract [suggest]...[/suggest] from AI response ──
    private static (string cleanReply, string[] suggestions) ExtractSuggestions(string reply)
    {
        var suggestions = new List<string>();
        var clean = Regex.Replace(reply, @"\[suggest\](.*?)\[/suggest\]", match =>
        {
            suggestions.Add(match.Groups[1].Value.Trim());
            return "";
        }, RegexOptions.Singleline);

        // Strip optional structured JSON wrapped in <response_json>...</response_json> without losing markdown reply
        try
        {
            var openTag = "<response_json>";
            var closeTag = "</response_json>";
            var idxOpen = clean.IndexOf(openTag, StringComparison.OrdinalIgnoreCase);
            var idxClose = clean.IndexOf(closeTag, StringComparison.OrdinalIgnoreCase);
            if (idxOpen >= 0)
            {
                string jsonText = "";
                string remainingText = "";
                if (idxClose > idxOpen)
                {
                    jsonText = clean.Substring(idxOpen + openTag.Length, idxClose - (idxOpen + openTag.Length)).Trim();
                    remainingText = (clean.Substring(0, idxOpen) + clean.Substring(idxClose + closeTag.Length)).Trim();
                }
                else
                {
                    jsonText = clean.Substring(idxOpen + openTag.Length).Trim();
                    remainingText = clean.Substring(0, idxOpen).Trim();
                }

                if (!string.IsNullOrWhiteSpace(remainingText))
                {
                    clean = remainingText;
                }

                if (!string.IsNullOrEmpty(jsonText))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(jsonText);
                        var root = doc.RootElement;
                        // Merge suggestions from JSON if any
                        if (root.TryGetProperty("suggestions", out var suggProp) && suggProp.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var s in suggProp.EnumerateArray())
                            {
                                if (s.ValueKind == JsonValueKind.String)
                                {
                                    var v = s.GetString();
                                    if (!string.IsNullOrWhiteSpace(v)) suggestions.Add(v.Trim());
                                }
                            }
                        }
                    }
                    catch { /* ignore parse errors */ }
                }
            }
        }
        catch { /* ignore */ }

        // Strip leftover json code blocks if model outputted them at the end
        clean = Regex.Replace(clean, @"```(?:json)?\s*\{\s*""(?:reply|suggestions|actions)""[\s\S]*?\}\s*```", "", RegexOptions.IgnoreCase).Trim();

        // Safety check: if clean accidentally got wiped out or reduced to almost nothing compared to original, revert
        if (clean.Length < 50 && reply.Length >= 150)
        {
            clean = Regex.Replace(reply, @"<response_json>[\s\S]*?</response_json>", "", RegexOptions.IgnoreCase).Trim();
        }

        return (clean.TrimEnd(), suggestions.Distinct().ToArray());
    }

    // ── GROQ API call (with fallback models on error or rate limit) ──
    private async Task<(GroqResponse? Response, string? ErrorCode)> CallGroqAsync(
        string apiKey, List<GroqMessage> messages, string? overrideModel = null)
    {
        var modelsToTry = GetModelsToTry(overrideModel);

        string? lastErrorCode = null;
        string? lastErrorBody = null;

        foreach (var model in modelsToTry)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Clear();
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
                client.Timeout = TimeSpan.FromSeconds(45);

                var requestBody = new Dictionary<string, object>
                {
                    ["model"] = model,
                    ["messages"] = messages,
                    ["temperature"] = 0.7,
                    ["max_tokens"] = 4096,
                    ["stream"] = false
                };

                var json = JsonSerializer.Serialize(requestBody, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
                });

                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await client.PostAsync(GROQ_API_URL, content);
                var body = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    var result = JsonSerializer.Deserialize<GroqResponse>(body, new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });

                    if (model != modelsToTry.First())
                        _logger.LogInformation("GROQ: Used fallback model {Model}", model);

                    return (result, null);
                }

                // Parse error code
                lastErrorBody = body;
                try
                {
                    using var errDoc = JsonDocument.Parse(body);
                    lastErrorCode = errDoc.RootElement.GetProperty("error").GetProperty("code").GetString();
                }
                catch { lastErrorCode = null; }

                _logger.LogWarning("GROQ failed on model {Model}: {Status} - {Body}. Trying next fallback...",
                    model, response.StatusCode, body);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "GROQ exception on model {Model}. Trying next fallback...", model);
            }
        }

        // All models exhausted
        _logger.LogError("GROQ API: All models failed. Last error: {Body}", lastErrorBody);
        return (null, lastErrorCode ?? "all_models_failed");
    }

    // ── SSE helper ── (multiline-safe: each line gets its own "data: " prefix per SSE spec)
    private async Task WriteSSE(string eventType, string data)
    {
        var sb = new StringBuilder();
        sb.Append($"event: {eventType}\n");
        // SSE spec: multiline data must have "data: " prefix per line
        foreach (var line in data.Split('\n'))
        {
            sb.Append($"data: {line}\n");
        }
        sb.Append('\n'); // blank line = end of event
        await Response.WriteAsync(sb.ToString());
        await Response.Body.FlushAsync();
    }

    // ── Map product DTO ──
    private static object MapProductResponse(ChatProductInfo p) => new
    {
        p.Id,
        p.Name,
        p.Slug,
        p.Price,
        p.Image,
        p.BrandName,
        p.CategoryName,
        p.ShopName,
        p.AverageScore,
        p.RatingCount,
        p.SoldOut,
        p.IsInStock,
        p.ShortDescription,
        p.HighlightBadge
    };
}

// ══════════════════════════════════════════
//  Enums & Models
// ══════════════════════════════════════════

public enum ChatIntent
{
    General,
    Greeting,
    StorePolicy,
    SearchProduct,
    PriceRange,
    Trending,
    OrderTracking,
    CouponInquiry,
    CategoryBrowse,
    Comparison,
    Recommendation,
    SellerInquiry,
    ShopDirectory,
    UnsupportedProduct
}

public class ChatRequest
{
    public string Message { get; set; } = string.Empty;
    public List<ChatHistoryItem>? History { get; set; }
    public string? SessionId { get; set; }
}

public class ChatHistoryItem
{
    public string Role { get; set; } = "user";
    public string Content { get; set; } = string.Empty;
}

public class GroqMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty;

    [JsonPropertyName("content")]
    public string? Content { get; set; }
}

public class GroqResponse
{
    public string? Id { get; set; }
    public string? Model { get; set; }
    public List<GroqChoice>? Choices { get; set; }
    public GroqUsage? Usage { get; set; }
}

public class GroqChoice
{
    public GroqMessageContent? Message { get; set; }

    [JsonPropertyName("finish_reason")]
    public string? FinishReason { get; set; }
}

public class GroqMessageContent
{
    public string? Role { get; set; }
    public string? Content { get; set; }
}

public class GroqUsage
{
    [JsonPropertyName("prompt_tokens")]
    public int PromptTokens { get; set; }

    [JsonPropertyName("completion_tokens")]
    public int CompletionTokens { get; set; }

    [JsonPropertyName("total_tokens")]
    public int TotalTokens { get; set; }
}

public class IndexDocumentRequest
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Source { get; set; }
    public int? SourceId { get; set; }
}
