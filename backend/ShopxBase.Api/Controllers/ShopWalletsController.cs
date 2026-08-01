using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopxBase.Application.Features.ShopWallets.DTOs;
using ShopxBase.Application.Features.ShopWallets.Queries.GetMyShopWallet;
using ShopxBase.Application.Features.ShopWallets.Queries.GetShopWallet;

namespace ShopxBase.Api.Controllers;

[ApiController]
[Route("api/shops")]
[Authorize]
public class ShopWalletsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ShopWalletsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Lấy Ví của Shop thuộc về User đang đăng nhập
    /// </summary>
    [HttpGet("me/wallet")]
    public async Task<ActionResult<ShopWalletDto>> GetMyShopWallet()
    {
        var wallet = await _mediator.Send(new GetMyShopWalletQuery());
        if (wallet == null) return NotFound("Bạn chưa có Shop hoặc Ví không tồn tại");

        return Ok(wallet);
    }

    /// <summary>
    /// Lấy Ví của Shop theo Shop ID cụ thể
    /// </summary>
    [HttpGet("{shopId:int}/wallet")]
    public async Task<ActionResult<ShopWalletDto>> GetWallet(int shopId)
    {
        var wallet = await _mediator.Send(new GetShopWalletQuery(shopId));
        if (wallet == null) return NotFound("Shop hoặc Ví không tồn tại");

        return Ok(wallet);
    }
}
