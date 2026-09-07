using MediatR;
using AutoMapper;
using ShopxBase.Domain.Interfaces;
using ShopxBase.Domain.Entities;
using ShopxBase.Application.DTOs.Product;
using ShopxBase.Application.DTOs.Common;
using System.Linq.Expressions;
using System.Globalization;
using System.Text;

namespace ShopxBase.Application.Features.Products.Queries.GetProducts;

public class GetProductsQueryHandler : IRequestHandler<GetProductsQuery, PaginationResponse<ProductDto>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public GetProductsQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<PaginationResponse<ProductDto>> Handle(GetProductsQuery request, CancellationToken cancellationToken)
    {
        int? categoryId = request.CategoryId;
        int? brandId = request.BrandId;
        decimal? minPrice = request.MinPrice;
        decimal? maxPrice = request.MaxPrice;
        string? rawSearch = request.Search?.Trim();

        var matchedCategoryIds = new List<int>();
        var matchedBrandIds = new List<int>();
        var searchKeywords = new List<string>();
        bool hasSearch = !string.IsNullOrWhiteSpace(rawSearch);

        if (hasSearch)
        {
            var lowerSearch = rawSearch!.ToLower();
            var noAccentSearch = RemoveDiacritics(lowerSearch);

            // Fetch categories and brands to match against search query
            var allCategories = await _unitOfWork.Categories.FindAsync(c => !c.IsDeleted);
            var allBrands = await _unitOfWork.Brands.FindAsync(b => !b.IsDeleted);

            // Synonym dictionary for common Vietnamese e-commerce search intents
            var synonymCategoryMap = new Dictionary<string[], string[]>
            {
                [new[] { "may tinh", "máy tính", "may vi tinh", "máy vi tính", "may tinh xach tay", "máy tính xách tay", "pc", "computer", "vi tinh", "laptop", "macbook", "notebook" }] =
                    new[] { "laptop", "may-tinh-bang" },

                [new[] { "may tinh bang", "máy tính bảng", "tablet", "ipad" }] =
                    new[] { "may-tinh-bang" },

                [new[] { "dien thoai", "điện thoại", "smartphone", "dtdd", "phone", "di dong", "di động", "iphone" }] =
                    new[] { "dien-thoai" },

                [new[] { "tai nghe", "headphone", "earphone", "airpods", "earbuds" }] =
                    new[] { "tai-nghe" },

                [new[] { "dong ho", "đồng hồ", "smartwatch", "apple watch" }] =
                    new[] { "dong-ho-thong-minh", "dong-ho-thoi-trang" },

                [new[] { "ban phim", "bàn phím", "ban phim co", "bàn phím cơ", "keyboard" }] =
                    new[] { "ban-phim-co" },

                [new[] { "man hinh", "màn hình", "monitor" }] =
                    new[] { "man-hinh" },

                [new[] { "chuot", "chuột", "mouse" }] =
                    new[] { "phu-kien" },

                [new[] { "loa", "am thanh", "âm thanh", "speaker", "soundbar" }] =
                    new[] { "loa-am-thanh" },

                [new[] { "may anh", "máy ảnh", "camera" }] =
                    new[] { "may-anh" },

                [new[] { "ao", "áo", "ao thun", "áo thun", "ao so mi", "áo sơ mi", "ao khoac", "áo khoác" }] =
                    new[] { "ao-nam", "ao-nu", "quan-ao" },

                [new[] { "quan", "quần", "quan jean", "quần jean", "quan short", "quần short", "quan tay", "quần tây" }] =
                    new[] { "quan-nam", "quan-nu", "quan-ao" },

                [new[] { "giay", "giày", "sneaker" }] =
                    new[] { "giay", "giay-nam", "giay-nu" }
            };

            // Check synonyms
            foreach (var kvp in synonymCategoryMap)
            {
                if (kvp.Key.Any(syn => lowerSearch.Contains(syn) || noAccentSearch.Contains(syn)))
                {
                    foreach (var catSlugPattern in kvp.Value)
                    {
                        var matchingCats = allCategories.Where(c =>
                            c.Slug.Contains(catSlugPattern) ||
                            RemoveDiacritics(c.Name.ToLower()).Contains(catSlugPattern) ||
                            c.Name.ToLower().Contains(catSlugPattern));
                        matchedCategoryIds.AddRange(matchingCats.Select(c => c.Id));
                    }
                }
            }

            // Also match categories dynamically by name or slug
            foreach (var cat in allCategories)
            {
                var catNameLower = cat.Name.ToLower();
                var catNoAccent = RemoveDiacritics(catNameLower);
                if (lowerSearch.Contains(catNameLower) || noAccentSearch.Contains(catNoAccent) || cat.Slug.Contains(noAccentSearch))
                {
                    matchedCategoryIds.Add(cat.Id);
                }
            }
            matchedCategoryIds = matchedCategoryIds.Distinct().ToList();

            // Match brands dynamically
            foreach (var brand in allBrands)
            {
                var brandLower = brand.Name.ToLower();
                var brandNoAccent = RemoveDiacritics(brandLower);
                if (lowerSearch.Contains(brandLower) || noAccentSearch.Contains(brandNoAccent))
                {
                    matchedBrandIds.Add(brand.Id);
                }
            }
            matchedBrandIds = matchedBrandIds.Distinct().ToList();

            // Search tokens
            searchKeywords.Add(lowerSearch);
            if (noAccentSearch != lowerSearch)
            {
                searchKeywords.Add(noAccentSearch);
            }
            var tokens = lowerSearch.Split(new[] { ' ', ',', '-', '+' }, StringSplitOptions.RemoveEmptyEntries)
                .Where(t => t.Length >= 2 && !IsStopWord(t))
                .ToList();
            searchKeywords.AddRange(tokens);
            searchKeywords = searchKeywords.Distinct().ToList();
        }

        Expression<Func<Product, bool>> predicate;

        if (!hasSearch)
        {
            predicate = p =>
                !p.IsDeleted &&
                (!categoryId.HasValue || p.CategoryId == categoryId.Value) &&
                (!brandId.HasValue || p.BrandId == brandId.Value) &&
                (!minPrice.HasValue || p.Price >= minPrice.Value) &&
                (!maxPrice.HasValue || p.Price <= maxPrice.Value);
        }
        else
        {
            List<int> catIds = matchedCategoryIds;
            List<int> bIds = matchedBrandIds;
            bool hasCat = catIds.Count > 0;
            bool hasBrand = bIds.Count > 0;
            var s = rawSearch!.ToLower();
            var terms = searchKeywords.Take(5).ToList();
            string t0 = terms.Count > 0 ? terms[0] : "";
            string t1 = terms.Count > 1 ? terms[1] : "";
            string t2 = terms.Count > 2 ? terms[2] : "";

            // If BOTH category and brand are matched (e.g. "máy tính dell"), require category + brand
            if (hasCat && hasBrand)
            {
                predicate = p =>
                    !p.IsDeleted &&
                    (!categoryId.HasValue || p.CategoryId == categoryId.Value) &&
                    (!brandId.HasValue || p.BrandId == brandId.Value) &&
                    (!minPrice.HasValue || p.Price >= minPrice.Value) &&
                    (!maxPrice.HasValue || p.Price <= maxPrice.Value) &&
                    (
                        (catIds.Contains(p.CategoryId) && bIds.Contains(p.BrandId)) ||
                        p.Name.ToLower().Contains(s) ||
                        (p.Description != null && p.Description.ToLower().Contains(s))
                    );
            }
            else
            {
                predicate = p =>
                    !p.IsDeleted &&
                    (!categoryId.HasValue || p.CategoryId == categoryId.Value) &&
                    (!brandId.HasValue || p.BrandId == brandId.Value) &&
                    (!minPrice.HasValue || p.Price >= minPrice.Value) &&
                    (!maxPrice.HasValue || p.Price <= maxPrice.Value) &&
                    (
                        // Matched category concept (e.g. "máy tính" -> Laptops & Tablets)
                        (hasCat && catIds.Contains(p.CategoryId)) ||
                        // Matched brand
                        (hasBrand && bIds.Contains(p.BrandId)) ||
                        // Literal name / description matches
                        p.Name.ToLower().Contains(s) ||
                        (p.Description != null && p.Description.ToLower().Contains(s)) ||
                        (p.Category != null && p.Category.Name.ToLower().Contains(s)) ||
                        (p.Brand != null && p.Brand.Name.ToLower().Contains(s)) ||
                        // Keyword tokens
                        (t0 != "" && p.Name.ToLower().Contains(t0)) ||
                        (t1 != "" && p.Name.ToLower().Contains(t1)) ||
                        (t2 != "" && p.Name.ToLower().Contains(t2))
                    );
            }
        }

        // Get filtered and paginated products with sort support
        var (products, totalCount) = await _unitOfWork.ProductRepository.GetFilteredAsync(
            predicate,
            request.PageNumber,
            request.PageSize,
            request.SortBy,
            request.SortOrder);

        // Map entities to DTOs
        var productDtos = _mapper.Map<List<ProductDto>>(products);

        // Return pagination response
        return new PaginationResponse<ProductDto>
        {
            Items = productDtos,
            TotalCount = totalCount,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    private static string RemoveDiacritics(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return text;
        var normalized = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var c in normalized)
        {
            var uc = CharUnicodeInfo.GetUnicodeCategory(c);
            if (uc != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(c);
            }
        }
        return sb.ToString().Normalize(NormalizationForm.FormC).Replace('đ', 'd').Replace('Đ', 'D');
    }

    private static bool IsStopWord(string word)
    {
        var stopWords = new HashSet<string>
        {
            "can", "cần", "tim", "tìm", "mua", "ban", "bán", "gia", "giá",
            "co", "có", "khong", "không", "cho", "va", "và", "voi", "với",
            "cac", "các", "nhung", "những", "mot", "một", "chiec", "chiếc",
            "cai", "cái", "con", "loai", "loại", "hang", "hàng"
        };
        return stopWords.Contains(word);
    }
}
