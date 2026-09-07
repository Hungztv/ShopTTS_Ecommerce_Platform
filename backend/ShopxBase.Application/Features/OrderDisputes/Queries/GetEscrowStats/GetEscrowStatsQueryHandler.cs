using MediatR;
using ShopxBase.Application.Features.OrderDisputes.DTOs;
using ShopxBase.Domain.Enums;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Application.Features.OrderDisputes.Queries.GetEscrowStats;

public class GetEscrowStatsQueryHandler : IRequestHandler<GetEscrowStatsQuery, EscrowStatsDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetEscrowStatsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<EscrowStatsDto> Handle(GetEscrowStatsQuery request, CancellationToken cancellationToken)
    {
        var disputes = (await _unitOfWork.OrderDisputes.FindAsync(d => !d.IsDeleted)).ToList();
        var orderIds = disputes.Select(d => d.OrderId).Distinct().ToList();
        var orders = (await _unitOfWork.Orders.FindAsync(o => orderIds.Contains(o.Id) && !o.IsDeleted)).ToList();
        var orderDict = orders.ToDictionary(o => o.Id, o => o);

        var pendingDisputes = disputes.Where(d => d.Status <= DisputeStatus.AdminIntervened).ToList();
        var resolvedDisputes = disputes.Where(d => d.Status >= DisputeStatus.Refunded).ToList();

        decimal totalEscrowLocked = pendingDisputes.Sum(d => orderDict.TryGetValue(d.OrderId, out var ord) ? ord.Total : 0);

        return new EscrowStatsDto
        {
            TotalPendingDisputes = pendingDisputes.Count,
            TotalEscrowLocked = totalEscrowLocked,
            TotalResolvedDisputes = resolvedDisputes.Count,
            TotalAdminIntervened = disputes.Count(d => d.Status == DisputeStatus.AdminIntervened),
            TotalRefunded = disputes.Count(d => d.Status == DisputeStatus.Refunded),
            TotalReleasedToSeller = disputes.Count(d => d.Status == DisputeStatus.Closed)
        };
    }
}
