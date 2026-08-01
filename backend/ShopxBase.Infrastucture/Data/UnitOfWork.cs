using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ShopxBase.Domain.Entities;
using ShopxBase.Domain.Interfaces;
using ShopxBase.Infrastructure.Data.Repositories;

namespace ShopxBase.Infrastructure.Data
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly DbContext _context;

        private readonly Dictionary<string, object> _repositories;

        public UnitOfWork(DbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _repositories = new Dictionary<string, object>();
        }

        // Generic Repositories (Basic CRUD)
        public IRepository<Product> Products => GetRepository<Product>();
        public IRepository<Category> Categories => GetRepository<Category>();
        public IRepository<Brand> Brands => GetRepository<Brand>();
        public IRepository<Order> Orders => GetRepository<Order>();
        public IRepository<OrderDetail> OrderDetails => GetRepository<OrderDetail>();
        public IRepository<Coupon> Coupons => GetRepository<Coupon>();
        public IRepository<Rating> Ratings => GetRepository<Rating>();
        public IRepository<Wishlist> Wishlists => GetRepository<Wishlist>();
        public IRepository<CompareProduct> CompareProducts => GetRepository<CompareProduct>();
        public IRepository<Slider> Sliders => GetRepository<Slider>();
        public IRepository<Contact> Contacts => GetRepository<Contact>();
        public IRepository<Cart> Carts => GetRepository<Cart>();
        public IRepository<ContactMessage> ContactMessages => GetRepository<ContactMessage>();
        public IRepository<BusinessRegistration> BusinessRegistrations => GetRepository<BusinessRegistration>();
        public IRepository<Shop> Shops => GetRepository<Shop>();
        public IRepository<ShopMember> ShopMembers => GetRepository<ShopMember>();
        public IRepository<ShopRating> ShopRatings => GetRepository<ShopRating>();
        public IRepository<ChatDocument> ChatDocuments => GetRepository<ChatDocument>();
        public IRepository<UserBehavior> UserBehaviors => GetRepository<UserBehavior>();
        public IRepository<ShopWallet> ShopWallets => GetRepository<ShopWallet>();
        public IRepository<WalletTransaction> WalletTransactions => GetRepository<WalletTransaction>();
        public IRepository<WithdrawalRequest> WithdrawalRequests => GetRepository<WithdrawalRequest>();
        public IRepository<OrderDispute> OrderDisputes => GetRepository<OrderDispute>();

        // Specialized Repositories (Custom Queries)
        private IUserRepository _userRepository;
        public IUserRepository Users
        {
            get { return _userRepository ??= new UserRepository(_context); }
        }

        private IProductRepository _productRepository;
        public IProductRepository ProductRepository
        {
            get { return _productRepository ??= new ProductRepository(_context); }
        }

        private IOrderRepository _orderRepository;
        public IOrderRepository OrderRepository
        {
            get { return _orderRepository ??= new OrderRepository(_context); }
        }

        private ICouponRepository _couponRepository;
        public ICouponRepository CouponRepository
        {
            get { return _couponRepository ??= new CouponRepository(_context); }
        }


        public async Task<int> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public int SaveChanges()
        {
            return _context.SaveChanges();
        }

        public void Dispose()
        {
            _context.Dispose();
        }

        // Helper function
        private IRepository<TEntity> GetRepository<TEntity>() where TEntity : BaseEntity
        {
            var type = typeof(TEntity).Name;

            if (!_repositories.ContainsKey(type))
            {
                var repositoryType = typeof(Repository<>);
                var repositoryInstance = Activator.CreateInstance(
                    repositoryType.MakeGenericType(typeof(TEntity)),
                    _context
                );
                _repositories.Add(type, repositoryInstance);
            }

            return (IRepository<TEntity>)_repositories[type];
        }
    }
}