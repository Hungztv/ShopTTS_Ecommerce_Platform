using MediatR;
using ShopxBase.Application.Features.OrderDisputes.DTOs;
using ShopxBase.Application.Interfaces;
using ShopxBase.Domain.Entities;
using ShopxBase.Domain.Enums;
using ShopxBase.Domain.Exceptions;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Application.Features.OrderDisputes.Commands.CreateOrderDispute;

public class CreateOrderDisputeCommandHandler : IRequestHandler<CreateOrderDisputeCommand, OrderDisputeDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public CreateOrderDisputeCommandHandler(IUnitOfWork unitOfWork, ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<OrderDisputeDto> Handle(CreateOrderDisputeCommand request, CancellationToken cancellationToken)
    {
        var order = await _unitOfWork.Orders.GetByIdAsync(request.OrderId);
        if (order == null)
            throw OrderNotFoundException.ById(request.OrderId);

        // Check if there is already an active dispute for this order
        var existingDisputes = await _unitOfWork.OrderDisputes.FindAsync(
            d => d.OrderId == request.OrderId && !d.IsDeleted && d.Status <= DisputeStatus.AdminIntervened);

        if (existingDisputes.Any())
            throw new InvalidOrderException($"Đơn hàng #{order.OrderCode} đã có khiếu nại đang được xử lý");

        var currentUserId = _currentUserService.UserId;
        var userId = !string.IsNullOrEmpty(currentUserId) ? currentUserId : order.UserId;

        var dispute = new OrderDispute
        {
            OrderId = order.Id,
            UserId = userId,
            Reason = request.Reason,
            EvidenceUrls = request.EvidenceUrls,
            Status = DisputeStatus.ShopRejected, // Mặc định mở hồ sơ để chuyển sang Sàn trọng tài
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.OrderDisputes.AddAsync(dispute);
        await _unitOfWork.SaveChangesAsync();

        // Load details for DTO
        var orderDetails = (await _unitOfWork.OrderDetails.FindAsync(od => od.OrderId == order.Id)).ToList();
        var firstDetail = orderDetails.FirstOrDefault();
        var user = !string.IsNullOrEmpty(userId) ? await _unitOfWork.Users.GetByIdAsync(userId) : null;

        var items = orderDetails.Select(od => new DisputeItemProductDto
        {
            ProductId = od.ProductId,
            ProductName = od.ProductName,
            ProductImage = od.ProductImage,
            Price = od.Price,
            Quantity = od.Quantity
        }).ToList();

        return new OrderDisputeDto
        {
            Id = dispute.Id,
            OrderId = dispute.OrderId,
            OrderCode = order.OrderCode,
            UserId = userId,
            CustomerName = user?.FullName ?? order.Name ?? "Khách hàng",
            CustomerEmail = user?.Email ?? order.Email ?? "",
            CustomerPhone = order.PhoneNumber ?? "",
            ShopId = firstDetail?.ShopId ?? 0,
            ShopName = firstDetail?.ShopName ?? "Cửa hàng",
            Amount = order.Total,
            Reason = dispute.Reason,
            EvidenceUrls = dispute.EvidenceUrls,
            Status = dispute.Status,
            ResolutionNote = dispute.ResolutionNote,
            CreatedAt = dispute.CreatedAt,
            ResolvedAt = dispute.ResolvedAt,
            Items = items
        };
    }
}
