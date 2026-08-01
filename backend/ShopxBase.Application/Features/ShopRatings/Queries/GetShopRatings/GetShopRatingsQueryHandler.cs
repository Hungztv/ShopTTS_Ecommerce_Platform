using MediatR;
using ShopxBase.Application.DTOs.ShopRating;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Application.Features.ShopRatings.Queries.GetShopRatings;

public class GetShopRatingsQueryHandler : IRequestHandler<GetShopRatingsQuery, ShopRatingPagedDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetShopRatingsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ShopRatingPagedDto> Handle(GetShopRatingsQuery request, CancellationToken cancellationToken)
    {
        try
        {
            // 1. Get all approved ratings for this shop
            var allRatings = await _unitOfWork.ShopRatings.FindAsync(r => r.ShopId == request.ShopId && r.IsApproved && !r.IsDeleted);
            var ratingList = allRatings.ToList();

            var totalCount = ratingList.Count;
            var totalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize);

            // 2. Calculate stats
            var stats = new ShopRatingStatsDto
            {
                TotalRatings = totalCount,
                AverageRating = totalCount > 0 ? Math.Round((decimal)ratingList.Average(r => r.Star), 1) : 0,
                FiveStarCount = ratingList.Count(r => r.Star == 5),
                FourStarCount = ratingList.Count(r => r.Star == 4),
                ThreeStarCount = ratingList.Count(r => r.Star == 3),
                TwoStarCount = ratingList.Count(r => r.Star == 2),
                OneStarCount = ratingList.Count(r => r.Star == 1)
            };

            // 3. Paginate items
            var paginatedRatings = ratingList
                .OrderByDescending(r => r.CreatedAt)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToList();

            // 4. Map to DTOs
            var items = new List<ShopRatingDto>();
            foreach (var r in paginatedRatings)
            {
                var user = await _unitOfWork.Users.GetByIdAsync(r.UserId);
                items.Add(new ShopRatingDto
                {
                    Id = r.Id,
                    ShopId = r.ShopId,
                    UserId = r.UserId,
                    UserName = user?.FullName ?? user?.UserName ?? "Khách hàng",
                    UserAvatar = user?.Avatar,
                    Star = r.Star,
                    Comment = r.Comment,
                    CreatedAt = r.CreatedAt
                });
            }

            return new ShopRatingPagedDto
            {
                Items = items,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize,
                TotalPages = totalPages,
                Stats = stats
            };
        }
        catch
        {
            return new ShopRatingPagedDto
            {
                Items = new List<ShopRatingDto>(),
                TotalCount = 0,
                Page = request.Page,
                PageSize = request.PageSize,
                TotalPages = 0,
                Stats = new ShopRatingStatsDto()
            };
        }
    }
}
