using ShopxBase.Domain.Enums;

namespace ShopxBase.Application.Features.ShopWallets.DTOs;

public class WalletTransactionDto
{
    public int Id { get; set; }
    public int ShopId { get; set; }
    public int? OrderId { get; set; }
    public decimal Amount { get; set; }
    public WalletTransactionType Type { get; set; }
    public string TypeName => Type switch
    {
        WalletTransactionType.OrderPayout => "Doanh thu đơn hàng",
        WalletTransactionType.PlatformFee => "Phí hoa hồng sàn",
        WalletTransactionType.Withdrawal => "Rút tiền về ngân hàng",
        WalletTransactionType.RefundDeduction => "Khấu trừ hoàn tiền",
        _ => "Giao dịch khác"
    };
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
