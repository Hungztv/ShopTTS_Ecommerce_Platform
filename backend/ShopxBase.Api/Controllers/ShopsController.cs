using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopxBase.Application.Features.Shops.Commands.UpdateShop;
using ShopxBase.Application.Features.Shops.Queries.GetMyShop;
using ShopxBase.Application.Features.Shops.Queries.GetShopBySlug;
using ShopxBase.Application.Features.Shops.Queries.GetShopProducts;
using ShopxBase.Domain.Enums;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Api.Controllers;

public class ShopsController : BaseApiController
{
    private readonly IUnitOfWork _unitOfWork;

    public ShopsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAllShops([FromQuery] string? search = null)
    {
        var shops = await _unitOfWork.Shops.FindAsync(s => !s.IsDeleted && s.Status == ShopStatus.Active);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var sLower = search.ToLower();
            shops = shops.Where(s => s.Name.ToLower().Contains(sLower) || (s.Description != null && s.Description.ToLower().Contains(sLower))).ToList();
        }

        var allProducts = await _unitOfWork.Products.FindAsync(p => !p.IsDeleted && p.Quantity > 0);
        var productCountByShop = allProducts.GroupBy(p => p.ShopId).ToDictionary(g => g.Key, g => g.Count());

        var shopDtos = shops.Select(s => new
        {
            s.Id,
            s.Name,
            s.Slug,
            s.Description,
            s.LogoUrl,
            s.CoverUrl,
            Status = s.Status.ToString(),
            s.CreatedAt,
            TotalProducts = productCountByShop.GetValueOrDefault(s.Id, 0)
        });

        return Success(shopDtos);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMyShop()
    {
        var result = await Mediator.Send(new GetMyShopQuery());
        if (result == null)
            return Error("Chưa có shop", 404);

        return Success(result, "Lấy thông tin shop thành công");
    }

    [HttpPatch("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateShopCommand command)
    {
        if (id != command.Id)
            return BadRequest("ID không khớp");

        var result = await Mediator.Send(command);
        return Success(result, "Cập nhật shop thành công");
    }

    [HttpGet("slug/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var result = await Mediator.Send(new GetShopBySlugQuery { Slug = slug });
        return Success(result);
    }

    [HttpGet("{shopId:int}/products")]
    [AllowAnonymous]
    public async Task<IActionResult> GetShopProducts(int shopId, [FromQuery] GetShopProductsPublicQuery query)
    {
        query.ShopId = shopId;
        var result = await Mediator.Send(query);
        return Success(result);
    }
}
