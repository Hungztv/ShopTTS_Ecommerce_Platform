using ShopxBase.Domain.Enums;

namespace ShopxBase.Domain.Entities;

public class OrderDispute : BaseEntity
{
    public int OrderId { get; set; }
    public string UserId { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;
    public string? EvidenceUrls { get; set; } // JSON array or comma-separated URLs
    public DisputeStatus Status { get; set; } = DisputeStatus.PendingShopReview;
    public string? ResolutionNote { get; set; }
    public DateTime? ResolvedAt { get; set; }

    public virtual Order Order { get; set; }
    public virtual AppUser User { get; set; }
}
