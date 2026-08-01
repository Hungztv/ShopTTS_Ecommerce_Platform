using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ShopxBase.Domain.Entities;
using System.Reflection;

namespace ShopxBase.Infrastructure.Data
{
    public class ShopxBaseDbContext : IdentityDbContext<AppUser>
    {
        public ShopxBaseDbContext(DbContextOptions<ShopxBaseDbContext> options) : base(options)
        {
        }

        public DbSet<Product> Products { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Brand> Brands { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderDetail> OrderDetails { get; set; }
        public DbSet<Coupon> Coupons { get; set; }
        public DbSet<Rating> Ratings { get; set; }
        public DbSet<Wishlist> Wishlists { get; set; }
        public DbSet<CompareProduct> CompareProducts { get; set; }
        public DbSet<Slider> Sliders { get; set; }
        public DbSet<Contact> Contacts { get; set; }
        public DbSet<ProductQuantity> ProductQuantities { get; set; }
        public DbSet<Shipping> Shippings { get; set; }
        public DbSet<Cart> Carts { get; set; }
        public DbSet<ContactMessage> ContactMessages { get; set; }
        public DbSet<BusinessRegistration> BusinessRegistrations { get; set; }
        public DbSet<Shop> Shops { get; set; }
        public DbSet<ShopMember> ShopMembers { get; set; }
        public DbSet<ShopRating> ShopRatings { get; set; }
        public DbSet<ChatDocument> ChatDocuments { get; set; }
        public DbSet<UserBehavior> UserBehaviors { get; set; }
        
        public DbSet<ChatSession> ChatSessions { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.ApplyConfigurationsFromAssembly(typeof(ShopxBaseDbContext).Assembly);

            modelBuilder.Entity<OrderDetail>(entity =>
            {
                entity.Property(e => e.ShopId).IsRequired();
                entity.Property(e => e.ShopName).HasMaxLength(200);
            });

            // ChatDocument: pgvector embedding column
            modelBuilder.Entity<ChatDocument>(entity =>
            {
                entity.Property(e => e.Embedding)
                    .HasColumnType("vector(768)");
            });

            // Config for ChatSession and ChatMessage to avoid cascade delete cycles
            modelBuilder.Entity<ChatSession>(entity =>
            {
                entity.HasOne(e => e.User1)
                    .WithMany()
                    .HasForeignKey(e => e.User1Id)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.User2)
                    .WithMany()
                    .HasForeignKey(e => e.User2Id)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ChatMessage>(entity =>
            {
                entity.HasOne(e => e.Session)
                    .WithMany(s => s.Messages)
                    .HasForeignKey(e => e.SessionId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Sender)
                    .WithMany()
                    .HasForeignKey(e => e.SenderId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // UserBehavior: indexes for fast recommendation queries
            modelBuilder.Entity<UserBehavior>(entity =>
            {
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.SessionId);
                entity.HasIndex(e => e.ProductId);
                entity.HasIndex(e => e.BehaviorType);
                entity.HasIndex(e => new { e.UserId, e.BehaviorType });
                entity.HasIndex(e => new { e.UserId, e.ProductId });
                entity.HasIndex(e => e.CreatedAt);

                entity.Property(e => e.SearchQuery).HasMaxLength(500);
                entity.Property(e => e.SourcePage).HasMaxLength(200);
                entity.Property(e => e.SessionId).HasMaxLength(100);

                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Product)
                    .WithMany()
                    .HasForeignKey(e => e.ProductId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Category)
                    .WithMany()
                    .HasForeignKey(e => e.CategoryId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Brand)
                    .WithMany()
                    .HasForeignKey(e => e.BrandId)
                    .OnDelete(DeleteBehavior.SetNull);
            });
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            NormalizeDateTimes();
            UpdateTimestamps();
            return await base.SaveChangesAsync(cancellationToken);
        }

        public override int SaveChanges()
        {
            NormalizeDateTimes();
            UpdateTimestamps();
            return base.SaveChanges();
        }

        private void UpdateTimestamps()
        {
            var entries = ChangeTracker.Entries<BaseEntity>();
            foreach (var entry in entries)
            {
                if (entry.State == EntityState.Added)
                {
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                }
                else if (entry.State == EntityState.Modified)
                {
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        private void NormalizeDateTimes()
        {
            var entries = ChangeTracker.Entries();
            foreach (var entry in entries)
            {
                if (entry.State != EntityState.Added && entry.State != EntityState.Modified)
                    continue;

                var entity = entry.Entity;
                if (entity == null)
                    continue;

                var props = entity.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance);
                foreach (var prop in props)
                {
                    if (prop.PropertyType == typeof(DateTime))
                    {
                        var value = (DateTime)prop.GetValue(entity)!;
                        if (value.Kind == DateTimeKind.Unspecified)
                            prop.SetValue(entity, DateTime.SpecifyKind(value, DateTimeKind.Utc));
                        else if (value.Kind == DateTimeKind.Local)
                            prop.SetValue(entity, value.ToUniversalTime());
                    }
                    else if (prop.PropertyType == typeof(DateTime?))
                    {
                        var value = (DateTime?)prop.GetValue(entity);
                        if (value.HasValue)
                        {
                            var dt = value.Value;
                            if (dt.Kind == DateTimeKind.Unspecified)
                                dt = DateTime.SpecifyKind(dt, DateTimeKind.Utc);
                            else if (dt.Kind == DateTimeKind.Local)
                                dt = dt.ToUniversalTime();
                            prop.SetValue(entity, dt);
                        }
                    }
                }
            }
        }
    }
}