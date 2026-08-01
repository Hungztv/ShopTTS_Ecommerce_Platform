using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopxBase.Application.Features.OrderDisputes.Commands.ResolveOrderDispute;
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

    [HttpPost("{id:int}/resolve")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> Resolve(int id, [FromBody] ResolveOrderDisputeCommand command)
    {
        if (id != command.DisputeId) return BadRequest("ID không khớp");

        var success = await Mediator.Send(command);
        if (!success) return Error("Không tìm thấy khiếu nại", 404);

        return Success(true, "Giải quyết khiếu nại thành công");
    }
}
