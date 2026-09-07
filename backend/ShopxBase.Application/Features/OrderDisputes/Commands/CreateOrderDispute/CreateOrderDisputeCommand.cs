using MediatR;
using ShopxBase.Application.Features.OrderDisputes.DTOs;

namespace ShopxBase.Application.Features.OrderDisputes.Commands.CreateOrderDispute;

public class CreateOrderDisputeCommand : IRequest<OrderDisputeDto>
{
    public int OrderId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? EvidenceUrls { get; set; }
}
