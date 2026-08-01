namespace ShopxBase.Domain.Enums;

public enum WithdrawalStatus
{
    Pending = 0,   // Chờ duyệt
    Approved = 1,  // Đã duyệt
    Rejected = 2,  // Từ chối
    Completed = 3  // Hoàn tất chuyển khoản
}
