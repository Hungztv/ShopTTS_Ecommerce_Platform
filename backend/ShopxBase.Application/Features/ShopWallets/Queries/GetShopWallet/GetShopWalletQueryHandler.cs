using MediatR;
using ShopxBase.Application.Features.ShopWallets.DTOs;
using ShopxBase.Domain.Entities;
using ShopxBase.Domain.Interfaces;

namespace ShopxBase.Application.Features.ShopWallets.Queries.GetShopWallet;

public class GetShopWalletQueryHandler : IRequestHandler<GetShopWalletQuery, ShopWalletDto?>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetShopWalletQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ShopWalletDto?> Handle(GetShopWalletQuery request, CancellationToken cancellationToken)
    {
        var wallets = await _unitOfWork.ShopWallets.FindAsync(w => w.ShopId == request.ShopId);
        var wallet = wallets.FirstOrDefault();

        if (wallet == null)
        {
            // Auto create wallet for the shop if not exists
            var shop = await _unitOfWork.Shops.GetByIdAsync(request.ShopId);
            if (shop == null) return null;

            wallet = new ShopWallet
            {
                ShopId = request.ShopId,
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
