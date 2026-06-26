using AutoMapper;
using ShopxBase.Domain.Entities;
using ShopxBase.Application.DTOs.Product;
using ShopxBase.Application.Features.Products.Commands.CreateProduct;
using ShopxBase.Application.Features.Products.Commands.UpdateProduct;
using ShopxBase.Application.Features.ShopProducts.Commands.CreateShopProduct;
using ShopxBase.Application.Features.ShopProducts.Commands.UpdateShopProduct;

namespace ShopxBase.Application.Mappings;

public class ProductMappingProfile : Profile
{
	public ProductMappingProfile()
	{
		// Product Entity -> ProductDto (Read)
		CreateMap<Product, ProductDto>()
			.ForMember(dest => dest.BrandName,
					   opt => opt.MapFrom(src => src.Brand != null ? src.Brand.Name : null))
			.ForMember(dest => dest.CategoryName,
					   opt => opt.MapFrom(src => src.Category != null ? src.Category.Name : null))
			.ForMember(dest => dest.ShopName,
					   opt => opt.MapFrom(src => src.Shop != null ? src.Shop.Name : null))
			.ForMember(dest => dest.ShopOwnerUserId,
					   opt => opt.MapFrom(src => src.Shop != null ? src.Shop.OwnerUserId : null))
			.ForMember(dest => dest.AverageRating,
					   opt => opt.MapFrom(src => src.Ratings != null && src.Ratings.Any()
												 ? src.Ratings.Average(r => r.Star)
												 : 0))
			.ForMember(dest => dest.TotalReviews,
					   opt => opt.MapFrom(src => src.Ratings != null ? src.Ratings.Count : 0))
			.ForMember(dest => dest.IsInStock,
					   opt => opt.MapFrom(src => src.IsInStock()));

		// CreateProductCommand -> Product Entity
		CreateMap<CreateProductCommand, Product>()
			.ForMember(dest => dest.Id, opt => opt.Ignore())
			.ForMember(dest => dest.SoldOut, opt => opt.MapFrom(src => 0))
			.ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
			.ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
			.ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
			.ForMember(dest => dest.Brand, opt => opt.Ignore())
			.ForMember(dest => dest.Category, opt => opt.Ignore())
			.ForMember(dest => dest.Shop, opt => opt.Ignore())
			.ForMember(dest => dest.Ratings, opt => opt.Ignore())
			.ForMember(dest => dest.OrderDetails, opt => opt.Ignore())
			.ForMember(dest => dest.Wishlists, opt => opt.Ignore())
			.ForMember(dest => dest.CompareProducts, opt => opt.Ignore());

		// UpdateProductCommand -> Product Entity
		CreateMap<UpdateProductCommand, Product>()
			.ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
			.ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
			.ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
			.ForMember(dest => dest.SoldOut, opt => opt.Ignore())
			.ForMember(dest => dest.Brand, opt => opt.Ignore())
			.ForMember(dest => dest.Category, opt => opt.Ignore())
			.ForMember(dest => dest.Shop, opt => opt.Ignore())
			.ForMember(dest => dest.Ratings, opt => opt.Ignore())
			.ForMember(dest => dest.OrderDetails, opt => opt.Ignore())
			.ForMember(dest => dest.Wishlists, opt => opt.Ignore())
			.ForMember(dest => dest.CompareProducts, opt => opt.Ignore());

		// CreateShopProductCommand -> Product Entity
		CreateMap<CreateShopProductCommand, Product>()
			.ForMember(dest => dest.Id, opt => opt.Ignore())
			.ForMember(dest => dest.SoldOut, opt => opt.MapFrom(src => 0))
			.ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
			.ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
			.ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
			.ForMember(dest => dest.Brand, opt => opt.Ignore())
			.ForMember(dest => dest.Category, opt => opt.Ignore())
			.ForMember(dest => dest.Shop, opt => opt.Ignore())
			.ForMember(dest => dest.Ratings, opt => opt.Ignore())
			.ForMember(dest => dest.OrderDetails, opt => opt.Ignore())
			.ForMember(dest => dest.Wishlists, opt => opt.Ignore())
			.ForMember(dest => dest.CompareProducts, opt => opt.Ignore());

		// UpdateShopProductCommand -> Product Entity
		CreateMap<UpdateShopProductCommand, Product>()
			.ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
			.ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
			.ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
			.ForMember(dest => dest.SoldOut, opt => opt.Ignore())
			.ForMember(dest => dest.Brand, opt => opt.Ignore())
			.ForMember(dest => dest.Category, opt => opt.Ignore())
			.ForMember(dest => dest.Shop, opt => opt.Ignore())
			.ForMember(dest => dest.Ratings, opt => opt.Ignore())
			.ForMember(dest => dest.OrderDetails, opt => opt.Ignore())
			.ForMember(dest => dest.Wishlists, opt => opt.Ignore())
			.ForMember(dest => dest.CompareProducts, opt => opt.Ignore());

		// Legacy DTOs support (if still used elsewhere)
		CreateMap<CreateProductDto, Product>()
			.ForMember(dest => dest.Id, opt => opt.Ignore())
			.ForMember(dest => dest.SoldOut, opt => opt.MapFrom(src => 0))
			.ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
			.ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
			.ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
			.ForMember(dest => dest.Brand, opt => opt.Ignore())
			.ForMember(dest => dest.Category, opt => opt.Ignore())
			.ForMember(dest => dest.Shop, opt => opt.Ignore())
			.ForMember(dest => dest.Ratings, opt => opt.Ignore())
			.ForMember(dest => dest.OrderDetails, opt => opt.Ignore())
			.ForMember(dest => dest.Wishlists, opt => opt.Ignore())
			.ForMember(dest => dest.CompareProducts, opt => opt.Ignore());

		CreateMap<UpdateProductDto, Product>()
			.ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
			.ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
			.ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
			.ForMember(dest => dest.SoldOut, opt => opt.Ignore())
			.ForMember(dest => dest.Brand, opt => opt.Ignore())
			.ForMember(dest => dest.Category, opt => opt.Ignore())
			.ForMember(dest => dest.Shop, opt => opt.Ignore())
			.ForMember(dest => dest.Ratings, opt => opt.Ignore())
			.ForMember(dest => dest.OrderDetails, opt => opt.Ignore())
			.ForMember(dest => dest.Wishlists, opt => opt.Ignore())
			.ForMember(dest => dest.CompareProducts, opt => opt.Ignore());
	}
}