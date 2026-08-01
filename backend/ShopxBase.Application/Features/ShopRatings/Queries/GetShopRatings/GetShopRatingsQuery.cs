using MediatR;
using ShopxBase.Application.DTOs.ShopRating;

namespace ShopxBase.Application.Features.ShopRatings.Queries.GetShopRatings;

public class GetShopRatingsQuery : IRequest<ShopRatingPagedDto>
{
    public int ShopId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
