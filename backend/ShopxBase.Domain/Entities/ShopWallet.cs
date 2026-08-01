using System.ComponentModel.DataAnnotations.Schema;

namespace ShopxBase.Domain.Entities;

public class ShopWallet : BaseEntity
{
    public int ShopId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal AvailableBalance { get; set; } = 0;

    [Column(TypeName = "decimal(18,2)")]
    public decimal PendingBalance { get; set; } = 0;

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalWithdrawn { get; set; } = 0;

    public string? BankName { get; set; }
    public string? BankAccountNumber { get; set; }
    public string? BankAccountHolder { get; set; }

    public virtual Shop Shop { get; set; }
}
