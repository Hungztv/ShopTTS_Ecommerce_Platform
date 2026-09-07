using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopxBase.Application.Features.OrderDisputes.Commands.CreateOrderDispute;
using ShopxBase.Application.Features.OrderDisputes.Commands.ResolveOrderDispute;
using ShopxBase.Application.Features.OrderDisputes.Queries.GetEscrowStats;
using ShopxBase.Application.Features.OrderDisputes.Queries.GetOrderDisputes;

namespace ShopxBase.Api.Controllers;

[Authorize]
public class OrderDisputesController : BaseApiController
{
    [HttpGet]
    public async Task<IActionResult> GetDisputes()
    {
        var disputes = await Mediator.Send(new GetOrderDisputesQuery());
        return Success(disputes);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await Mediator.Send(new GetEscrowStatsQuery());
        return Success(stats);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderDisputeCommand command)
    {
        try
        {
            var result = await Mediator.Send(command);
            return Success(result, "Tạo khiếu nại thành công");
        }
        catch (InvalidOperationException ex)
        {
            return Error(ex.Message, 400);
        }
    }

    [HttpPost("{id:int}/resolve")]
    [Authorize(Roles = "Admin,admin,Staff,staff")]
    public async Task<IActionResult> Resolve(int id, [FromBody] ResolveOrderDisputeCommand command)
    {
        if (id != command.DisputeId) return BadRequest("ID không khớp");

        var success = await Mediator.Send(command);
        if (!success) return Error("Không tìm thấy khiếu nại hoặc khiếu nại đã giải quyết", 404);

        return Success(true, "Giải quyết khiếu nại thành công");
    }
}
