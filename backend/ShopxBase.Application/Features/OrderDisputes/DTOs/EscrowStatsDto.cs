namespace ShopxBase.Application.Features.OrderDisputes.DTOs;

public class EscrowStatsDto
{
    public int TotalPendingDisputes { get; set; }
    public decimal TotalEscrowLocked { get; set; }
    public int TotalResolvedDisputes { get; set; }
}
