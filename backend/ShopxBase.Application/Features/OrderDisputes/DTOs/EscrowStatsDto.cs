namespace ShopxBase.Application.Features.OrderDisputes.DTOs;

public class EscrowStatsDto
{
    public int TotalPendingDisputes { get; set; }
    public decimal TotalEscrowLocked { get; set; }
    public int TotalResolvedDisputes { get; set; }
    public int TotalAdminIntervened { get; set; }
    public int TotalRefunded { get; set; }
    public int TotalReleasedToSeller { get; set; }
}
