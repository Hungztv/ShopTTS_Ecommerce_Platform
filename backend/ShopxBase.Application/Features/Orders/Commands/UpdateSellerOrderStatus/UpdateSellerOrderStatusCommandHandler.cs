using MediatR;
using ShopxBase.Application.Interfaces;
using ShopxBase.Domain.Exceptions;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Application.Features.Orders.Commands.UpdateSellerOrderStatus;

public class UpdateSellerOrderStatusCommandHandler : IRequestHandler<UpdateSellerOrderStatusCommand, bool>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public UpdateSellerOrderStatusCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<bool> Handle(UpdateSellerOrderStatusCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw UnauthorizedUserException.UserIdNotFound();

        var shop = await _unitOfWork.Shops.FirstOrDefaultAsync(s => s.OwnerUserId == userId && !s.IsDeleted);
        if (shop == null)
            throw new ShopNotFoundException("Bạn chưa có shop");

        // Get order with details
        var order = await _unitOfWork.OrderRepository.GetWithDetailsAsync(request.OrderId);
        if (order == null)
            throw OrderNotFoundException.WithMessage("Không tìm thấy đơn hàng");

        // Verify this seller's shop has products in this order
        var hasShopItems = order.OrderDetails.Any(d => d.ShopId == shop.Id);
        if (!hasShopItems)
            throw OrderNotFoundException.WithMessage("Đơn hàng không chứa sản phẩm của shop bạn");

        // Validate status transition: only allow 0→1→2→3
        // Cannot cancel (→4) if already confirmed (>= 1 for seller, but allow cancel if still pending)
        var currentStatus = order.Status;
        var newStatus = request.NewStatus;

        // Validate allowed transitions
        bool isValidTransition = (currentStatus, newStatus) switch
        {
            (0, 1) => true,  // Pending → Confirmed
            (1, 2) => true,  // Confirmed → Shipping
            (2, 3) => true,  // Shipping → Delivered
            (0, 4) => true,  // Pending → Cancelled (seller can cancel pending orders)
            _ => false
        };

        if (!isValidTransition)
            throw new InvalidOrderException($"Không thể chuyển trạng thái từ '{order.GetStatusText()}' sang trạng thái mới");

        // Update status — need to re-fetch with tracking
        var orderToUpdate = await _unitOfWork.Orders.GetByIdAsync(request.OrderId);
        var prevStatus = orderToUpdate.Status;
        orderToUpdate.Status = newStatus;

        await ShopxBase.Application.Features.ShopWallets.Services.ShopWalletSettlementHelper
            .ProcessOrderSettlementAsync(_unitOfWork, orderToUpdate, prevStatus, newStatus);

        await _unitOfWork.Orders.UpdateAsync(orderToUpdate);
        await Task.Run(() => _unitOfWork.SaveChanges());

        return true;
    }
}
