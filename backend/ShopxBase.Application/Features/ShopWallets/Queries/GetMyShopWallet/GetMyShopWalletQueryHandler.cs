using MediatR;
using ShopxBase.Application.Features.ShopWallets.DTOs;
using ShopxBase.Application.Interfaces;
using ShopxBase.Domain.Entities;
using ShopxBase.Domain.Exceptions;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Application.Features.ShopWallets.Queries.GetMyShopWallet;

public class GetMyShopWalletQueryHandler : IRequestHandler<GetMyShopWalletQuery, ShopWalletDto?>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUserService;

    public GetMyShopWalletQueryHandler(
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUserService)
    {
        _unitOfWork = unitOfWork;
        _currentUserService = currentUserService;
    }

    public async Task<ShopWalletDto?> Handle(GetMyShopWalletQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw UnauthorizedUserException.UserIdNotFound();

        var shop = await _unitOfWork.Shops.FirstOrDefaultAsync(s => s.OwnerUserId == userId);
        if (shop == null) return null;

        var wallets = await _unitOfWork.ShopWallets.FindAsync(w => w.ShopId == shop.Id);
        var wallet = wallets.FirstOrDefault();

        if (wallet == null)
        {
            wallet = new ShopWallet
            {
                ShopId = shop.Id,
                AvailableBalance = 0,
                PendingBalance = 0,
                TotalWithdrawn = 0,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.ShopWallets.AddAsync(wallet);
            await _unitOfWork.SaveChangesAsync();
        }

        return new ShopWalletDto
        {
            Id = wallet.Id,
            ShopId = wallet.ShopId,
            AvailableBalance = wallet.AvailableBalance,
            PendingBalance = wallet.PendingBalance,
            TotalWithdrawn = wallet.TotalWithdrawn,
            BankName = wallet.BankName,
            BankAccountNumber = wallet.BankAccountNumber,
            BankAccountHolder = wallet.BankAccountHolder
        };
    }
}
