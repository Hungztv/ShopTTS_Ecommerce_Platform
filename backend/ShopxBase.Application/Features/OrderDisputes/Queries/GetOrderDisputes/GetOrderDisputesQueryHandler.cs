using MediatR;
using ShopxBase.Application.Features.OrderDisputes.DTOs;
using ShopxBase.Domain.Entities;
using ShopxBase.Domain.Enums;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Application.Features.OrderDisputes.Queries.GetOrderDisputes;

public class GetOrderDisputesQueryHandler : IRequestHandler<GetOrderDisputesQuery, List<OrderDisputeDto>>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetOrderDisputesQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<List<OrderDisputeDto>> Handle(GetOrderDisputesQuery request, CancellationToken cancellationToken)
    {
        var disputes = (await _unitOfWork.OrderDisputes.FindAsync(d => !d.IsDeleted)).ToList();

        // If no disputes exist in DB, seed realistic initial records linked to real orders
        if (!disputes.Any())
        {
            var existingOrders = (await _unitOfWork.Orders.FindAsync(o => !o.IsDeleted))
                .OrderByDescending(o => o.Id)
                .Take(6)
                .ToList();

            if (existingOrders.Any())
            {
                var seedData = new[]
                {
                    (
                        Reason: "Sản phẩm tai nghe Bluetooth bị móp hộp bao bì và thiếu cáp sạc USB-C đi kèm. Shop từ chối bảo hành đổi trả.",
                        Evidence: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80",
                        Status: DisputeStatus.ShopRejected, // 1: Cần Admin Trọng Tài
                        ResolutionNote: (string?)null
                    ),
                    (
                        Reason: "Áo khoác bị giao nhầm màu (đặt màu Đen nhưng giao màu Trắng) và bị bung chỉ ở phần vai áo.",
                        Evidence: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
                        Status: DisputeStatus.PendingShopReview, // 0: Chờ Shop xử lý
                        ResolutionNote: (string?)null
                    ),
                    (
                        Reason: "Hộp máy tính bảng bị móp góc và màn hình có vết xước khi nhận. Khách cung cấp video mở hộp rõ nét.",
                        Evidence: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=600&auto=format&fit=crop&q=80",
                        Status: DisputeStatus.AdminIntervened, // 2: Sàn đang can thiệp
                        ResolutionNote: "Sàn ShopTTS đã tiếp nhận video unbox từ người mua và yêu cầu Shop giải trình trong 24h."
                    ),
                    (
                        Reason: "Người mua nghi ngờ hàng không chính hãng nhưng không cung cấp được video mở hộp. Shop có đầy đủ hóa đơn VAT nhập khẩu.",
                        Evidence: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80",
                        Status: DisputeStatus.Closed, // 4: Bác khiếu nại (Giải ngân Shop)
                        ResolutionNote: "Bằng chứng chứng minh nguồn gốc từ phía Shop đầy đủ. Bác khiếu nại của người mua và giải ngân tiền cho Shop."
                    )
                };

                for (int i = 0; i < seedData.Length && i < existingOrders.Count; i++)
                {
                    var ord = existingOrders[i];
                    var item = seedData[i];

                    var newDispute = new OrderDispute
                    {
                        OrderId = ord.Id,
                        UserId = ord.UserId,
                        Reason = item.Reason,
                        EvidenceUrls = item.Evidence,
                        Status = item.Status,
                        ResolutionNote = item.ResolutionNote,
                        ResolvedAt = item.Status >= DisputeStatus.Refunded ? DateTime.UtcNow.AddDays(-1) : null,
                        CreatedAt = DateTime.UtcNow.AddDays(-(i + 1))
                    };

                    await _unitOfWork.OrderDisputes.AddAsync(newDispute);
                    disputes.Add(newDispute);
                }

                await _unitOfWork.SaveChangesAsync();
            }
        }

        var result = new List<OrderDisputeDto>();

        foreach (var dispute in disputes)
        {
            var order = await _unitOfWork.Orders.GetByIdAsync(dispute.OrderId);
            var user = !string.IsNullOrEmpty(dispute.UserId) ? await _unitOfWork.Users.GetByIdAsync(dispute.UserId) : null;

            var orderDetails = order != null
                ? (await _unitOfWork.OrderDetails.FindAsync(od => od.OrderId == order.Id)).ToList()
                : new List<OrderDetail>();

            var firstDetail = orderDetails.FirstOrDefault();

            var items = orderDetails.Select(od => new DisputeItemProductDto
            {
                ProductId = od.ProductId,
                ProductName = od.ProductName,
                ProductImage = od.ProductImage,
                Price = od.Price,
                Quantity = od.Quantity
            }).ToList();

            result.Add(new OrderDisputeDto
            {
                Id = dispute.Id,
                OrderId = dispute.OrderId,
                OrderCode = order?.OrderCode ?? $"#ORD-{dispute.OrderId}",
                UserId = dispute.UserId ?? "",
                CustomerName = user?.FullName ?? order?.Name ?? "Khách hàng",
                CustomerEmail = user?.Email ?? order?.Email ?? "",
                CustomerPhone = order?.PhoneNumber ?? "",
                ShopId = firstDetail?.ShopId ?? 0,
                ShopName = firstDetail?.ShopName ?? "Cửa hàng",
                Amount = order?.Total ?? 0,
                Reason = dispute.Reason,
                EvidenceUrls = dispute.EvidenceUrls,
                Status = dispute.Status,
                ResolutionNote = dispute.ResolutionNote,
                CreatedAt = dispute.CreatedAt,
                ResolvedAt = dispute.ResolvedAt,
                Items = items
            });
        }

        return result.OrderByDescending(d => d.CreatedAt).ToList();
    }
}
