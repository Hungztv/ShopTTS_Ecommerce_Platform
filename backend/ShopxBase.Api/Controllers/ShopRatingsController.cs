using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopxBase.Application.DTOs.ShopRating;
using ShopxBase.Application.Features.ShopRatings.Commands.CreateShopRating;
using ShopxBase.Application.Features.ShopRatings.Queries.GetShopRatings;

namespace ShopxBase.Api.Controllers;

/// <summary>
/// Controller for managing direct Shop Ratings and Reviews
/// </summary>
[ApiController]
[Route("api/shops/{shopId:int}/ratings")]
public class ShopRatingsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ShopRatingsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Get paginated ratings and stats for a shop
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ShopRatingPagedDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ShopRatingPagedDto>> GetShopRatings(
        int shopId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var query = new GetShopRatingsQuery
        {
            ShopId = shopId,
            Page = page,
            PageSize = pageSize
        };

        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Create a new 1 to 5 star rating for a shop
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ShopRatingDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ShopRatingDto>> CreateShopRating(
        int shopId,
        [FromBody] CreateShopRatingDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? User.FindFirst(ClaimTypes.Email)?.Value
            ?? User.FindFirst("email")?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { success = false, message = "Bạn cần đăng nhập để đánh giá Cửa hàng" });
        }

        var command = new CreateShopRatingCommand
        {
            ShopId = shopId,
            UserId = userId,
            Star = dto.Star,
            Comment = dto.Comment
        };

        var result = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetShopRatings), new { shopId = result.ShopId }, result);
    }
}
