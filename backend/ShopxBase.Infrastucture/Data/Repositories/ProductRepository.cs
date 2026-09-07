using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ShopxBase.Domain.Entities;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Infrastructure.Data.Repositories
{
    public class ProductRepository : Repository<Product>, IProductRepository
    {
        public ProductRepository(DbContext context) : base(context)
        {
        }

        public async Task<Product> GetBySlugAsync(string slug)
        {
            return await _dbSet.AsNoTracking()
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Shop)
                .FirstOrDefaultAsync(p => p.Slug == slug && !p.IsDeleted);
        }

        public async Task<IEnumerable<Product>> GetByCategoryAsync(int categoryId)
        {
            return await _dbSet.AsNoTracking()
                .Where(p => p.CategoryId == categoryId && !p.IsDeleted)
                .ToListAsync();
        }

        public async Task<IEnumerable<Product>> GetByBrandAsync(int brandId)
        {
            return await _dbSet.AsNoTracking()
                .Where(p => p.BrandId == brandId && !p.IsDeleted)
                .ToListAsync();
        }

        public async Task<IEnumerable<Product>> SearchAsync(string keyword)
        {
            if (string.IsNullOrWhiteSpace(keyword))
                return new List<Product>();

            keyword = keyword.ToLower();
            return await _dbSet.AsNoTracking()
                .Where(p => !p.IsDeleted &&
                    (p.Name.ToLower().Contains(keyword) ||
                     p.Description.ToLower().Contains(keyword)))
                .ToListAsync();
        }

        public async Task<(IEnumerable<Product> items, int total)> GetPaginatedAsync(int pageNumber, int pageSize)
        {
            var query = _dbSet.AsNoTracking()
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Shop)
                .Where(p => !p.IsDeleted)
                .OrderByDescending(p => p.CreatedAt);

            var total = await query.CountAsync();
            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, total);
        }

        public async Task<(IEnumerable<Product> items, int total)> GetFilteredAsync(
            System.Linq.Expressions.Expression<Func<Product, bool>> predicate,
            int pageNumber,
            int pageSize,
            string? sortBy = null,
            string? sortOrder = null)
        {
            var query = _dbSet.AsNoTracking()
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Shop)
                .Where(p => !p.IsDeleted)
                .Where(predicate);

            var isAsc = string.Equals(sortOrder, "asc", StringComparison.OrdinalIgnoreCase);
            query = (sortBy?.ToLower()) switch
            {
                "price" => isAsc ? query.OrderBy(p => p.Price) : query.OrderByDescending(p => p.Price),
                "soldout" or "sold" => isAsc ? query.OrderBy(p => p.SoldOut) : query.OrderByDescending(p => p.SoldOut),
                "rating" or "averagescore" => isAsc ? query.OrderBy(p => p.AverageScore) : query.OrderByDescending(p => p.AverageScore),
                "name" => isAsc ? query.OrderBy(p => p.Name) : query.OrderByDescending(p => p.Name),
                _ => isAsc ? query.OrderBy(p => p.CreatedAt) : query.OrderByDescending(p => p.CreatedAt)
            };

            var total = await query.CountAsync();
            var items = await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, total);
        }

        public async Task<IEnumerable<Product>> GetInStockAsync()
        {
            return await _dbSet.AsNoTracking()
                .Where(p => p.Quantity > 0 && !p.IsDeleted)
                .ToListAsync();
        }

        public async Task<IEnumerable<Product>> GetBestSellingAsync(int top = 10)
        {
            return await _dbSet.AsNoTracking()
                .Where(p => !p.IsDeleted)
                .OrderByDescending(p => p.SoldOut)
                .Take(top)
                .ToListAsync();
        }

        public async Task<Product> GetWithRatingsAsync(int id)
        {
            return await _dbSet
                .Include(p => p.Ratings)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        }

        public async Task<bool> ExistsBySlugAsync(string slug)
        {
            return await _dbSet.AnyAsync(p => p.Slug == slug && !p.IsDeleted);
        }

        public async Task<Product> GetWithDetailsAsync(int id)
        {
            return await _dbSet
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Shop)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted);
        }

        public async Task<IEnumerable<Product>> GetAllWithDetailsAsync()
        {
            return await _dbSet
                .Include(p => p.Brand)
                .Include(p => p.Category)
                .Include(p => p.Shop)
                .Where(p => !p.IsDeleted)
                .AsNoTracking()
                .ToListAsync();
        }
    }
}
