using System.ComponentModel.DataAnnotations.Schema;
using ShopxBase.Domain.Enums;

namespace ShopxBase.Domain.Entities;

public class WithdrawalRequest : BaseEntity
{
    public int ShopId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    public string BankName { get; set; } = string.Empty;
    public string BankAccountNumber { get; set; } = string.Empty;
    public string BankAccountHolder { get; set; } = string.Empty;

    public WithdrawalStatus Status { get; set; } = WithdrawalStatus.Pending;
    public DateTime? ProcessedAt { get; set; }
    public string? Note { get; set; }

    public virtual Shop Shop { get; set; }
}
