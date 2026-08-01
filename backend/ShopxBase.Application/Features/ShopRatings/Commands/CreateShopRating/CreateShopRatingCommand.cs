using MediatR;
using ShopxBase.Application.DTOs.ShopRating;

namespace ShopxBase.Application.Features.ShopRatings.Commands.CreateShopRating;

public class CreateShopRatingCommand : IRequest<ShopRatingDto>
{
    public int ShopId { get; set; }
    public string UserId { get; set; }
    public int Star { get; set; }
    public string Comment { get; set; }
}
