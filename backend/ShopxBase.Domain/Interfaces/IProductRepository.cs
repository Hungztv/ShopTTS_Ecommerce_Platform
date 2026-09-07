using ShopxBase.Domain.Entities;
using System.Linq.Expressions;

namespace ShopxBase.Domain.Interfaces;


public interface IProductRepository : IRepository<Product>
{

    Task<Product> GetBySlugAsync(string slug);
    Task<IEnumerable<Product>> GetByCategoryAsync(int categoryId);
    Task<IEnumerable<Product>> GetByBrandAsync(int brandId);
    Task<IEnumerable<Product>> SearchAsync(string keyword);
    Task<(IEnumerable<Product> items, int total)> GetPaginatedAsync(int pageNumber, int pageSize);
    Task<(IEnumerable<Product> items, int total)> GetFilteredAsync(
        Expression<Func<Product, bool>> predicate,
        int pageNumber,
        int pageSize,
        string? sortBy = null,
        string? sortOrder = null);
    Task<IEnumerable<Product>> GetInStockAsync();
    Task<IEnumerable<Product>> GetBestSellingAsync(int top = 10);
    Task<Product> GetWithRatingsAsync(int id);
    Task<Product> GetWithDetailsAsync(int id);
    Task<IEnumerable<Product>> GetAllWithDetailsAsync();
    Task<bool> ExistsBySlugAsync(string slug);
}
