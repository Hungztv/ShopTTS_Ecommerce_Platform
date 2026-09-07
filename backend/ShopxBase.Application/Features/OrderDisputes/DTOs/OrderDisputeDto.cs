using ShopxBase.Domain.Enums;

namespace ShopxBase.Application.Features.OrderDisputes.DTOs;

public class OrderDisputeDto
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty;
    public int ShopId { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? EvidenceUrls { get; set; }
    public DisputeStatus Status { get; set; }
    public string StatusText => Status switch
    {
        DisputeStatus.PendingShopReview => "Chờ Shop phản hồi",
        DisputeStatus.ShopRejected => "Cần Admin Trọng Tài",
        DisputeStatus.AdminIntervened => "Sàn đang can thiệp",
        DisputeStatus.Refunded => "Đã hoàn tiền cho khách",
        DisputeStatus.Closed => "Bác khiếu nại (Giải ngân Shop)",
        _ => "Khác"
    };
    public string? ResolutionNote { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public List<DisputeItemProductDto> Items { get; set; } = new();
}

public class DisputeItemProductDto
{
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ProductImage { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Quantity { get; set; }
}
