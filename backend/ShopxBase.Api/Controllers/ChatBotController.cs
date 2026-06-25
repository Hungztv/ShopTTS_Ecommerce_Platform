using Microsoft.AspNetCore.Mvc;
using ShopxBase.Domain.Interfaces;
using ShopxBase.Infrastructure.Services;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

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
    private const string MODEL = "llama-3.3-70b-versatile";

    // Fallback models when primary model hits rate limit
    private static readonly string[] FALLBACK_MODELS = new[]
    {
        "llama-3.1-8b-instant",
        "gemma2-9b-it",
        "mixtral-8x7b-32768"
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
            // ── Intent detection + smart search ──
            var intent = DetectIntent(request.Message);
            var products = new List<ChatProductInfo>();
            var extraContext = "";

            switch (intent)
            {
                case ChatIntent.SearchProduct:
                    products = await SmartSearchAsync(request.Message);
                    break;

                case ChatIntent.PriceRange:
                    var (min, max) = ExtractPriceRange(request.Message);
                    products = await _productService.GetProductsByPriceRangeAsync(min, max, null, 8);
                    if (!products.Any())
                        products = await SmartSearchAsync(request.Message);
                    break;

                case ChatIntent.Trending:
                    products = await _productService.GetTrendingProductsAsync(null, 8);
                    break;

                case ChatIntent.OrderTracking:
                    extraContext = await GetOrderContextAsync(request.Message);
                    break;

                case ChatIntent.CouponInquiry:
                    extraContext = await GetCouponContextAsync();
                    break;

                case ChatIntent.CategoryBrowse:
                    var cats = await _productService.GetAvailableCategoriesAsync();
                    extraContext = $"DANH MỤC SẢN PHẨM CÓ SẴN ({cats.Count} danh mục): {string.Join(", ", cats)}";
                    break;

                case ChatIntent.Comparison:
                    products = await ComparisonSearchAsync(request.Message);
                    extraContext = "Khách hàng muốn SO SÁNH sản phẩm. Hãy so sánh chi tiết CÁC SẢN PHẨM CÓ TRONG DỮ LIỆU (giá, thông số, ưu nhược điểm). CHỈ so sánh sản phẩm có trong dữ liệu.";
                    break;

                case ChatIntent.Recommendation:
                    var recUserId = GetUserId();
                    var recProducts = await _behaviorService.GetPersonalizedRecommendationsAsync(recUserId, request.SessionId, 8);
                    if (recProducts.Any())
                    {
                        products = recProducts;
                        extraContext = "🎯 ĐÂY LÀ SẢN PHẨM ĐƯỢC CÁ NHÂN HÓA dựa trên lịch sử duyệt web, tìm kiếm và mua hàng của khách. " +
                                      "Hãy giới thiệu chúng một cách TỰ NHIÊN, giải thích TẠI SAO phù hợp với khách (ví dụ: 'Dựa trên sở thích của bạn về thương hiệu X...')";
                    }
                    else
                    {
                        products = await _productService.GetTrendingProductsAsync(null, 8);
                        extraContext = "Chưa có đủ dữ liệu cá nhân hóa, đây là sản phẩm phổ biến nhất.";
                    }
                    break;

                case ChatIntent.General:
                default:
                    // Don't search products for general/greeting messages
                    break;
            }

            // ── Inject user behavior context for all intents ──
            try
            {
                var userId = GetUserId();
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
            var ragContext = await GetRagContextAsync(request.Message);
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
                    model = response.Model ?? MODEL,
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
            // ── Pre-search products ──
            var intent = DetectIntent(request.Message);
            var products = new List<ChatProductInfo>();
            var extraContext = "";

            switch (intent)
            {
                case ChatIntent.SearchProduct:
                    products = await SmartSearchAsync(request.Message);
                    break;
                case ChatIntent.PriceRange:
                    var (min, max) = ExtractPriceRange(request.Message);
                    products = await _productService.GetProductsByPriceRangeAsync(min, max, null, 8);
                    if (!products.Any()) products = await SmartSearchAsync(request.Message);
                    break;
                case ChatIntent.Trending:
                    products = await _productService.GetTrendingProductsAsync(null, 8);
                    break;
                case ChatIntent.OrderTracking:
                    extraContext = await GetOrderContextAsync(request.Message);
                    break;
                case ChatIntent.CouponInquiry:
                    extraContext = await GetCouponContextAsync();
                    break;
                case ChatIntent.CategoryBrowse:
                    var cats = await _productService.GetAvailableCategoriesAsync();
                    extraContext = $"DANH MỤC: {string.Join(", ", cats)}";
                    break;
                case ChatIntent.Comparison:
                    products = await ComparisonSearchAsync(request.Message);
                    extraContext = "Khách muốn SO SÁNH sản phẩm. CHỈ so sánh sản phẩm có trong dữ liệu.";
                    break;
                case ChatIntent.Recommendation:
                    var sRecUserId = GetUserId();
                    var sRecProducts = await _behaviorService.GetPersonalizedRecommendationsAsync(sRecUserId, request.SessionId, 8);
                    if (sRecProducts.Any())
                    {
                        products = sRecProducts;
                        extraContext = "🎯 ĐÂY LÀ SẢN PHẨM ĐƯỢC CÁ NHÂN HÓA dựa trên lịch sử duyệt web, tìm kiếm và mua hàng của khách. " +
                                      "Hãy giới thiệu chúng một cách TỰ NHIÊN, giải thích TẠI SAO phù hợp với khách.";
                    }
                    else
                    {
                        products = await _productService.GetTrendingProductsAsync(null, 8);
                        extraContext = "Chưa có đủ dữ liệu cá nhân hóa, đây là sản phẩm phổ biến nhất.";
                    }
                    break;
                case ChatIntent.General:
                default:
                    // Don't search products for general/greeting messages
                    break;
            }

            // ── Inject user behavior context for all intents ──
            try
            {
                var sUserId = GetUserId();
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
            var ragContext = await GetRagContextAsync(request.Message);
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

            // Try primary model first, fallback on rate limit
            var modelsToTry = new List<string> { MODEL };
            modelsToTry.AddRange(FALLBACK_MODELS);

            HttpResponseMessage? httpResponse = null;
            string? usedModel = null;

            foreach (var model in modelsToTry)
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
                    if (model != MODEL)
                        _logger.LogInformation("GROQ stream: Using fallback model {Model}", model);
                    break;
                }

                // On rate limit (429), try next model
                if (httpResponse.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
                {
                    _logger.LogWarning("GROQ stream rate limited on {Model}, trying fallback...", model);
                    httpResponse.Dispose();
                    httpResponse = null;
                    continue;
                }

                // Other errors — stop and report
                var errBody = await httpResponse.Content.ReadAsStringAsync();
                _logger.LogError("GROQ streaming error: {Status} - {Body}", httpResponse.StatusCode, errBody);
                await WriteSSE("error", JsonSerializer.Serialize(new { message = "AI đang gặp sự cố" }));
                httpResponse.Dispose();
                return;
            }

            if (httpResponse == null || !httpResponse.IsSuccessStatusCode)
            {
                await WriteSSE("error", JsonSerializer.Serialize(new { message = "AI đang quá tải, vui lòng thử lại sau 1-2 phút" }));
                return;
            }

            using var stream = await httpResponse.Content.ReadAsStreamAsync();
            using var reader = new StreamReader(stream);

            var fullContent = new StringBuilder();

            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                if (string.IsNullOrEmpty(line)) continue;
                if (!line.StartsWith("data: ")) continue;

                var data = line["data: ".Length..];
                if (data == "[DONE]") break;

                try
                {
                    using var doc = JsonDocument.Parse(data);
                    var delta = doc.RootElement
                        .GetProperty("choices")[0]
                        .GetProperty("delta");

                    if (delta.TryGetProperty("content", out var contentProp))
                    {
                        var chunk = contentProp.GetString();
                        if (!string.IsNullOrEmpty(chunk))
                        {
                            fullContent.Append(chunk);
                            await WriteSSE("token", chunk);
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
    private async Task<string> GetRagContextAsync(string userMessage)
    {
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
            var results = await _vectorSearchService.SearchAsync(queryEmbedding, topK: 3, threshold: 0.4);

            if (!results.Any())
            {
                _logger.LogInformation("RAG: No relevant documents found for query");
                return "";
            }

            // 3️⃣ Format results as context for the LLM
            var contextLines = results.Select((r, i) =>
                $"[Tài liệu {i + 1}] (Độ liên quan: {r.Similarity:P0})\n" +
                $"Nguồn: {r.Source ?? "N/A"} | {r.Title}\n" +
                $"{r.Content}"
            );

            _logger.LogInformation("RAG: Found {Count} relevant documents (best similarity: {Sim:P0})",
                results.Count, results.First().Similarity);

            return $"📚 KIẾN THỨC TỪ CƠ SỞ DỮ LIỆU (RAG):\n{string.Join("\n\n", contextLines)}";
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

    private string? GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
    }

    // ── Intent Detection ──
    private static ChatIntent DetectIntent(string message)
    {
        var lower = message.ToLower().Trim();

        // Order tracking
        if (Regex.IsMatch(lower, @"(đơn hàng|order|tracking|theo dõi|đã đặt|tình trạng đơn|mã đơn|tra cứu đơn|kiểm tra đơn|don hang)"))
            return ChatIntent.OrderTracking;

        // Coupon
        if (Regex.IsMatch(lower, @"(mã giảm|coupon|voucher|khuyến mãi|giảm giá|mã code|discount|ưu đãi)"))
            return ChatIntent.CouponInquiry;

        // Price range
        if (Regex.IsMatch(lower, @"(tầm giá|khoảng giá|dưới \d|trên \d|từ \d.*đến|budget|ngân sách|giá từ|rẻ nhất|đắt nhất|bao nhiêu tiền|triệu|tầm \d)"))
            return ChatIntent.PriceRange;

        // Trending
        if (Regex.IsMatch(lower, @"(bán chạy|trending|phổ biến|hot|best seller|nhiều người mua|nổi bật|xu hướng|được yêu thích)"))
            return ChatIntent.Trending;

        // Category browse
        if (Regex.IsMatch(lower, @"(danh mục|loại sản phẩm|có những gì|bán gì|categories|chủng loại|phân loại)"))
            return ChatIntent.CategoryBrowse;

        // Comparison
        if (Regex.IsMatch(lower, @"(so sánh|khác gì|hay hơn|tốt hơn|nên mua|compare|vs|versus)"))
            return ChatIntent.Comparison;

        // Personalized recommendation
        if (Regex.IsMatch(lower, @"(gợi ý cho tôi|đề xuất|phù hợp với tôi|recommend for me|cá nhân|personalize|dành cho tôi|suggest for me|tư vấn cho tôi|hợp với tôi)"))
            return ChatIntent.Recommendation;

        // Product search (default for most queries)
        if (Regex.IsMatch(lower, @"(tìm|mua|cần|muốn|gợi ý|recommend|suggest|giới thiệu|cho tôi|search|sản phẩm|phone|laptop|tai nghe|điện thoại|máy tính|giày|quần|áo)"))
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
            var results = await _productService.SearchProductsAsync(name, 3);
            allProducts.AddRange(results);
        }

        // Deduplicate by Id
        return allProducts
            .GroupBy(p => p.Id)
            .Select(g => g.First())
            .Take(8)
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
            // Clean each part by removing comparison stop words
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

        // Fallback: if nothing extracted, try the whole message cleaned
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

        // If no results, try to extract brand/category-specific keywords
        if (!products.Any())
        {
            var cleaned = RemoveStopWords(message);
            if (cleaned != message && !string.IsNullOrWhiteSpace(cleaned))
            {
                products = await _productService.SearchProductsAsync(cleaned, 8);
            }
        }

        // Don't fall back to trending — only return actual search results
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
    private static (decimal? min, decimal? max) ExtractPriceRange(string message)
    {
        var lower = message.ToLower();
        decimal? min = null, max = null;

        // "dưới X triệu" / "under X triệu"
        var underMatch = Regex.Match(lower, @"dưới\s+(\d+(?:[.,]\d+)?)\s*(triệu|tr|m)");
        if (underMatch.Success)
        {
            max = decimal.Parse(underMatch.Groups[1].Value.Replace(",", "."),
                System.Globalization.CultureInfo.InvariantCulture) * 1_000_000;
        }

        // "trên X triệu"
        var overMatch = Regex.Match(lower, @"trên\s+(\d+(?:[.,]\d+)?)\s*(triệu|tr|m)");
        if (overMatch.Success)
        {
            min = decimal.Parse(overMatch.Groups[1].Value.Replace(",", "."),
                System.Globalization.CultureInfo.InvariantCulture) * 1_000_000;
        }

        // "từ X đến Y triệu" / "tầm X đến Y triệu"
        var rangeMatch = Regex.Match(lower, @"(?:từ|tầm)\s+(\d+(?:[.,]\d+)?)\s*(?:đến|tới|-)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr|m)");
        if (rangeMatch.Success)
        {
            min = decimal.Parse(rangeMatch.Groups[1].Value.Replace(",", "."),
                System.Globalization.CultureInfo.InvariantCulture) * 1_000_000;
            max = decimal.Parse(rangeMatch.Groups[2].Value.Replace(",", "."),
                System.Globalization.CultureInfo.InvariantCulture) * 1_000_000;
        }

        // "tầm X triệu" (without range → ±30%)
        var aroundMatch = Regex.Match(lower, @"tầm\s+(\d+(?:[.,]\d+)?)\s*(triệu|tr|m)");
        if (aroundMatch.Success && !rangeMatch.Success)
        {
            var val = decimal.Parse(aroundMatch.Groups[1].Value.Replace(",", "."),
                System.Globalization.CultureInfo.InvariantCulture) * 1_000_000;
            min = val * 0.7m;
            max = val * 1.3m;
        }

        // Also try "X nghìn" / "X k"
        if (min == null && max == null)
        {
            var nghìnMatch = Regex.Match(lower, @"(\d+(?:[.,]\d+)?)\s*(nghìn|nghin|k)\b");
            if (nghìnMatch.Success)
            {
                var val = decimal.Parse(nghìnMatch.Groups[1].Value.Replace(",", "."),
                    System.Globalization.CultureInfo.InvariantCulture) * 1_000;
                min = val * 0.7m;
                max = val * 1.3m;
            }
        }

        return (min, max);
    }

    // ── Order context for tracking ──
    private async Task<string> GetOrderContextAsync(string message)
    {
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
- Ngày đặt: {order.CreatedAt:dd/MM/yyyy HH:mm}{itemsInfo}

HÃY TRÌNH BÀY THÔNG TIN NÀY MỘT CÁCH ĐẸP MẮT BẰNG MARKDOWN, KHÔNG ĐƯỢC NÓI 'KHÔNG THỂ TRUY CẬP' HAY 'VÌ LÝ DO BẢO MẬT'.";
            }
        }

        return "KHÔNG TÌM THẤY ĐƠN HÀNG VỚI MÃ NÀY. Hãy yêu cầu khách cung cấp lại mã đơn hàng chính xác. Mã đơn thường có dạng ORD-YYYYMMDDHHMMSS-XXXX.";
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
                $"{i + 1}. **{p.Name}** — Giá: {p.Price:N0}đ | Brand: {p.BrandName} | " +
                $"Danh mục: {p.CategoryName} | ⭐ {p.AverageScore:F1}/5 ({p.RatingCount} lượt) | " +
                $"Đã bán: {p.SoldOut} | {(p.IsInStock ? "✅ Còn hàng" : "❌ Hết hàng")} | " +
                $"Mô tả: {p.ShortDescription ?? "N/A"}"
            );
            productContext = $"\n\n📦 DỮ LIỆU SẢN PHẨM TỪ DATABASE ({products.Count} sản phẩm):\n{string.Join("\n", productLines)}";
        }

        var categoryInfo = categories.Any()
            ? $"\n\n🏷️ DANH MỤC CÓ SẴN ({categories.Count}): {string.Join(", ", categories)}"
            : "";

        var extra = !string.IsNullOrEmpty(extraContext) ? $"\n\n📋 THÔNG TIN BỔ SUNG:\n{extraContext}" : "";

        var systemPrompt = $@"Bạn là **ShopTTS AI** — trợ lý mua sắm thông minh cho nền tảng thương mại điện tử ShopTTS (Việt Nam).

🎯 NHIỆM VỤ CHÍNH:
- Tư vấn & giới thiệu sản phẩm từ dữ liệu thực (bên dưới)
- So sánh sản phẩm chi tiết khi được yêu cầu
- Hỗ trợ tra cứu đơn hàng, mã giảm giá
- Tư vấn lựa chọn sản phẩm phù hợp nhu cầu & ngân sách

📝 QUY TẮC BẮT BUỘC:
1. CHỈ giới thiệu sản phẩm có trong DỮ LIỆU bên dưới. TUYỆT ĐỐI KHÔNG bịa đặt.
2. Nếu KHÔNG có dữ liệu sản phẩm bên dưới → KHÔNG đề cập đến bất kỳ sản phẩm cụ thể nào. Chỉ trả lời câu hỏi và hướng dẫn khách.
3. Sử dụng Markdown: **bold** tên SP, bullet points, tiêu đề nhỏ khi cần.
4. Giá VNĐ dùng dấu chấm: 15.990.000đ
5. Trả lời tiếng Việt, thân thiện, chuyên nghiệp, dùng emoji phù hợp.
6. Khi có sản phẩm → giới thiệu rõ: tên, giá, brand, đánh giá, ưu điểm.
7. Khi so sánh → tạo bảng hoặc list so sánh chi tiết.
8. Không trả lời ngoài chủ đề mua sắm → nhẹ nhàng chuyển hướng.
9. LUÔN TRẢ LỜI ĐẦY ĐỦ, CHI TIẾT. Không bao giờ cắt ngắn câu trả lời giữa chừng.
10. Khi liệt kê các bước → VIẾT ĐẦY ĐỦ NỘI DUNG từng bước, không chỉ liệt kê tiêu đề.

🤖 CÁ NHÂN HÓA:
- Nếu có phần HÀNH VI NGƯỜI DÙNG trong THÔNG TIN BỔ SUNG, hãy sử dụng thông tin đó để tư vấn phù hợp hơn.
- Ưu tiên giới thiệu sản phẩm thuộc danh mục/thương hiệu mà khách đã quan tâm.
- Khi gợi ý cá nhân hóa, giải thích lý do một cách tự nhiên: 'Vì bạn thường xem sản phẩm X...', 'Dựa trên sở thích của bạn...'
- KHÔNG bao giờ nói rằng bạn đang 'theo dõi' hay 'giám sát' hành vi khách hàng.

🔍 TRA CỨU ĐƠN HÀNG — QUY TẮC ĐẶC BIỆT:
- Nếu phần THÔNG TIN BỔ SUNG có chứa 'ĐÃ TÌM THẤY ĐƠN HÀNG' → BẮT BUỘC hiển thị TOÀN BỘ thông tin đơn hàng cho khách.
- TUYỆT ĐỐI KHÔNG nói 'không thể truy cập', 'vì lý do bảo mật', hay 'liên hệ bộ phận hỗ trợ' khi đã có dữ liệu đơn hàng.
- Trình bày thông tin đơn hàng sạch đẹp bằng Markdown với emoji.
- Nếu KHÔNG tìm thấy đơn hàng → hướng dẫn khách kiểm tra lại mã đơn.

💡 CUỐI MỖI CÂU TRẢ LỜI, thêm 2-3 gợi ý câu hỏi tiếp theo dạng:
[suggest]Gợi ý 1[/suggest]
[suggest]Gợi ý 2[/suggest]
[suggest]Gợi ý 3[/suggest]

🧾 OPTIONAL STRUCTURED OUTPUT (nếu có thể):
- Bạn có thể đính kèm một khối JSON cuối phản hồi, bao bọc trong thẻ <response_json> ... </response_json>.
- Ví dụ schema (không bắt buộc, nhưng nếu có hãy tuân theo):
```
<response_json>
{{
    ""reply"": ""(nội dung trả lời, Markdown)"",
    ""suggestions"": [""Gợi ý 1"", ""Gợi ý 2""],
    ""actions"": [{{ ""type"": ""view"", ""productId"": 123 }}, {{ ""type"": ""add_to_cart"", ""productId"": 456 }}],
    ""citations"": [{{ ""source"": ""FAQ"", ""title"": ""Chính sách đổi trả"", ""url"": ""https://..."" }}]
}}
</response_json>
```
- Nếu JSON được cung cấp, server sẽ ưu tiên trường `reply` làm nội dung clean và sẽ đọc `suggestions`/`actions` để hiển thị nút hoặc thẻ sản phẩm.

📞 HOTLINE: 1900-xxxx | 📧 support@shoptts.vn | ⏰ 8:00-22:00
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

        // Try to extract optional structured JSON wrapped in <response_json>...</response_json>
        try
        {
            var openTag = "<response_json>";
            var closeTag = "</response_json>";
            var idxOpen = clean.IndexOf(openTag, StringComparison.OrdinalIgnoreCase);
            var idxClose = clean.IndexOf(closeTag, StringComparison.OrdinalIgnoreCase);
            if (idxOpen >= 0 && idxClose > idxOpen)
            {
                var jsonText = clean.Substring(idxOpen + openTag.Length, idxClose - (idxOpen + openTag.Length)).Trim();
                // Remove the JSON block from clean reply
                clean = (clean.Substring(0, idxOpen) + clean.Substring(idxClose + closeTag.Length)).Trim();

                if (!string.IsNullOrEmpty(jsonText))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(jsonText);
                        var root = doc.RootElement;
                        // If JSON contains 'reply', prefer it as clean reply
                        if (root.TryGetProperty("reply", out var replyProp) && replyProp.ValueKind == JsonValueKind.String)
                        {
                            clean = replyProp.GetString() ?? clean;
                        }
                        // Merge suggestions from JSON
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

        return (clean.TrimEnd(), suggestions.Distinct().ToArray());
    }

    // ── GROQ API call (with fallback models on rate limit) ──
    private async Task<(GroqResponse? Response, string? ErrorCode)> CallGroqAsync(
        string apiKey, List<GroqMessage> messages, string? overrideModel = null)
    {
        var modelsToTry = new List<string>();
        if (!string.IsNullOrEmpty(overrideModel))
            modelsToTry.Add(overrideModel);
        else
        {
            modelsToTry.Add(MODEL);
            modelsToTry.AddRange(FALLBACK_MODELS);
        }

        string? lastErrorCode = null;
        string? lastErrorBody = null;

        foreach (var model in modelsToTry)
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

                if (model != MODEL)
                    _logger.LogInformation("GROQ: Used fallback model {Model} (primary was rate-limited)", model);

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

            // Only retry with fallback on rate limit (429)
            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                _logger.LogWarning("GROQ rate limited on model {Model}, trying next fallback...", model);
                continue;
            }

            // For other errors, don't try fallback
            _logger.LogError("GROQ API error: {Status} - {Body}", response.StatusCode, body);
            return (null, lastErrorCode);
        }

        // All models exhausted
        _logger.LogError("GROQ API: All models rate-limited. Last error: {Body}", lastErrorBody);
        return (null, lastErrorCode ?? "rate_limit_exceeded");
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
        p.IsInStock
    };
}

// ══════════════════════════════════════════
//  Enums & Models
// ══════════════════════════════════════════

public enum ChatIntent
{
    General,
    SearchProduct,
    PriceRange,
    Trending,
    OrderTracking,
    CouponInquiry,
    CategoryBrowse,
    Comparison,
    Recommendation
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
