using MediatR;
using ShopxBase.Application.DTOs.Shop;
using ShopxBase.Domain.Enums;
using ShopxBase.Domain.Exceptions;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Application.Features.Shops.Queries.GetShopBySlug;

public class GetShopBySlugQueryHandler : IRequestHandler<GetShopBySlugQuery, ShopPublicDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetShopBySlugQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ShopPublicDto> Handle(GetShopBySlugQuery request, CancellationToken cancellationToken)
    {
        var shop = await _unitOfWork.Shops.FirstOrDefaultAsync(
            s => s.Slug == request.Slug && !s.IsDeleted && s.Status == ShopStatus.Active);

        if (shop == null)
            throw new ShopNotFoundException("Không tìm thấy shop");

        // Count products belonging to this shop
        var totalProducts = await _unitOfWork.Products.CountAsync(
            p => p.ShopId == shop.Id && !p.IsDeleted);

        // Calculate average rating from direct shop ratings & shop's products
        decimal averageRating = 0;
        try
        {
            var directRatings = await _unitOfWork.ShopRatings.FindAsync(r => r.ShopId == shop.Id && r.IsApproved && !r.IsDeleted);
            var directRatingList = directRatings.ToList();

            if (directRatingList.Any())
            {
                averageRating = Math.Round((decimal)directRatingList.Average(r => r.Star), 1);
            }
            else
            {
                var products = await _unitOfWork.Products.FindAsync(
                    p => p.ShopId == shop.Id && !p.IsDeleted && p.RatingCount > 0);

                var productList = products.ToList();
                if (productList.Any())
                {
                    averageRating = Math.Round(productList.Average(p => p.AverageScore), 1);
                }
            }
        }
        catch
        {
            var products = await _unitOfWork.Products.FindAsync(
                p => p.ShopId == shop.Id && !p.IsDeleted && p.RatingCount > 0);

            var productList = products.ToList();
            if (productList.Any())
            {
                averageRating = Math.Round(productList.Average(p => p.AverageScore), 1);
            }
        }

        return new ShopPublicDto
        {
            Id = shop.Id,
            Name = shop.Name,
            Slug = shop.Slug,
            Description = shop.Description,
            LogoUrl = shop.LogoUrl,
            CoverUrl = shop.CoverUrl,
            CreatedAt = shop.CreatedAt,
            TotalProducts = totalProducts,
            AverageRating = averageRating
        };
    }
}
