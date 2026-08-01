using System.ComponentModel.DataAnnotations.Schema;
using ShopxBase.Domain.Enums;

namespace ShopxBase.Domain.Entities;

public class WalletTransaction : BaseEntity
{
    public int ShopId { get; set; }
    public int? OrderId { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    public WalletTransactionType Type { get; set; }
    public string Description { get; set; } = string.Empty;

    public virtual Shop Shop { get; set; }
    public virtual Order? Order { get; set; }
}
