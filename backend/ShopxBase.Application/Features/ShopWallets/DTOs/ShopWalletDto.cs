namespace ShopxBase.Application.Features.ShopWallets.DTOs;

public class ShopWalletDto
{
    public int Id { get; set; }
    public int ShopId { get; set; }
    public decimal AvailableBalance { get; set; }
    public decimal PendingBalance { get; set; }
    public decimal TotalWithdrawn { get; set; }
    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankAccountHolder { get; set; }
    public List<WalletTransactionDto> Transactions { get; set; } = new();
}
