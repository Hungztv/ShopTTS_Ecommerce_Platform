using MediatR;
using ShopxBase.Application.DTOs.ShopRating;
using ShopxBase.Domain.Entities;
using ShopxBase.Domain.Exceptions;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Application.Features.ShopRatings.Commands.CreateShopRating;

public class CreateShopRatingCommandHandler : IRequestHandler<CreateShopRatingCommand, ShopRatingDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public CreateShopRatingCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ShopRatingDto> Handle(CreateShopRatingCommand request, CancellationToken cancellationToken)
    {
        // 1. Check shop existence
        var shop = await _unitOfWork.Shops.GetByIdAsync(request.ShopId);
        if (shop == null || shop.IsDeleted)
            throw new ShopNotFoundException("Cửa hàng không tồn tại");

        // 2. Validate rating
        if (request.Star < 1 || request.Star > 5)
            throw new InvalidProductException("Số sao đánh giá phải từ 1 đến 5");

        if (string.IsNullOrWhiteSpace(request.Comment) || request.Comment.Length < 4)
            throw new InvalidProductException("Bình luận đánh giá phải có ít nhất 4 ký tự");

        // 3. Resolve user by Id or Email
        var user = await _unitOfWork.Users.GetByIdAsync(request.UserId)
            ?? await _unitOfWork.Users.GetByEmailAsync(request.UserId);

        var resolvedUserId = user?.Id ?? request.UserId;

        // 4. Prevent self-rating (shop owner rating their own shop)
        if (shop.OwnerUserId == resolvedUserId || shop.OwnerUserId == request.UserId)
            throw new InvalidOperationException("Bạn không thể đánh giá cửa hàng của chính mình");

        // 5. Create rating entity
        var shopRating = new ShopRating
        {
            ShopId = request.ShopId,
            UserId = resolvedUserId,
            Star = request.Star,
            Comment = request.Comment,
            IsApproved = true,
            CreatedAt = DateTime.UtcNow
        };

        try
        {
            await _unitOfWork.ShopRatings.AddAsync(shopRating);
            await _unitOfWork.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // If table doesn't exist or DB save failed, re-throw with user friendly message if self-rating / invalid
            if (ex.Message.Contains("relation") && ex.Message.Contains("does not exist"))
            {
                throw new InvalidOperationException("Hệ thống cơ sở dữ liệu đang cập nhật bảng Đánh giá Cửa hàng. Vui lòng thử lại sau giây lát.");
            }
            throw;
        }

        return new ShopRatingDto
        {
            Id = shopRating.Id,
            ShopId = shopRating.ShopId,
            UserId = shopRating.UserId,
            UserName = user?.FullName ?? user?.UserName ?? "Khách hàng",
            UserAvatar = user?.Avatar,
            Star = shopRating.Star,
            Comment = shopRating.Comment,
            CreatedAt = shopRating.CreatedAt
        };
    }
}
