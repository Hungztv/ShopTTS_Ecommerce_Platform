using ShopxBase.Domain.Entities;

namespace ShopxBase.Domain.Interfaces;



public interface IUnitOfWork : IDisposable
{
    IRepository<Product> Products { get; }
    IRepository<Category> Categories { get; }
    IRepository<Brand> Brands { get; }
    IRepository<Order> Orders { get; }
    IRepository<OrderDetail> OrderDetails { get; }
    IUserRepository Users { get; }  // Special repository for Identity users
    IRepository<Coupon> Coupons { get; }
    IRepository<Rating> Ratings { get; }
    IRepository<Wishlist> Wishlists { get; }
    IRepository<CompareProduct> CompareProducts { get; }
    IRepository<Slider> Sliders { get; }
    IRepository<Contact> Contacts { get; }
    IRepository<Cart> Carts { get; }
    IRepository<ContactMessage> ContactMessages { get; }
    IRepository<BusinessRegistration> BusinessRegistrations { get; }
    IRepository<Shop> Shops { get; }
    IRepository<ShopMember> ShopMembers { get; }
    IRepository<ShopRating> ShopRatings { get; }
    IRepository<ChatDocument> ChatDocuments { get; }
    IRepository<UserBehavior> UserBehaviors { get; }

    IProductRepository ProductRepository { get; }
    IOrderRepository OrderRepository { get; }
    ICouponRepository CouponRepository { get; }

    Task<int> SaveChangesAsync();
    int SaveChanges();
}