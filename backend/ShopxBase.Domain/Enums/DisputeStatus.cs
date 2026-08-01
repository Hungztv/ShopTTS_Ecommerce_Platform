namespace ShopxBase.Domain.Enums;

public enum DisputeStatus
{
    PendingShopReview = 0, // Chờ Shop phản hồi
    ShopRejected = 1,      // Shop từ chối / Chờ Sàn xử lý
    AdminIntervened = 2,   // Sàn đang can thiệp
    Refunded = 3,          // Đã hoàn tiền cho khách
    Closed = 4             // Bác khiếu nại (trả tiền cho Shop)
}
