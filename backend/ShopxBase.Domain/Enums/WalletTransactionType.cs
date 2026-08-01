namespace ShopxBase.Domain.Enums;

public enum WalletTransactionType
{
    OrderPayout = 0,     // Thanh toán doanh thu đơn hàng cho Shop
    PlatformFee = 1,     // Phí hoa hồng sàn
    Withdrawal = 2,      // Rút tiền về ngân hàng
    RefundDeduction = 3  // Trừ tiền hoàn trả
}
