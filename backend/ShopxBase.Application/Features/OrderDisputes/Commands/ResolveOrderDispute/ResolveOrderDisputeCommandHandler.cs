using MediatR;
using ShopxBase.Domain.Enums;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Application.Features.OrderDisputes.Commands.ResolveOrderDispute;

public class ResolveOrderDisputeCommandHandler : IRequestHandler<ResolveOrderDisputeCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;

    public ResolveOrderDisputeCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<bool> Handle(ResolveOrderDisputeCommand request, CancellationToken cancellationToken)
    {
        var dispute = await _unitOfWork.OrderDisputes.GetByIdAsync(request.DisputeId);
        if (dispute == null) return false;

        var order = await _unitOfWork.Orders.GetByIdAsync(dispute.OrderId);

        if (request.Action == "Refund")
        {
            dispute.Status = DisputeStatus.Refunded;
            dispute.ResolutionNote = request.ResolutionNote ?? "Sàn chấp thuận hoàn tiền cho người mua.";
            dispute.ResolvedAt = DateTime.UtcNow;

            if (order != null)
            {
                order.Status = (int)OrderStatus.Refunded; // 5
            }
        }
        else // ReleaseToSeller
        {
            dispute.Status = DisputeStatus.Closed;
            dispute.ResolutionNote = request.ResolutionNote ?? "Sàn bác khiếu nại. Giải ngân số tiền cho Shop.";
            dispute.ResolvedAt = DateTime.UtcNow;

            if (order != null)
            {
                var prevStatus = order.Status;
                order.Status = (int)OrderStatus.Completed; // 3

                await ShopxBase.Application.Features.ShopWallets.Services.ShopWalletSettlementHelper
                    .ProcessOrderSettlementAsync(_unitOfWork, order, prevStatus, (int)OrderStatus.Completed);
            }
        }

        await _unitOfWork.OrderDisputes.UpdateAsync(dispute);
        if (order != null) await _unitOfWork.Orders.UpdateAsync(order);

        await _unitOfWork.SaveChangesAsync();
        return true;
    }
}
