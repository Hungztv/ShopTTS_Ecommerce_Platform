using ShopxBase.Application.Features.ShopWallets.DTOs;
using ShopxBase.Domain.Entities;
using ShopxBase.Domain.Enums;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Application.Features.ShopWallets.Services;

public static class ShopWalletSettlementHelper
{
    /// <summary>
    /// Xử lý cập nhật Ví và Dòng tiền Escrow khi trạng thái đơn hàng thay đổi
    /// </summary>
    public static async Task ProcessOrderSettlementAsync(
        IUnitOfWork unitOfWork,
        Order order,
        int previousStatus,
        int newStatus)
    {
        if (previousStatus == newStatus) return;

        var orderDetails = (await unitOfWork.OrderDetails.FindAsync(od => od.OrderId == order.Id)).ToList();
        if (!orderDetails.Any()) return;

        var shopGroups = orderDetails
            .Where(d => d.ShopId > 0)
            .GroupBy(d => d.ShopId)
            .ToList();

        if (!shopGroups.Any()) return;

        // 1. Đơn hàng chuyển sang "Đã giao / Hoàn thành" (Status = 3) -> Giải ngân vào AvailableBalance
        if (newStatus == 3)
        {
            order.PaymentStatus = "2"; // Đánh dấu đã thanh toán (cả COD và online)

            foreach (var group in shopGroups)
            {
                var shopId = group.Key;
                var shopRevenue = group.Sum(d => d.Price * d.Quantity);
                if (shopRevenue <= 0) continue;

                var wallets = await unitOfWork.ShopWallets.FindAsync(w => w.ShopId == shopId);
                var wallet = wallets.FirstOrDefault();

                if (wallet == null)
                {
                    wallet = new ShopWallet
                    {
                        ShopId = shopId,
                        AvailableBalance = 0,
                        PendingBalance = 0,
                        TotalWithdrawn = 0,
                        CreatedAt = DateTime.UtcNow
                    };
                    await unitOfWork.ShopWallets.AddAsync(wallet);
                }

                // Kiểm tra xem đơn hàng này đã từng ghi nhận giao dịch OrderPayout cho shop chưa
                var existingPayouts = await unitOfWork.WalletTransactions.FindAsync(
                    t => t.ShopId == shopId && t.OrderId == order.Id && t.Type == WalletTransactionType.OrderPayout);

                if (!existingPayouts.Any())
                {
                    wallet.PendingBalance = Math.Max(0, wallet.PendingBalance - shopRevenue);
                    wallet.AvailableBalance += shopRevenue;
                    wallet.UpdatedAt = DateTime.UtcNow;
                    await unitOfWork.ShopWallets.UpdateAsync(wallet);

                    var tx = new WalletTransaction
                    {
                        ShopId = shopId,
                        OrderId = order.Id,
                        Amount = shopRevenue,
                        Type = WalletTransactionType.OrderPayout,
                        Description = $"Doanh thu từ đơn hàng #{order.OrderCode}",
                        CreatedAt = DateTime.UtcNow
                    };
                    await unitOfWork.WalletTransactions.AddAsync(tx);
                }
            }
        }
        // 2. Đơn hàng bị Hủy (Status = 4) -> Trừ tiền khỏi Tiền tạm giữ (PendingBalance)
        else if (newStatus == 4)
        {
            foreach (var group in shopGroups)
            {
                var shopId = group.Key;
                var shopRevenue = group.Sum(d => d.Price * d.Quantity);

                var wallets = await unitOfWork.ShopWallets.FindAsync(w => w.ShopId == shopId);
                var wallet = wallets.FirstOrDefault();

                if (wallet != null)
                {
                    wallet.PendingBalance = Math.Max(0, wallet.PendingBalance - shopRevenue);
                    wallet.UpdatedAt = DateTime.UtcNow;
                    await unitOfWork.ShopWallets.UpdateAsync(wallet);
                }
            }
        }
        // 4. Đơn hàng bị Hoàn tiền (Status = 5) theo phán quyết trọng tài hoặc đổi trả
        else if (newStatus == 5)
        {
            foreach (var group in shopGroups)
            {
                var shopId = group.Key;
                var shopRevenue = group.Sum(d => d.Price * d.Quantity);

                var wallets = await unitOfWork.ShopWallets.FindAsync(w => w.ShopId == shopId);
                var wallet = wallets.FirstOrDefault();

                if (wallet != null)
                {
                    if (previousStatus == 3)
                    {
                        wallet.AvailableBalance = Math.Max(0, wallet.AvailableBalance - shopRevenue);
                        wallet.UpdatedAt = DateTime.UtcNow;
                        await unitOfWork.ShopWallets.UpdateAsync(wallet);

                        var tx = new WalletTransaction
                        {
                            ShopId = shopId,
                            OrderId = order.Id,
                            Amount = -shopRevenue,
                            Type = WalletTransactionType.RefundDeduction,
                            Description = $"Khấu trừ hoàn tiền đơn hàng #{order.OrderCode}",
                            CreatedAt = DateTime.UtcNow
                        };
                        await unitOfWork.WalletTransactions.AddAsync(tx);
                    }
                    else
                    {
                        wallet.PendingBalance = Math.Max(0, wallet.PendingBalance - shopRevenue);
                        wallet.UpdatedAt = DateTime.UtcNow;
                        await unitOfWork.ShopWallets.UpdateAsync(wallet);
                    }
                }
            }
        }
        // 3. Đơn hàng mới vào quy trình (Status 1: Confirmed hoặc 2: Shipping)
        else if (newStatus == 1 || newStatus == 2)
        {
            foreach (var group in shopGroups)
            {
                var shopId = group.Key;
                var shopRevenue = group.Sum(d => d.Price * d.Quantity);

                var wallets = await unitOfWork.ShopWallets.FindAsync(w => w.ShopId == shopId);
                var wallet = wallets.FirstOrDefault();

                if (wallet == null)
                {
                    wallet = new ShopWallet
                    {
                        ShopId = shopId,
                        AvailableBalance = 0,
                        PendingBalance = shopRevenue,
                        TotalWithdrawn = 0,
                        CreatedAt = DateTime.UtcNow
                    };
                    await unitOfWork.ShopWallets.AddAsync(wallet);
                }
            }
        }
    }

    /// <summary>
    /// Đối soát toàn diện dòng tiền ví shop (Reconciliation):
    /// Quét toàn bộ đơn hàng thực tế của Shop để đảm bảo các đơn hoàn thành được cộng vào AvailableBalance
    /// và các đơn đang xử lý được tính vào PendingBalance (Escrow).
    /// </summary>
    public static async Task<ShopWalletDto> ReconcileAndGetWalletAsync(
        IUnitOfWork unitOfWork,
        int shopId)
    {
        var wallets = await unitOfWork.ShopWallets.FindAsync(w => w.ShopId == shopId);
        var wallet = wallets.FirstOrDefault();

        if (wallet == null)
        {
            wallet = new ShopWallet
            {
                ShopId = shopId,
                AvailableBalance = 0,
                PendingBalance = 0,
                TotalWithdrawn = 0,
                CreatedAt = DateTime.UtcNow
            };
            await unitOfWork.ShopWallets.AddAsync(wallet);
            await unitOfWork.SaveChangesAsync();
        }

        // Lấy tất cả OrderDetails của Shop này
        var shopDetails = (await unitOfWork.OrderDetails.FindAsync(od => od.ShopId == shopId)).ToList();
        var orderIds = shopDetails.Select(d => d.OrderId).Distinct().ToList();

        var existingTxs = (await unitOfWork.WalletTransactions.FindAsync(t => t.ShopId == shopId)).ToList();
        bool hasChanges = false;

        if (orderIds.Any())
        {
            var orders = (await unitOfWork.Orders.FindAsync(o => orderIds.Contains(o.Id) && !o.IsDeleted)).ToList();

            // 1. Quét các đơn đã giao thành công (Status = 3)
            var deliveredOrders = orders.Where(o => o.Status == 3).ToList();
            foreach (var order in deliveredOrders)
            {
                var hasPayout = existingTxs.Any(t => t.OrderId == order.Id && t.Type == WalletTransactionType.OrderPayout);
                if (!hasPayout)
                {
                    var shopRevenue = shopDetails
                        .Where(d => d.OrderId == order.Id)
                        .Sum(d => d.Price * d.Quantity);

                    if (shopRevenue > 0)
                    {
                        var payoutTx = new WalletTransaction
                        {
                            ShopId = shopId,
                            OrderId = order.Id,
                            Amount = shopRevenue,
                            Type = WalletTransactionType.OrderPayout,
                            Description = $"Doanh thu từ đơn hàng #{order.OrderCode}",
                            CreatedAt = order.UpdatedAt ?? order.CreatedAt
                        };

                        await unitOfWork.WalletTransactions.AddAsync(payoutTx);
                        existingTxs.Add(payoutTx);
                        hasChanges = true;
                    }
                }
            }

            // 2. Tính toán lại số dư khả dụng dựa trên tất cả giao dịch thực tế
            var totalPayouts = existingTxs.Where(t => t.Type == WalletTransactionType.OrderPayout).Sum(t => t.Amount);
            var totalWithdrawn = existingTxs.Where(t => t.Type == WalletTransactionType.Withdrawal).Sum(t => Math.Abs(t.Amount));
            var totalRefunds = existingTxs.Where(t => t.Type == WalletTransactionType.RefundDeduction).Sum(t => Math.Abs(t.Amount));

            var calculatedAvailable = Math.Max(0, totalPayouts - totalWithdrawn - totalRefunds);
            if (wallet.AvailableBalance != calculatedAvailable)
            {
                wallet.AvailableBalance = calculatedAvailable;
                hasChanges = true;
            }

            if (wallet.TotalWithdrawn != totalWithdrawn)
            {
                wallet.TotalWithdrawn = totalWithdrawn;
                hasChanges = true;
            }

            // 3. Tính toán lại PendingBalance (tiền đang tạm giữ Escrow) từ các đơn đang xử lý (Status 0, 1, 2)
            var inProgressOrders = orders.Where(o => o.Status >= 0 && o.Status <= 2).ToList();
            decimal expectedPending = 0;
            foreach (var ipOrder in inProgressOrders)
            {
                expectedPending += shopDetails
                    .Where(d => d.OrderId == ipOrder.Id)
                    .Sum(d => d.Price * d.Quantity);
            }

            if (wallet.PendingBalance != expectedPending)
            {
                wallet.PendingBalance = expectedPending;
                hasChanges = true;
            }
        }

        if (hasChanges)
        {
            wallet.UpdatedAt = DateTime.UtcNow;
            await unitOfWork.ShopWallets.UpdateAsync(wallet);
            await unitOfWork.SaveChangesAsync();
        }

        // Lấy danh sách giao dịch sắp xếp mới nhất lên đầu
        var txDtos = existingTxs
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .Select(t => new WalletTransactionDto
            {
                Id = t.Id,
                ShopId = t.ShopId,
                OrderId = t.OrderId,
                Amount = t.Amount,
                Type = t.Type,
                Description = t.Description,
                CreatedAt = t.CreatedAt
            })
            .ToList();

        return new ShopWalletDto
        {
            Id = wallet.Id,
            ShopId = wallet.ShopId,
            AvailableBalance = wallet.AvailableBalance,
            PendingBalance = wallet.PendingBalance,
            TotalWithdrawn = wallet.TotalWithdrawn,
            BankName = wallet.BankName,
            BankAccountNumber = wallet.BankAccountNumber,
            BankAccountHolder = wallet.BankAccountHolder,
            Transactions = txDtos
        };
    }
}
