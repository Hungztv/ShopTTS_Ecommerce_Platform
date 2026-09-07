using Microsoft.EntityFrameworkCore;
using ShopxBase.Domain.Entities;
using ShopxBase.Domain.Interfaces;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace ShopxBase.Infrastructure.Services;

/// <summary>
/// Service chuyên phục vụ ChatBot: tìm kiếm sản phẩm thông minh & gợi ý recommendation
/// </summary>
public interface IChatBotProductService
{
    /// <summary>
    /// Tìm sản phẩm theo nhiều keyword, hỗ trợ match Name, Description, Brand, Category
    /// </summary>
    Task<List<ChatProductInfo>> SearchProductsAsync(string query, int maxResults = 5);

    /// <summary>
    /// Gợi ý sản phẩm tương tự (cùng category/brand)
    /// </summary>
    Task<List<ChatProductInfo>> GetSimilarProductsAsync(int productId, int maxResults = 5);

    /// <summary>
    /// Gợi ý sản phẩm bán chạy theo category
    /// </summary>
    Task<List<ChatProductInfo>> GetTrendingProductsAsync(int? categoryId = null, int maxResults = 5);

    /// <summary>
    /// Gợi ý sản phẩm theo khoảng giá
    /// </summary>
    Task<List<ChatProductInfo>> GetProductsByPriceRangeAsync(decimal? minPrice, decimal? maxPrice, string? category = null, int maxResults = 5);

    /// <summary>
    /// Tìm kiếm thông minh: nhận diện danh mục mục tiêu (điện thoại, laptop, tai nghe...),
    /// lọc theo tầm giá và chấm điểm mức độ liên quan chuyên sâu (gaming, pin trâu, văn phòng...).
    /// </summary>
    Task<List<ChatProductInfo>> SmartSearchAsync(string query, decimal? minPrice = null, decimal? maxPrice = null, int maxResults = 8);

    /// <summary>
    /// Lấy danh sách categories hiện có
    /// </summary>
    Task<List<string>> GetAvailableCategoriesAsync();
}

/// <summary>
/// DTO nhẹ chứa thông tin sản phẩm cho ChatBot context
/// </summary>
public class ChatProductInfo
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Image { get; set; } = string.Empty;
    public string BrandName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public string? ShopName { get; set; }
    public decimal AverageScore { get; set; }
    public int RatingCount { get; set; }
    public int SoldOut { get; set; }
    public bool IsInStock { get; set; }
    public string? ShortDescription { get; set; }
    public string? HighlightBadge { get; set; }
}

public class ChatBotProductService : IChatBotProductService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IProductRepository _productRepository;

    public ChatBotProductService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
        _productRepository = unitOfWork.ProductRepository;
    }

    public async Task<List<ChatProductInfo>> SearchProductsAsync(string query, int maxResults = 5)
    {
        return await SmartSearchAsync(query, null, null, maxResults);
    }

    public async Task<List<ChatProductInfo>> SmartSearchAsync(
        string query, decimal? minPrice = null, decimal? maxPrice = null, int maxResults = 8)
    {
        if (string.IsNullOrWhiteSpace(query))
            return new List<ChatProductInfo>();

        var normalizedQuery = NormalizeText(query);

        // 1. Nếu câu hỏi thuần túy chào hỏi hoặc hỏi thông tin cửa hàng, không xổ sản phẩm
        if (IsNonProductQuery(normalizedQuery))
        {
            return new List<ChatProductInfo>();
        }

        // 2. Tách từ khóa sạch (loại bỏ stop words tiếng Việt và từ nối)
        var cleanKeywords = normalizedQuery
            .Split(new[] { ' ', ',', '.', '!', '?', '-', '_', ':', ';' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(k => k.Length >= 2 && !SearchStopWords.Contains(k))
            .Distinct()
            .ToList();

        // 3. Nhận diện danh mục mục tiêu (Điện thoại, Laptop, Máy tính bảng, Tai nghe...)
        var targetCategories = await DetectTargetCategoriesAsync(normalizedQuery, cleanKeywords);

        // 4. TRƯỜNG HỢP 1: Có danh mục mục tiêu rõ ràng (ví dụ hỏi điện thoại, laptop...)
        if (targetCategories.Any())
        {
            var targetCatIds = targetCategories.Select(c => c.Id).Distinct().ToList();
            var candidates = new List<Product>();

            foreach (var catId in targetCatIds)
            {
                var items = await _productRepository.GetByCategoryAsync(catId);
                candidates.AddRange(items.Where(p => !p.IsDeleted && p.Quantity > 0));
            }

            var uniqueCandidates = candidates
                .GroupBy(p => p.Id)
                .Select(g => g.First())
                .ToList();

            var scored = new List<(Product Product, double Score)>();

            foreach (var p in uniqueCandidates)
            {
                var detail = await _productRepository.GetWithDetailsAsync(p.Id) ?? p;
                var score = CalculateTargetedProductScore(detail, cleanKeywords, minPrice, maxPrice);
                if (score > 0)
                {
                    scored.Add((detail, score));
                }
            }

            var topProducts = scored
                .OrderByDescending(x => x.Score)
                .ThenByDescending(x => x.Product.SoldOut)
                .ThenByDescending(x => x.Product.AverageScore)
                .Take(maxResults)
                .Select(x => MapToInfo(x.Product))
                .ToList();

            if (topProducts.Any())
            {
                return topProducts;
            }
        }

        // 5. TRƯỜNG HỢP 2: Không thuộc danh mục cố định, tìm theo Brand hoặc từ khóa tên sản phẩm
        var matchedProducts = new List<Product>();

        // Tìm theo Brand trước nếu có brand name trong query
        var allBrands = await _unitOfWork.Brands.FindAsync(b => !b.IsDeleted);
        var matchedBrands = allBrands.Where(b =>
        {
            var bNorm = NormalizeText(b.Name);
            return cleanKeywords.Any(k => bNorm.Contains(k) || k.Contains(bNorm)) || normalizedQuery.Contains(bNorm);
        }).ToList();

        foreach (var b in matchedBrands.Take(3))
        {
            var bp = await _productRepository.GetByBrandAsync(b.Id);
            matchedProducts.AddRange(bp.Where(p => !p.IsDeleted && p.Quantity > 0));
        }

        // Tìm theo từng keyword sạch trong tên sản phẩm
        foreach (var kw in cleanKeywords.Take(5))
        {
            var results = await _productRepository.SearchAsync(kw);
            matchedProducts.AddRange(results.Where(p => !p.IsDeleted && p.Quantity > 0));
        }

        var deduped = matchedProducts
            .GroupBy(p => p.Id)
            .Select(g => g.First())
            .ToList();

        var rankedList = new List<(Product Product, double Score)>();
        foreach (var p in deduped)
        {
            var detail = await _productRepository.GetWithDetailsAsync(p.Id) ?? p;
            var score = CalculateGeneralProductScore(detail, cleanKeywords, minPrice, maxPrice);
            if (score > 0)
            {
                rankedList.Add((detail, score));
            }
        }

        return rankedList
            .OrderByDescending(x => x.Score)
            .ThenByDescending(x => x.Product.SoldOut)
            .ThenByDescending(x => x.Product.AverageScore)
            .Take(maxResults)
            .Select(x => MapToInfo(x.Product))
            .ToList();
    }

    private static double CalculateTargetedProductScore(
        Product product, List<string> keywords, decimal? minPrice, decimal? maxPrice)
    {
        double score = 100.0; // Điểm cơ bản vì đã đúng Category!

        var name = NormalizeText(product.Name);
        var desc = NormalizeText(product.Description ?? "");
        var brand = NormalizeText(product.Brand?.Name ?? "");

        // 1. Chấm điểm tầm giá (Rất quan trọng)
        if (minPrice.HasValue || maxPrice.HasValue)
        {
            var effectiveMin = minPrice ?? 0;
            var effectiveMax = maxPrice ?? decimal.MaxValue;

            if (product.Price >= effectiveMin && product.Price <= effectiveMax)
            {
                score += 150.0; // Đúng khoảng giá yêu cầu!
            }
            else
            {
                decimal diff = 0;
                if (product.Price < effectiveMin) diff = effectiveMin - product.Price;
                else if (product.Price > effectiveMax) diff = product.Price - effectiveMax;

                var refPrice = maxPrice ?? minPrice ?? 1;
                var pctDiff = (double)(diff / refPrice);

                if (pctDiff <= 0.25)
                {
                    score += 60.0; // Lệch dưới 25% vẫn chấp nhận được
                }
                else if (pctDiff <= 0.50)
                {
                    score += 10.0;
                }
                else
                {
                    score -= 100.0; // Quá xa ngân sách
                }
            }
        }

        // 2. Chấm điểm từ khóa nhu cầu cụ thể (Gaming, Chụp ảnh, Pin, Văn phòng, Học tập...)
        bool isGamingQuery = keywords.Any(k => k.Contains("game") || k == "choi");
        bool isCameraQuery = keywords.Any(k => k.Contains("anh") || k.Contains("cam") || k.Contains("quay"));
        bool isBatteryQuery = keywords.Any(k => k.Contains("pin") || k.Contains("trau") || k.Contains("khung"));
        bool isOfficeStudentQuery = keywords.Any(k => k.Contains("hoc") || k.Contains("sinh") || k.Contains("van") || k.Contains("phong"));

        if (isGamingQuery)
        {
            if (name.Contains("poco") || name.Contains("ultra") || name.Contains("pro") || name.Contains("rog") || name.Contains("legion") || name.Contains("gaming"))
                score += 60.0;
            if (desc.Contains("snapdragon") || desc.Contains("dimensity") || desc.Contains("120hz") || desc.Contains("144hz") || desc.Contains("ram 8") || desc.Contains("ram 12") || desc.Contains("ram 16"))
                score += 40.0;
        }

        if (isCameraQuery)
        {
            if (name.Contains("ultra") || name.Contains("pro max") || name.Contains("pro") || name.Contains("pixel") || name.Contains("reno"))
                score += 50.0;
            if (desc.Contains("ois") || desc.Contains("camera") || desc.Contains("50mp") || desc.Contains("108mp") || desc.Contains("200mp") || desc.Contains("tele"))
                score += 40.0;
        }

        if (isBatteryQuery)
        {
            if (desc.Contains("5000") || desc.Contains("6000") || desc.Contains("pin") || desc.Contains("sac nhanh") || desc.Contains("67w") || desc.Contains("120w"))
                score += 50.0;
        }

        if (isOfficeStudentQuery)
        {
            if (product.Price <= 16_000_000)
                score += 40.0;
        }

        // 3. Khớp từng từ khóa cụ thể trong tên / thương hiệu / mô tả
        foreach (var kw in keywords)
        {
            if (name.Contains(kw)) score += 35.0;
            if (brand.Contains(kw)) score += 30.0;
            if (desc.Contains(kw)) score += 10.0;
        }

        // 4. Tín hiệu chất lượng
        score += Math.Min(25.0, product.SoldOut / 10.0);
        score += (double)product.AverageScore * 3.0;

        return score;
    }

    private static double CalculateGeneralProductScore(
        Product product, List<string> keywords, decimal? minPrice, decimal? maxPrice)
    {
        double score = 50.0;
        var name = NormalizeText(product.Name);
        var desc = NormalizeText(product.Description ?? "");
        var brand = NormalizeText(product.Brand?.Name ?? "");

        if (minPrice.HasValue || maxPrice.HasValue)
        {
            var effectiveMin = minPrice ?? 0;
            var effectiveMax = maxPrice ?? decimal.MaxValue;

            if (product.Price >= effectiveMin && product.Price <= effectiveMax)
            {
                score += 100.0;
            }
            else
            {
                decimal diff = 0;
                if (product.Price < effectiveMin) diff = effectiveMin - product.Price;
                else if (product.Price > effectiveMax) diff = product.Price - effectiveMax;

                var refPrice = maxPrice ?? minPrice ?? 1;
                var pctDiff = (double)(diff / refPrice);
                if (pctDiff <= 0.25) score += 30.0;
                else score -= 100.0;
            }
        }

        foreach (var kw in keywords)
        {
            if (name.Contains(kw)) score += 35.0;
            if (brand.Contains(kw)) score += 25.0;
            if (desc.Contains(kw)) score += 8.0;
        }

        score += Math.Min(20.0, product.SoldOut / 10.0);
        score += (double)product.AverageScore * 2.0;

        return score;
    }

    private async Task<List<Category>> DetectTargetCategoriesAsync(
        string normalizedQuery, List<string> keywords)
    {
        var allCategories = await _unitOfWork.Categories.FindAsync(c => !c.IsDeleted);
        var matches = new List<Category>();

        // 1. Điện thoại
        if (ContainsAny(normalizedQuery, PhoneTerms) || keywords.Any(k => PhoneTerms.Any(t => k == t || t.Contains(k))))
        {
            var phoneCat = allCategories.FirstOrDefault(c => NormalizeText(c.Name).Contains("dien thoai") || c.Slug == "dien-thoai");
            if (phoneCat != null) matches.Add(phoneCat);
        }

        // 2. Laptop
        if (ContainsAny(normalizedQuery, LaptopTerms) || keywords.Any(k => LaptopTerms.Any(t => k == t || t.Contains(k))))
        {
            var laptopCat = allCategories.FirstOrDefault(c => NormalizeText(c.Name).Contains("laptop") || c.Slug == "laptop");
            if (laptopCat != null) matches.Add(laptopCat);
        }

        // 3. Máy tính bảng
        if (ContainsAny(normalizedQuery, TabletTerms) || keywords.Any(k => TabletTerms.Any(t => k == t)))
        {
            var tabletCat = allCategories.FirstOrDefault(c => NormalizeText(c.Name).Contains("may tinh bang") || c.Slug == "may-tinh-bang");
            if (tabletCat != null) matches.Add(tabletCat);
        }

        // 4. Tai nghe
        if (ContainsAny(normalizedQuery, HeadphoneTerms) || keywords.Any(k => HeadphoneTerms.Any(t => k == t)))
        {
            var hpCat = allCategories.FirstOrDefault(c => NormalizeText(c.Name).Contains("tai nghe") || c.Slug == "tai-nghe");
            if (hpCat != null) matches.Add(hpCat);
        }

        // 5. Đồng hồ thông minh
        if (ContainsAny(normalizedQuery, WatchTerms) || keywords.Any(k => WatchTerms.Any(t => k == t)))
        {
            var watchCat = allCategories.FirstOrDefault(c => NormalizeText(c.Name).Contains("dong ho") || c.Slug == "dong-ho-thong-minh");
            if (watchCat != null) matches.Add(watchCat);
        }

        // 6. Phụ kiện
        if (ContainsAny(normalizedQuery, AccessoryTerms) || keywords.Any(k => AccessoryTerms.Any(t => k == t)))
        {
            var accCat = allCategories.FirstOrDefault(c => NormalizeText(c.Name).Contains("phu kien") || c.Slug == "phu-kien");
            if (accCat != null) matches.Add(accCat);
        }

        // 7. Loa & Âm thanh
        if (ContainsAny(normalizedQuery, SpeakerTerms))
        {
            var spkCat = allCategories.FirstOrDefault(c => NormalizeText(c.Name).Contains("loa") || c.Slug == "loa-am-thanh");
            if (spkCat != null) matches.Add(spkCat);
        }

        // 8. Tivi
        if (ContainsAny(normalizedQuery, TvTerms))
        {
            var tvCat = allCategories.FirstOrDefault(c => NormalizeText(c.Name).Contains("tivi") || c.Slug == "tivi");
            if (tvCat != null) matches.Add(tvCat);
        }

        // 9. Giày
        if (ContainsAny(normalizedQuery, ShoesTerms))
        {
            var shoeCat = allCategories.FirstOrDefault(c => NormalizeText(c.Name).Contains("giay") || c.Slug == "giay");
            if (shoeCat != null) matches.Add(shoeCat);
        }

        // 10. Quần áo / Thời trang
        if (ContainsAny(normalizedQuery, FashionTerms))
        {
            var fashionCats = allCategories.Where(c => NormalizeText(c.Name).Contains("quan") || NormalizeText(c.Name).Contains("ao") || c.Slug.Contains("quan") || c.Slug.Contains("ao")).ToList();
            matches.AddRange(fashionCats);
        }

        // 11. Túi xách
        if (ContainsAny(normalizedQuery, BagTerms))
        {
            var bagCat = allCategories.FirstOrDefault(c => NormalizeText(c.Name).Contains("tui") || c.Slug == "tui-xach");
            if (bagCat != null) matches.Add(bagCat);
        }

        return matches.DistinctBy(c => c.Id).ToList();
    }

    private static bool IsNonProductQuery(string normalizedText)
    {
        var greetingWords = new[] { "chao", "xin chao", "hello", "hi", "alo", "cam on", "thank", "tam biet", "bye" };
        var words = normalizedText.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        if (words.Length <= 3 && words.Any(w => greetingWords.Contains(w)) && !words.Any(w => PhoneTerms.Concat(LaptopTerms).Contains(w)))
        {
            return true;
        }

        if (Regex.IsMatch(normalizedText, @"\b(chinh sach|bao hanh|doi tra|van chuyen|giao hang|phi ship|dia chi|o dau|gio mo cua|lien he)\b")
            && !Regex.IsMatch(normalizedText, @"\b(gia|mua|ban|san pham|dien thoai|laptop|tai nghe|dong ho)\b"))
        {
            return true;
        }

        return false;
    }

    private static bool ContainsAny(string text, IReadOnlyCollection<string> terms)
        => terms.Any(text.Contains);

    private static string NormalizeText(string value)
    {
        var input = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in input)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(c);
            if (category != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC).Replace('đ', 'd');
    }

    private static readonly HashSet<string> SearchStopWords = new()
    {
        "toi", "cho", "muon", "can", "tim", "goi", "y", "gioi", "thieu", "hay",
        "ban", "co", "khong", "nao", "gi", "duoc", "xin", "vui", "long", "oi",
        "nhe", "di", "thu", "xem", "mot", "vai", "nhung", "cac", "cua", "voi",
        "va", "hoac", "trong", "ngoai", "dang", "se", "da", "roi", "lai", "nua", "them",
        "tu", "van", "tuvan", "em", "minh", "gia", "tam", "khoang", "tai", "chinh",
        "ngan", "sach", "cu", "trieu", "tr", "lit", "k", "nghin", "ngan", "duoi", "tren",
        "den", "tot", "nhat", "dep", "ngon", "bo", "re", "mua", "shop", "a", "chiec", "cai",
        "loai", "dong", "hang", "hieu", "bac", "ad", "admin", "nhi"
    };

    private static readonly string[] PhoneTerms =
    {
        "dien thoai", "phone", "smartphone", "iphone", "samsung", "xiaomi", "oppo", "vivo",
        "realme", "pixel", "galaxy", "redmi", "poco", "xperia", "huawei", "flip", "fold"
    };

    private static readonly string[] LaptopTerms =
    {
        "laptop", "macbook", "notebook", "ultrabook", "thinkpad", "vivobook", "zenbook", "legion", "rog", "tuf", "may tinh xach tay"
    };

    private static readonly string[] TabletTerms =
    {
        "may tinh bang", "ipad", "tablet", "tab"
    };

    private static readonly string[] HeadphoneTerms =
    {
        "tai nghe", "earbuds", "headphone", "airpods", "in-ear", "headset"
    };

    private static readonly string[] SpeakerTerms =
    {
        "loa", "speaker", "soundbar", "soundcore"
    };

    private static readonly string[] WatchTerms =
    {
        "dong ho thong minh", "dong ho", "smartwatch", "apple watch", "galaxy watch", "garmin"
    };

    private static readonly string[] AccessoryTerms =
    {
        "phu kien", "sac", "adapter", "cu sac", "cap", "pin du phong", "power bank", "airtag", "smarttag", "op lung"
    };

    private static readonly string[] ShoesTerms =
    {
        "giay", "sneaker", "shoes", "giay the thao"
    };

    private static readonly string[] FashionTerms =
    {
        "quan ao", "ao thun", "ao khoac", "ao phong", "hoodie", "jogger", "shorts", "thoi trang", "quan nam", "ao nam"
    };

    private static readonly string[] BagTerms =
    {
        "tui xach", "tui", "balo", "bag"
    };

    private static readonly string[] TvTerms =
    {
        "tivi", "tv", "smart tv"
    };

    public async Task<List<ChatProductInfo>> GetSimilarProductsAsync(int productId, int maxResults = 5)
    {
        var product = await _productRepository.GetWithDetailsAsync(productId);
        if (product == null)
            return new List<ChatProductInfo>();

        // Lấy sản phẩm cùng category + brand, bỏ chính nó
        var sameCategoryProducts = (await _productRepository.GetByCategoryAsync(product.CategoryId))
            .Where(p => p.Id != productId && p.Quantity > 0)
            .ToList();

        var sameBrandProducts = (await _productRepository.GetByBrandAsync(product.BrandId))
            .Where(p => p.Id != productId && p.Quantity > 0 && !sameCategoryProducts.Any(sc => sc.Id == p.Id))
            .ToList();

        // Kết hợp: ưu tiên cùng category trước
        var combined = sameCategoryProducts
            .Concat(sameBrandProducts)
            .OrderByDescending(p => p.SoldOut)
            .ThenByDescending(p => p.AverageScore)
            .Take(maxResults)
            .ToList();

        var results = new List<ChatProductInfo>();
        foreach (var p in combined)
        {
            var detail = await _productRepository.GetWithDetailsAsync(p.Id);
            results.Add(MapToInfo(detail ?? p));
        }

        return results;
    }

    public async Task<List<ChatProductInfo>> GetTrendingProductsAsync(int? categoryId = null, int maxResults = 5)
    {
        IEnumerable<Product> products;

        if (categoryId.HasValue)
        {
            products = (await _productRepository.GetByCategoryAsync(categoryId.Value))
                .Where(p => p.Quantity > 0)
                .OrderByDescending(p => p.SoldOut)
                .Take(maxResults);
        }
        else
        {
            products = await _productRepository.GetBestSellingAsync(maxResults);
        }

        var results = new List<ChatProductInfo>();
        foreach (var p in products)
        {
            var detail = await _productRepository.GetWithDetailsAsync(p.Id);
            results.Add(MapToInfo(detail ?? p));
        }

        return results;
    }

    public async Task<List<ChatProductInfo>> GetProductsByPriceRangeAsync(
        decimal? minPrice, decimal? maxPrice, string? category = null, int maxResults = 5)
    {
        // Build predicate
        var (items, _) = await _productRepository.GetFilteredAsync(
            p => (!minPrice.HasValue || p.Price >= minPrice.Value)
                 && (!maxPrice.HasValue || p.Price <= maxPrice.Value)
                 && p.Quantity > 0,
            1,
            50 // lấy nhiều hơn để filter category nếu cần
        );

        var filtered = items.ToList();

        // Filter theo category name nếu có
        if (!string.IsNullOrEmpty(category))
        {
            var cat = (await _unitOfWork.Categories
                .FindAsync(c => !c.IsDeleted && c.Name.ToLower().Contains(category.ToLower())))
                .FirstOrDefault();

            if (cat != null)
            {
                filtered = filtered.Where(p => p.CategoryId == cat.Id).ToList();
            }
        }

        var ranked = filtered
            .OrderByDescending(p => p.SoldOut)
            .ThenByDescending(p => p.AverageScore)
            .Take(maxResults)
            .ToList();

        var results = new List<ChatProductInfo>();
        foreach (var p in ranked)
        {
            var detail = await _productRepository.GetWithDetailsAsync(p.Id);
            results.Add(MapToInfo(detail ?? p));
        }

        return results;
    }

    public async Task<List<string>> GetAvailableCategoriesAsync()
    {
        var categories = await _unitOfWork.Categories
            .FindAsync(c => !c.IsDeleted);

        return categories.Select(c => c.Name).OrderBy(n => n).ToList();
    }

    private static ChatProductInfo MapToInfo(Product p)
    {
        return new ChatProductInfo
        {
            Id = p.Id,
            Name = p.Name,
            Slug = p.Slug,
            Price = p.Price,
            Image = p.Image ?? "",
            BrandName = p.Brand?.Name ?? "",
            CategoryName = p.Category?.Name ?? "",
            ShopName = p.Shop?.Name,
            AverageScore = p.AverageScore,
            RatingCount = p.RatingCount,
            SoldOut = p.SoldOut,
            IsInStock = p.Quantity > 0,
            ShortDescription = p.Description?.Length > 100 ? p.Description[..100] + "..." : p.Description
        };
    }
}
