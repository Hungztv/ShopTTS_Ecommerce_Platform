using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ShopxBase.Domain.Entities;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Infrastructure.Services;

// ═══════════════════════════════════════════════════════════
//  Interface
// ═══════════════════════════════════════════════════════════

public interface IUserBehaviorService
{
    /// <summary>Track a user behavior event</summary>
    Task TrackAsync(TrackBehaviorRequest request);

    /// <summary>Track multiple events at once (batch)</summary>
    Task TrackBatchAsync(IEnumerable<TrackBehaviorRequest> requests);

    /// <summary>Get personalized product recommendations based on user behavior</summary>
    Task<List<ChatProductInfo>> GetPersonalizedRecommendationsAsync(string? userId, string? sessionId, int maxResults = 8);

    /// <summary>Get "frequently bought together" products</summary>
    Task<List<ChatProductInfo>> GetFrequentlyBoughtTogetherAsync(int productId, int maxResults = 5);

    /// <summary>Get "users who viewed this also viewed" products</summary>
    Task<List<ChatProductInfo>> GetAlsoViewedAsync(int productId, int maxResults = 5);

    /// <summary>Get user's recently viewed products</summary>
    Task<List<ChatProductInfo>> GetRecentlyViewedAsync(string? userId, string? sessionId, int maxResults = 8);

    /// <summary>Build a recommendation context string for the chatbot system prompt</summary>
    Task<string> GetRecommendationContextAsync(string? userId, string? sessionId);

    /// <summary>Get dynamic home feed with personalized weights for all sections</summary>
    Task<PersonalizedHomeFeedResult> GetHomeFeedAsync(string? userId, string? sessionId, int limit = 8);
}

public class PersonalizedHomeFeedResult
{
    public List<ChatProductInfo> RecommendedForYou { get; set; } = new();
    public List<ChatProductInfo> FlashSale { get; set; } = new();
    public List<ChatProductInfo> NewArrivals { get; set; } = new();
    public List<ChatProductInfo> Trending { get; set; } = new();
    public List<ChatProductInfo> RecentlyViewed { get; set; } = new();
    public List<string> PreferredCategories { get; set; } = new();
    public bool HasPersonalizedData { get; set; }
}

// ═══════════════════════════════════════════════════════════
//  DTOs
// ═══════════════════════════════════════════════════════════

public class TrackBehaviorRequest
{
    public string? UserId { get; set; }
    public string? SessionId { get; set; }
    public BehaviorType BehaviorType { get; set; }
    public int? ProductId { get; set; }
    public string? SearchQuery { get; set; }
    public int? RatingScore { get; set; }
    public int? DwellTimeSeconds { get; set; }
    public string? SourcePage { get; set; }
}

// ═══════════════════════════════════════════════════════════
//  Implementation
// ═══════════════════════════════════════════════════════════

public class UserBehaviorService : IUserBehaviorService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UserBehaviorService> _logger;

    // Weights for behavior scoring (higher = more signal)
    private static readonly Dictionary<BehaviorType, double> BehaviorWeights = new()
    {
        [BehaviorType.Purchase] = 5.0,
        [BehaviorType.Rating] = 4.0,
        [BehaviorType.AddToCart] = 3.0,
        [BehaviorType.Wishlist] = 2.5,
        [BehaviorType.Compare] = 2.0,
        [BehaviorType.View] = 1.0,
        [BehaviorType.Search] = 0.5,
    };

    public UserBehaviorService(IUnitOfWork unitOfWork, ILogger<UserBehaviorService> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    // ── Track a single behavior event ──
    public async Task TrackAsync(TrackBehaviorRequest request)
    {
        try
        {
            // Resolve category/brand from product
            int? categoryId = null, brandId = null;
            if (request.ProductId.HasValue)
            {
                var product = await _unitOfWork.Products.GetByIdAsync(request.ProductId.Value);
                if (product != null)
                {
                    categoryId = product.CategoryId;
                    brandId = product.BrandId;
                }
            }

            var behavior = new UserBehavior
            {
                UserId = request.UserId,
                SessionId = request.SessionId,
                BehaviorType = request.BehaviorType,
                ProductId = request.ProductId,
                CategoryId = categoryId,
                BrandId = brandId,
                SearchQuery = request.SearchQuery?.Trim(),
                RatingScore = request.RatingScore,
                DwellTimeSeconds = request.DwellTimeSeconds,
                SourcePage = request.SourcePage,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.UserBehaviors.AddAsync(behavior);
            await _unitOfWork.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track behavior: {Type} for user {UserId}",
                request.BehaviorType, request.UserId ?? request.SessionId);
        }
    }

    // ── Track batch ──
    public async Task TrackBatchAsync(IEnumerable<TrackBehaviorRequest> requests)
    {
        try
        {
            var behaviors = new List<UserBehavior>();
            foreach (var req in requests)
            {
                int? categoryId = null, brandId = null;
                if (req.ProductId.HasValue)
                {
                    var product = await _unitOfWork.Products.GetByIdAsync(req.ProductId.Value);
                    if (product != null)
                    {
                        categoryId = product.CategoryId;
                        brandId = product.BrandId;
                    }
                }

                behaviors.Add(new UserBehavior
                {
                    UserId = req.UserId,
                    SessionId = req.SessionId,
                    BehaviorType = req.BehaviorType,
                    ProductId = req.ProductId,
                    CategoryId = categoryId,
                    BrandId = brandId,
                    SearchQuery = req.SearchQuery?.Trim(),
                    RatingScore = req.RatingScore,
                    DwellTimeSeconds = req.DwellTimeSeconds,
                    SourcePage = req.SourcePage,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _unitOfWork.UserBehaviors.AddRangeAsync(behaviors);
            await _unitOfWork.SaveChangesAsync();

            _logger.LogInformation("Tracked {Count} behavior events", behaviors.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track batch behaviors");
        }
    }

    // ══════════════════════════════════════════
    //  Personalized Recommendations
    // ══════════════════════════════════════════

    public async Task<List<ChatProductInfo>> GetPersonalizedRecommendationsAsync(
        string? userId, string? sessionId, int maxResults = 8)
    {
        try
        {
            var allProducts = await _unitOfWork.ProductRepository.GetAllWithDetailsAsync();
            var activeProducts = allProducts.Where(p => !p.IsDeleted && p.Quantity > 0).ToList();
            if (!activeProducts.Any())
                return new List<ChatProductInfo>();

            // 1. Get user's behavior history (last 30 days)
            var cutoff = DateTime.UtcNow.AddDays(-30);
            var behaviors = await _unitOfWork.UserBehaviors
                .FindAsync(b => !b.IsDeleted
                    && b.CreatedAt >= cutoff
                    && ((userId != null && b.UserId == userId)
                        || (sessionId != null && b.SessionId == sessionId)));

            var behaviorList = behaviors.ToList();
            if (!behaviorList.Any())
            {
                // Cold-start fallback: top-rated & best-selling products
                return activeProducts
                    .OrderByDescending(p => (double)p.AverageScore * 0.8 + Math.Log(p.SoldOut + 1) * 0.5)
                    .Take(maxResults)
                    .Select(p =>
                    {
                        var info = MapToProductInfo(p);
                        info.HighlightBadge = "Thịnh hành";
                        return info;
                    })
                    .ToList();
            }

            // 2. Score categories and brands by weighted behavior
            var categoryScores = new Dictionary<int, double>();
            var brandScores = new Dictionary<int, double>();
            var viewedProductIds = new HashSet<int>();

            foreach (var b in behaviorList)
            {
                var weight = BehaviorWeights.GetValueOrDefault(b.BehaviorType, 1.0);

                // Recency boost: more recent = higher score
                var daysSince = (DateTime.UtcNow - b.CreatedAt).TotalDays;
                var recencyMultiplier = Math.Max(0.1, 1.0 - (daysSince / 30.0));
                weight *= recencyMultiplier;

                // Dwell time boost for views (longer = more interest)
                if (b.BehaviorType == BehaviorType.View && b.DwellTimeSeconds.HasValue)
                    weight *= Math.Min(2.0, 1.0 + b.DwellTimeSeconds.Value / 60.0);

                // High rating boost
                if (b.BehaviorType == BehaviorType.Rating && b.RatingScore.HasValue)
                    weight *= b.RatingScore.Value / 3.0;

                if (b.CategoryId.HasValue)
                {
                    categoryScores.TryGetValue(b.CategoryId.Value, out var cs);
                    categoryScores[b.CategoryId.Value] = cs + weight;
                }

                if (b.BrandId.HasValue)
                {
                    brandScores.TryGetValue(b.BrandId.Value, out var bs);
                    brandScores[b.BrandId.Value] = bs + weight;
                }

                if (b.ProductId.HasValue)
                    viewedProductIds.Add(b.ProductId.Value);
            }

            // 3. Get top categories and brands
            var topCategories = categoryScores
                .OrderByDescending(x => x.Value)
                .Take(4)
                .Select(x => x.Key)
                .ToList();

            var topBrands = brandScores
                .OrderByDescending(x => x.Value)
                .Take(4)
                .Select(x => x.Key)
                .ToList();

            // 4. Score products matching preferred categories/brands
            var candidates = activeProducts
                .Select(p =>
                {
                    double affinity = 0;
                    if (topCategories.Contains(p.CategoryId))
                        affinity += categoryScores.GetValueOrDefault(p.CategoryId, 0) * 2.5;
                    if (topBrands.Contains(p.BrandId))
                        affinity += brandScores.GetValueOrDefault(p.BrandId, 0) * 1.8;

                    // Quality boost
                    var quality = (double)p.AverageScore * 0.6 + Math.Log(p.SoldOut + 1) * 0.3;
                    var penalty = viewedProductIds.Contains(p.Id) ? 0.4 : 1.0;
                    var score = (affinity * 2.0 + quality) * penalty;

                    return new { Product = p, Score = score, Affinity = affinity };
                })
                .OrderByDescending(x => x.Score)
                .Take(maxResults)
                .ToList();

            return candidates.Select(x =>
            {
                var info = MapToProductInfo(x.Product);
                info.HighlightBadge = x.Affinity > 0 ? "AI Đề xuất" : "Thịnh hành";
                return info;
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get personalized recommendations");
            return new List<ChatProductInfo>();
        }
    }

    // ══════════════════════════════════════════
    //  Personalized Home Feed
    // ══════════════════════════════════════════

    public async Task<PersonalizedHomeFeedResult> GetHomeFeedAsync(
        string? userId, string? sessionId, int limit = 8)
    {
        var result = new PersonalizedHomeFeedResult();
        try
        {
            var allProductsList = await _unitOfWork.ProductRepository.GetAllWithDetailsAsync();
            var activeProducts = allProductsList
                .Where(p => !p.IsDeleted && p.Quantity > 0)
                .ToList();

            if (!activeProducts.Any())
                return result;

            // 1. Fetch user behaviors (last 30 days)
            var cutoff = DateTime.UtcNow.AddDays(-30);
            var behaviors = await _unitOfWork.UserBehaviors
                .FindAsync(b => !b.IsDeleted
                    && b.CreatedAt >= cutoff
                    && ((userId != null && b.UserId == userId)
                        || (sessionId != null && b.SessionId == sessionId)));

            var behaviorList = behaviors.ToList();

            // 2. Score categories and brands
            var categoryScores = new Dictionary<int, double>();
            var brandScores = new Dictionary<int, double>();
            var viewedProductIds = new HashSet<int>();

            foreach (var b in behaviorList)
            {
                var weight = BehaviorWeights.GetValueOrDefault(b.BehaviorType, 1.0);
                var daysSince = (DateTime.UtcNow - b.CreatedAt).TotalDays;
                var recencyMultiplier = Math.Max(0.1, 1.0 - (daysSince / 30.0));
                weight *= recencyMultiplier;

                if (b.BehaviorType == BehaviorType.View && b.DwellTimeSeconds.HasValue)
                    weight *= Math.Min(2.0, 1.0 + b.DwellTimeSeconds.Value / 60.0);

                if (b.BehaviorType == BehaviorType.Rating && b.RatingScore.HasValue)
                    weight *= b.RatingScore.Value / 3.0;

                if (b.CategoryId.HasValue)
                {
                    categoryScores.TryGetValue(b.CategoryId.Value, out var cs);
                    categoryScores[b.CategoryId.Value] = cs + weight;
                }

                if (b.BrandId.HasValue)
                {
                    brandScores.TryGetValue(b.BrandId.Value, out var bs);
                    brandScores[b.BrandId.Value] = bs + weight;
                }

                if (b.ProductId.HasValue)
                    viewedProductIds.Add(b.ProductId.Value);
            }

            var hasUserBehavior = categoryScores.Any() || brandScores.Any() || viewedProductIds.Any();
            result.HasPersonalizedData = hasUserBehavior;

            // Preferred category names for UI
            var topCategoryIds = categoryScores
                .OrderByDescending(x => x.Value)
                .Take(3)
                .Select(x => x.Key)
                .ToList();

            if (topCategoryIds.Any())
            {
                var allCategories = await _unitOfWork.Categories.GetAllAsync();
                result.PreferredCategories = topCategoryIds
                    .Select(id => allCategories.FirstOrDefault(c => c.Id == id)?.Name)
                    .Where(name => !string.IsNullOrEmpty(name))
                    .Select(name => name!)
                    .ToList();
            }

            // Helper to get affinity score
            double GetAffinityScore(Product p)
            {
                double score = 0;
                if (categoryScores.TryGetValue(p.CategoryId, out var cs))
                    score += cs * 2.5;
                if (brandScores.TryGetValue(p.BrandId, out var bs))
                    score += bs * 1.8;
                return score;
            }

            // ── Section 1: Recommended For You ──
            var recommendedCandidates = activeProducts
                .Select(p =>
                {
                    var affinity = GetAffinityScore(p);
                    var qualityScore = (double)p.AverageScore * 0.8 + Math.Log(p.SoldOut + 1) * 0.4;
                    var penalty = viewedProductIds.Contains(p.Id) ? 0.6 : 1.0;
                    var total = (affinity * 2.0 + qualityScore) * penalty;
                    return new { Product = p, Affinity = affinity, Score = total };
                })
                .OrderByDescending(x => x.Score)
                .Take(limit)
                .ToList();

            result.RecommendedForYou = recommendedCandidates.Select(x =>
            {
                var info = MapToProductInfo(x.Product);
                info.HighlightBadge = x.Affinity > 0 ? "AI Gợi ý" : "Thịnh hành";
                return info;
            }).ToList();

            // ── Section 2: Flash Sale ──
            // Products with discount (CapitalPrice > Price), prioritized by user affinity
            var saleProducts = activeProducts
                .Where(p => p.Price > 0)
                .Select(p =>
                {
                    var hasMarkdown = p.CapitalPrice > p.Price;
                    var discountPercent = hasMarkdown
                        ? (double)((p.CapitalPrice - p.Price) / p.CapitalPrice) * 100.0
                        : 0.0;
                    var affinity = GetAffinityScore(p);
                    var dealScore = (hasMarkdown ? 50.0 : 0.0) + discountPercent * 1.2 + (affinity > 0 ? affinity * 2.0 : 0.0);
                    return new { Product = p, DealScore = dealScore, DiscountPercent = discountPercent, Affinity = affinity };
                })
                .OrderByDescending(x => x.DealScore)
                .Take(limit)
                .ToList();

            result.FlashSale = saleProducts.Select(x =>
            {
                var info = MapToProductInfo(x.Product);
                if (x.DiscountPercent > 0)
                    info.HighlightBadge = $"-{Math.Round(x.DiscountPercent)}%";
                else if (x.Affinity > 0)
                    info.HighlightBadge = "Dành cho bạn";
                else
                    info.HighlightBadge = "Giá tốt";
                return info;
            }).ToList();

            // ── Section 3: New Arrivals (Hàng mới về) ──
            // Boosted by user affinity so fresh items in categories user loves show first
            var newArrivals = activeProducts
                .Select(p =>
                {
                    var affinity = GetAffinityScore(p);
                    var daysOld = Math.Max(0, (DateTime.UtcNow - p.CreatedAt).TotalDays);
                    var recencyScore = Math.Max(0, 100.0 - daysOld * 2.0);
                    var totalScore = recencyScore + (affinity > 0 ? affinity * 3.0 : 0.0);
                    return new { Product = p, TotalScore = totalScore, Affinity = affinity };
                })
                .OrderByDescending(x => x.TotalScore)
                .Take(limit)
                .ToList();

            result.NewArrivals = newArrivals.Select(x =>
            {
                var info = MapToProductInfo(x.Product);
                info.HighlightBadge = x.Affinity > 0 ? "Mới về theo gu" : "Mới";
                return info;
            }).ToList();

            // ── Section 4: Trending Today (Xu hướng hôm nay) ──
            var trending = activeProducts
                .Select(p =>
                {
                    var affinity = GetAffinityScore(p);
                    var popularityScore = p.SoldOut * 1.5 + (double)p.AverageScore * 2.0;
                    var totalScore = popularityScore + (affinity > 0 ? affinity * 1.5 : 0.0);
                    return new { Product = p, TotalScore = totalScore, Affinity = affinity };
                })
                .OrderByDescending(x => x.TotalScore)
                .Take(limit)
                .ToList();

            result.Trending = trending.Select(x =>
            {
                var info = MapToProductInfo(x.Product);
                info.HighlightBadge = x.Affinity > 0 ? "Xu hướng cho bạn" : "Hot";
                return info;
            }).ToList();

            // ── Section 5: Recently Viewed ──
            result.RecentlyViewed = await GetRecentlyViewedAsync(userId, sessionId, limit);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to build personalized home feed");
            return result;
        }
    }

    // ── Frequently Bought Together ──
    public async Task<List<ChatProductInfo>> GetFrequentlyBoughtTogetherAsync(int productId, int maxResults = 5)
    {
        try
        {
            // Find users who purchased this product
            var purchasers = await _unitOfWork.UserBehaviors
                .FindAsync(b => !b.IsDeleted
                    && b.ProductId == productId
                    && b.BehaviorType == BehaviorType.Purchase
                    && b.UserId != null);

            var purchaserIds = purchasers.Select(b => b.UserId!).Distinct().ToList();
            if (!purchaserIds.Any())
                return new List<ChatProductInfo>();

            // Find other products these users also purchased
            var otherPurchases = await _unitOfWork.UserBehaviors
                .FindAsync(b => !b.IsDeleted
                    && purchaserIds.Contains(b.UserId!)
                    && b.BehaviorType == BehaviorType.Purchase
                    && b.ProductId.HasValue
                    && b.ProductId.Value != productId);

            var productCounts = otherPurchases
                .Where(b => b.ProductId.HasValue)
                .GroupBy(b => b.ProductId!.Value)
                .Select(g => new { ProductId = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(maxResults)
                .ToList();

            var productIds = productCounts.Select(x => x.ProductId).ToList();
            var products = await _unitOfWork.ProductRepository.GetAllWithDetailsAsync();

            return products
                .Where(p => productIds.Contains(p.Id) && !p.IsDeleted && p.Quantity > 0)
                .Select(MapToProductInfo)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get frequently bought together for product {ProductId}", productId);
            return new List<ChatProductInfo>();
        }
    }

    // ── Also Viewed ──
    public async Task<List<ChatProductInfo>> GetAlsoViewedAsync(int productId, int maxResults = 5)
    {
        try
        {
            var cutoff = DateTime.UtcNow.AddDays(-14);

            // Find users/sessions that viewed this product
            var viewers = await _unitOfWork.UserBehaviors
                .FindAsync(b => !b.IsDeleted
                    && b.ProductId == productId
                    && b.BehaviorType == BehaviorType.View
                    && b.CreatedAt >= cutoff);

            var viewerUserIds = viewers.Where(b => b.UserId != null).Select(b => b.UserId!).Distinct().ToList();
            var viewerSessionIds = viewers.Where(b => b.SessionId != null).Select(b => b.SessionId!).Distinct().ToList();

            if (!viewerUserIds.Any() && !viewerSessionIds.Any())
                return new List<ChatProductInfo>();

            // Find other products these viewers also viewed
            var otherViews = await _unitOfWork.UserBehaviors
                .FindAsync(b => !b.IsDeleted
                    && b.BehaviorType == BehaviorType.View
                    && b.ProductId.HasValue
                    && b.ProductId.Value != productId
                    && b.CreatedAt >= cutoff
                    && ((b.UserId != null && viewerUserIds.Contains(b.UserId))
                        || (b.SessionId != null && viewerSessionIds.Contains(b.SessionId))));

            var productCounts = otherViews
                .Where(b => b.ProductId.HasValue)
                .GroupBy(b => b.ProductId!.Value)
                .Select(g => new { ProductId = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(maxResults)
                .ToList();

            var productIds = productCounts.Select(x => x.ProductId).ToList();
            var products = await _unitOfWork.ProductRepository.GetAllWithDetailsAsync();

            return products
                .Where(p => productIds.Contains(p.Id) && !p.IsDeleted && p.Quantity > 0)
                .Select(MapToProductInfo)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get also-viewed for product {ProductId}", productId);
            return new List<ChatProductInfo>();
        }
    }

    // ── Recently Viewed ──
    public async Task<List<ChatProductInfo>> GetRecentlyViewedAsync(
        string? userId, string? sessionId, int maxResults = 8)
    {
        try
        {
            var cutoff = DateTime.UtcNow.AddDays(-7);
            var viewBehaviors = await _unitOfWork.UserBehaviors
                .FindAsync(b => !b.IsDeleted
                    && b.BehaviorType == BehaviorType.View
                    && b.ProductId.HasValue
                    && b.CreatedAt >= cutoff
                    && ((userId != null && b.UserId == userId)
                        || (sessionId != null && b.SessionId == sessionId)));

            var recentProductIds = viewBehaviors
                .OrderByDescending(b => b.CreatedAt)
                .Select(b => b.ProductId!.Value)
                .Distinct()
                .Take(maxResults)
                .ToList();

            if (!recentProductIds.Any())
                return new List<ChatProductInfo>();

            var products = await _unitOfWork.ProductRepository.GetAllWithDetailsAsync();
            return recentProductIds
                .Select(id => products.FirstOrDefault(p => p.Id == id && !p.IsDeleted))
                .Where(p => p != null)
                .Select(p => MapToProductInfo(p!))
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get recently viewed");
            return new List<ChatProductInfo>();
        }
    }

    // ══════════════════════════════════════════
    //  Build recommendation context for chatbot
    // ══════════════════════════════════════════

    public async Task<string> GetRecommendationContextAsync(string? userId, string? sessionId)
    {
        try
        {
            if (string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(sessionId))
                return "";

            var cutoff = DateTime.UtcNow.AddDays(-30);
            var behaviors = await _unitOfWork.UserBehaviors
                .FindAsync(b => !b.IsDeleted
                    && b.CreatedAt >= cutoff
                    && ((userId != null && b.UserId == userId)
                        || (sessionId != null && b.SessionId == sessionId)));

            var behaviorList = behaviors.ToList();
            if (!behaviorList.Any())
                return "";

            var sb = new System.Text.StringBuilder();
            sb.AppendLine("🧠 HÀNH VI NGƯỜI DÙNG (dùng để cá nhân hóa gợi ý):");

            // Recent searches
            var searches = behaviorList
                .Where(b => b.BehaviorType == BehaviorType.Search && !string.IsNullOrEmpty(b.SearchQuery))
                .OrderByDescending(b => b.CreatedAt)
                .Take(5)
                .Select(b => b.SearchQuery)
                .Distinct()
                .ToList();

            if (searches.Any())
                sb.AppendLine($"- Tìm kiếm gần đây: {string.Join(", ", searches)}");

            // Category preferences
            var catCounts = behaviorList
                .Where(b => b.CategoryId.HasValue)
                .GroupBy(b => b.CategoryId!.Value)
                .Select(g => new { CatId = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(3)
                .ToList();

            if (catCounts.Any())
            {
                var categories = await _unitOfWork.Categories.GetAllAsync();
                var catNames = catCounts
                    .Select(c => categories.FirstOrDefault(cat => cat.Id == c.CatId)?.Name ?? "N/A")
                    .ToList();
                sb.AppendLine($"- Danh mục quan tâm: {string.Join(", ", catNames)}");
            }

            // Brand preferences
            var brandCounts = behaviorList
                .Where(b => b.BrandId.HasValue)
                .GroupBy(b => b.BrandId!.Value)
                .Select(g => new { BrandId = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(3)
                .ToList();

            if (brandCounts.Any())
            {
                var brands = await _unitOfWork.Brands.GetAllAsync();
                var brandNames = brandCounts
                    .Select(b => brands.FirstOrDefault(br => br.Id == b.BrandId)?.Name ?? "N/A")
                    .ToList();
                sb.AppendLine($"- Thương hiệu yêu thích: {string.Join(", ", brandNames)}");
            }

            // Recent activity summary
            var viewCount = behaviorList.Count(b => b.BehaviorType == BehaviorType.View);
            var cartCount = behaviorList.Count(b => b.BehaviorType == BehaviorType.AddToCart);
            var purchaseCount = behaviorList.Count(b => b.BehaviorType == BehaviorType.Purchase);

            sb.AppendLine($"- Hoạt động 30 ngày: {viewCount} lượt xem, {cartCount} thêm giỏ, {purchaseCount} đơn mua");

            // Price range preference
            var viewedProducts = behaviorList
                .Where(b => b.ProductId.HasValue && (b.BehaviorType == BehaviorType.View || b.BehaviorType == BehaviorType.AddToCart))
                .Select(b => b.ProductId!.Value)
                .Distinct()
                .ToList();

            if (viewedProducts.Any())
            {
                var products = await _unitOfWork.ProductRepository.GetAllWithDetailsAsync();
                var viewedPrices = products
                    .Where(p => viewedProducts.Contains(p.Id) && p.Price > 0)
                    .Select(p => p.Price)
                    .ToList();

                if (viewedPrices.Any())
                {
                    var avgPrice = viewedPrices.Average();
                    var minPrice = viewedPrices.Min();
                    var maxPrice = viewedPrices.Max();
                    sb.AppendLine($"- Tầm giá quan tâm: {minPrice:N0}đ - {maxPrice:N0}đ (trung bình {avgPrice:N0}đ)");
                }
            }

            sb.AppendLine("\nHãy sử dụng thông tin trên để GỢI Ý SẢN PHẨM PHÙ HỢP với sở thích người dùng.");

            return sb.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to build recommendation context");
            return "";
        }
    }

    // ── Map Product → ChatProductInfo ──
    private static ChatProductInfo MapToProductInfo(Product p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Slug = p.Slug,
        Price = p.Price,
        CapitalPrice = p.CapitalPrice,
        CategoryId = p.CategoryId,
        BrandId = p.BrandId,
        CreatedAt = p.CreatedAt,
        Image = p.Image,
        BrandName = p.Brand?.Name ?? "N/A",
        CategoryName = p.Category?.Name ?? "N/A",
        ShopName = p.Shop?.Name,
        AverageScore = p.AverageScore,
        RatingCount = p.RatingCount,
        SoldOut = p.SoldOut,
        IsInStock = p.Quantity > 0,
        ShortDescription = p.Description?.Length > 100 ? p.Description[..100] + "..." : p.Description
    };
}
