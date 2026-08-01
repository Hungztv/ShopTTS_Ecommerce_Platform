using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ShopxBase.Domain.Exceptions;

namespace ShopxBase.Domain.Entities;

public class ShopRating : BaseEntity
{
    [Required]
    public int ShopId { get; set; }

    [Required]
    public string UserId { get; set; }

    [Range(1, 5)]
    public int Star { get; set; }

    [Required, MinLength(4)]
    public string Comment { get; set; }

    public bool IsApproved { get; set; } = true;

    // Navigation Properties
    [ForeignKey("ShopId")]
    public virtual Shop Shop { get; set; }

    [ForeignKey("UserId")]
    public virtual AppUser User { get; set; }

    public void ValidateRating()
    {
        if (Star < 1 || Star > 5)
            throw new InvalidProductException("Đánh giá sao phải từ 1 đến 5");

        if (string.IsNullOrWhiteSpace(Comment) || Comment.Length < 4)
            throw new InvalidProductException("Bình luận phải có ít nhất 4 ký tự");
    }
}
