using MediatR;
using AutoMapper;
using ShopxBase.Domain.Interfaces;
using ShopxBase.Domain.Exceptions;
using ShopxBase.Application.DTOs.Order;

namespace ShopxBase.Application.Features.Orders.Commands.UpdateOrderStatus;

public class UpdateOrderStatusCommandHandler : IRequestHandler<UpdateOrderStatusCommand, OrderDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public UpdateOrderStatusCommandHandler(IUnitOfWork unitOfWork, IMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<OrderDto> Handle(UpdateOrderStatusCommand request, CancellationToken cancellationToken)
    {
        // 1. Get order
        var order = await _unitOfWork.Orders.GetByIdAsync(request.OrderId);

        if (order == null)
        {
            throw OrderNotFoundException.ById(request.OrderId);
        }

        // 2. Validate status transition
        ValidateStatusTransition(order.Status, request.NewStatus);

        // 3. Special handling for cancellation
        if (request.NewStatus == 4) // Cancelled
        {
            if (!order.CanCancel())
            {
                throw new InvalidOrderException(
                    $"Không thể hủy đơn hàng ở trạng thái '{order.GetStatusText()}'");
            }

            // Restore product stock if order is being cancelled
            await RestoreProductStockAsync(order);
        }

        // 4. Update status & settle wallet escrow
        var previousStatus = order.Status;
        order.Status = request.NewStatus;

        await ShopxBase.Application.Features.ShopWallets.Services.ShopWalletSettlementHelper
            .ProcessOrderSettlementAsync(_unitOfWork, order, previousStatus, request.NewStatus);

        // 5. Save changes
        await _unitOfWork.Orders.UpdateAsync(order);
        await _unitOfWork.SaveChangesAsync();

        // 6. Return updated order
        var orderDto = _mapper.Map<OrderDto>(order);
        return orderDto;
    }

    private void ValidateStatusTransition(int currentStatus, int newStatus)
    {
        // Define valid transitions
        // 0: Pending → can go to 1 (Confirmed) or 4 (Cancelled)
        // 1: Confirmed → can go to 2 (Shipping) or 4 (Cancelled)
        // 2: Shipping → can go to 3 (Completed)
        // 3: Completed → terminal state
        // 4: Cancelled → terminal state

        var validTransitions = new Dictionary<int, int[]>
        {
            { 0, new[] { 1, 4 } },       // Pending → Confirmed or Cancelled
            { 1, new[] { 2, 4 } },       // Confirmed → Shipping or Cancelled
            { 2, new[] { 3 } },          // Shipping → Completed
            { 3, Array.Empty<int>() },   // Completed → none
            { 4, Array.Empty<int>() }    // Cancelled → none
        };

        if (!validTransitions.ContainsKey(currentStatus))
        {
            throw new InvalidOrderException($"Trạng thái đơn hàng không hợp lệ: {currentStatus}");
        }

        if (!validTransitions[currentStatus].Contains(newStatus))
        {
            throw new InvalidOrderException(
                $"Không thể chuyển từ trạng thái {currentStatus} sang {newStatus}");
        }
    }

    private async Task RestoreProductStockAsync(Domain.Entities.Order order)
    {
        // Get order with details
        var orderWithDetails = await _unitOfWork.OrderRepository.GetWithDetailsAsync(order.Id);

        if (orderWithDetails?.OrderDetails == null)
            return;

        foreach (var detail in orderWithDetails.OrderDetails)
        {
            var product = await _unitOfWork.Products.GetByIdAsync(detail.ProductId);
            if (product != null)
            {
                product.RestoreStock(detail.Quantity);
                await _unitOfWork.Products.UpdateAsync(product);
            }
        }
    }
}
