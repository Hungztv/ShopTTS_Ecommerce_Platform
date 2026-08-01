using System.ComponentModel.DataAnnotations;

namespace ShopxBase.Application.DTOs.ShopRating;

public class ShopRatingDto
{
    public int Id { get; set; }
    public int ShopId { get; set; }
    public string UserId { get; set; }
    public string UserName { get; set; }
    public string? UserAvatar { get; set; }
    public int Star { get; set; }
    public string Comment { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateShopRatingDto
{
    [Required(ErrorMessage = "Số sao đánh giá là bắt buộc")]
    [Range(1, 5, ErrorMessage = "Số sao đánh giá phải từ 1 đến 5")]
    public int Star { get; set; }

    [Required(ErrorMessage = "Nội dung nhận xét là bắt buộc")]
    [MinLength(4, ErrorMessage = "Nội dung nhận xét tối thiểu 4 ký tự")]
    public string Comment { get; set; }
}

public class ShopRatingStatsDto
{
    public decimal AverageRating { get; set; }
    public int TotalRatings { get; set; }
    public int FiveStarCount { get; set; }
    public int FourStarCount { get; set; }
    public int ThreeStarCount { get; set; }
    public int TwoStarCount { get; set; }
    public int OneStarCount { get; set; }
}

public class ShopRatingPagedDto
{
    public List<ShopRatingDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public ShopRatingStatsDto Stats { get; set; } = new();
}
