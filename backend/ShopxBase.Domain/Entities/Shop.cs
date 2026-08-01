using ShopxBase.Domain.Enums;

namespace ShopxBase.Domain.Entities;

public class Shop : BaseEntity
{
    public string OwnerUserId { get; set; }
    public int BusinessRegistrationId { get; set; }
    public string Name { get; set; }
    public string Slug { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? CoverUrl { get; set; }
    public ShopStatus Status { get; set; } = ShopStatus.Inactive;

    public virtual BusinessRegistration BusinessRegistration { get; set; }
    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
    public virtual ICollection<ShopMember> Members { get; set; } = new List<ShopMember>();
    public virtual ICollection<ShopRating> ShopRatings { get; set; } = new List<ShopRating>();
}
