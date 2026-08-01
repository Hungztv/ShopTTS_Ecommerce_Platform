using MediatR;
using ShopxBase.Application.Features.OrderDisputes.DTOs;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Application.Features.OrderDisputes.Queries.GetOrderDisputes;

public class GetOrderDisputesQueryHandler : IRequestHandler<GetOrderDisputesQuery, List<OrderDisputeDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetOrderDisputesQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<List<OrderDisputeDto>> Handle(GetOrderDisputesQuery request, CancellationToken cancellationToken)
    {
        var disputes = await _unitOfWork.OrderDisputes.GetAllAsync();
        var result = new List<OrderDisputeDto>();

        foreach (var dispute in disputes)
        {
            var order = await _unitOfWork.Orders.GetByIdAsync(dispute.OrderId);
            var user = dispute.UserId != null ? await _unitOfWork.Users.GetByIdAsync(dispute.UserId) : null;
            
            // Get shop from order detail if available
            var orderDetails = order != null ? await _unitOfWork.OrderDetails.FindAsync(od => od.OrderId == order.Id) : null;
            var firstDetail = orderDetails?.FirstOrDefault();

            result.Add(new OrderDisputeDto
            {
                Id = dispute.Id,
                OrderId = dispute.OrderId,
                OrderCode = order?.OrderCode ?? $"#ORD-{dispute.OrderId}",
                UserId = dispute.UserId ?? "",
                CustomerName = user?.FullName ?? order?.Name ?? "Khách hàng",
                CustomerEmail = user?.Email ?? order?.Email ?? "",
                ShopId = firstDetail?.ShopId ?? 0,
                ShopName = firstDetail?.ShopName ?? "Cửa hàng",
                Amount = order?.Total ?? 0,
                Reason = dispute.Reason,
                EvidenceUrls = dispute.EvidenceUrls,
                Status = dispute.Status,
                ResolutionNote = dispute.ResolutionNote,
                CreatedAt = dispute.CreatedAt,
                ResolvedAt = dispute.ResolvedAt
            });
        }

        return result.OrderByDescending(d => d.CreatedAt).ToList();
    }
}
