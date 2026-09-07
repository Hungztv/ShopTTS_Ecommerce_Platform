using MediatR;
using ShopxBase.Application.Features.ShopWallets.DTOs;
using ShopxBase.Application.Features.ShopWallets.Services;
using ShopxBase.Application.Interfaces;
using ShopxBase.Domain.Entities;
using ShopxBase.Domain.Enums;
using ShopxBase.Domain.Exceptions;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Application.Features.ShopWallets.Commands.RequestWithdrawal;

public class RequestWithdrawalCommandHandler : IRequestHandler<RequestWithdrawalCommand, ShopWalletDto?>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public RequestWithdrawalCommandHandler(
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<ShopWalletDto?> Handle(RequestWithdrawalCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw UnauthorizedUserException.UserIdNotFound();

        var shop = await _unitOfWork.Shops.FirstOrDefaultAsync(s => s.OwnerUserId == userId && !s.IsDeleted);
        if (shop == null)
            throw new ShopNotFoundException("Bạn chưa có shop");

        if (request.Amount <= 0)
            throw new InvalidOrderException("Số tiền rút phải lớn hơn 0Đ");

        // Reconcile first to ensure up-to-date balance
        await ShopWalletSettlementHelper.ReconcileAndGetWalletAsync(_unitOfWork, shop.Id);

        var wallets = await _unitOfWork.ShopWallets.FindAsync(w => w.ShopId == shop.Id);
        var wallet = wallets.FirstOrDefault()
            ?? throw new InvalidOrderException("Ví của Shop không tồn tại");

        if (wallet.AvailableBalance < request.Amount)
        {
            throw new InvalidOrderException($"Số dư khả dụng ({wallet.AvailableBalance:N0}đ) không đủ để rút {request.Amount:N0}đ");
        }

        // Deduct available balance
        wallet.AvailableBalance -= request.Amount;
        wallet.TotalWithdrawn += request.Amount;

        if (!string.IsNullOrWhiteSpace(request.BankName)) wallet.BankName = request.BankName;
        if (!string.IsNullOrWhiteSpace(request.BankAccountNumber)) wallet.BankAccountNumber = request.BankAccountNumber;
        if (!string.IsNullOrWhiteSpace(request.BankAccountHolder)) wallet.BankAccountHolder = request.BankAccountHolder;

        wallet.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.ShopWallets.UpdateAsync(wallet);

        // Record WithdrawalRequest
        var withdrawal = new WithdrawalRequest
        {
            ShopId = shop.Id,
            Amount = request.Amount,
            BankName = wallet.BankName ?? "Ngân hàng mặc định",
            BankAccountNumber = wallet.BankAccountNumber ?? "0000000000",
            BankAccountHolder = wallet.BankAccountHolder ?? shop.Name,
            Status = WithdrawalStatus.Approved,
            ProcessedAt = DateTime.UtcNow,
            Note = "Rút tiền về tài khoản ngân hàng thành công",
            CreatedAt = DateTime.UtcNow
        };
        await _unitOfWork.WithdrawalRequests.AddAsync(withdrawal);

        // Record WalletTransaction
        var tx = new WalletTransaction
        {
            ShopId = shop.Id,
            Amount = request.Amount,
            Type = WalletTransactionType.Withdrawal,
            Description = $"Rút tiền về TK {wallet.BankName ?? "Ngân hàng"} ({wallet.BankAccountNumber ?? "—"})",
            CreatedAt = DateTime.UtcNow
        };
        await _unitOfWork.WalletTransactions.AddAsync(tx);

        await _unitOfWork.SaveChangesAsync();

        return await ShopWalletSettlementHelper.ReconcileAndGetWalletAsync(_unitOfWork, shop.Id);
    }
}
