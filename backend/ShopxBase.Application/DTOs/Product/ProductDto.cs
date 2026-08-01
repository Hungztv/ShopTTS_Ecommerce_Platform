using System.ComponentModel.DataAnnotations;

namespace ShopxBase.Application.DTOs.Product;

/// <summary>
/// Product DTO for read operations
/// </summary>
public class ProductDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Slug { get; set; }
    public string Description { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public int SoldOut { get; set; }
    public string Image { get; set; }
    public int BrandId { get; set; }
    public string BrandName { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; }
    public int ShopId { get; set; }
    public string? ShopName { get; set; }
    public string? ShopSlug { get; set; }
    public string? ShopLogoUrl { get; set; }
    public string? ShopOwnerUserId { get; set; }
    public decimal AverageRating { get; set; }
    public int TotalReviews { get; set; }
    public bool IsInStock { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// Create Product DTO
/// </summary>
public class CreateProductDto
{
    [Required(ErrorMessage = "Tên sản phẩm là bắt buộc")]
    [MinLength(4, ErrorMessage = "Tên sản phẩm tối thiểu 4 ký tự")]
    [MaxLength(200, ErrorMessage = "Tên sản phẩm tối đa 200 ký tự")]
    public string Name { get; set; }

    [MaxLength(250)]
    public string Slug { get; set; }

    [Required(ErrorMessage = "Mô tả sản phẩm là bắt buộc")]
    [MinLength(4, ErrorMessage = "Mô tả tối thiểu 4 ký tự")]
    public string Description { get; set; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Giá bán phải lớn hơn 0")]
    public decimal Price { get; set; }

    [Required]
    [Range(0, double.MaxValue, ErrorMessage = "Giá vốn không được âm")]
    public decimal CapitalPrice { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "Số lượng không được âm")]
    public int Quantity { get; set; }

    [MaxLength(500)]
    public string Image { get; set; }

    [Required(ErrorMessage = "Thương hiệu là bắt buộc")]
    public int BrandId { get; set; }

    [Required(ErrorMessage = "Danh mục là bắt buộc")]
    public int CategoryId { get; set; }

    [Required(ErrorMessage = "ShopId là bắt buộc")]
    public int ShopId { get; set; }
}

/// <summary>
/// Update Product DTO
/// </summary>
public class UpdateProductDto
{
    [Required]
    public int Id { get; set; }

    [Required(ErrorMessage = "Tên sản phẩm là bắt buộc")]
    [MinLength(4, ErrorMessage = "Tên sản phẩm tối thiểu 4 ký tự")]
    [MaxLength(200, ErrorMessage = "Tên sản phẩm tối đa 200 ký tự")]
    public string Name { get; set; }

    [MaxLength(250)]
    public string Slug { get; set; }

    [Required(ErrorMessage = "Mô tả sản phẩm là bắt buộc")]
    [MinLength(4, ErrorMessage = "Mô tả tối thiểu 4 ký tự")]
    public string Description { get; set; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Giá bán phải lớn hơn 0")]
    public decimal Price { get; set; }

    [Required]
    [Range(0, double.MaxValue, ErrorMessage = "Giá vốn không được âm")]
    public decimal CapitalPrice { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "Số lượng không được âm")]
    public int Quantity { get; set; }

    [MaxLength(500)]
    public string Image { get; set; }

    [Required(ErrorMessage = "Thương hiệu là bắt buộc")]
    public int BrandId { get; set; }

    [Required(ErrorMessage = "Danh mục là bắt buộc")]
    public int CategoryId { get; set; }

    [Required(ErrorMessage = "ShopId là bắt buộc")]
    public int ShopId { get; set; }
}
