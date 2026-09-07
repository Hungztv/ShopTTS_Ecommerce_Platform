using MediatR;
using ShopxBase.Application.Features.ShopWallets.DTOs;
using ShopxBase.Application.Features.ShopWallets.Services;
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
        var shop = await _unitOfWork.Shops.GetByIdAsync(request.ShopId);
        if (shop == null) return null;

        return await ShopWalletSettlementHelper.ReconcileAndGetWalletAsync(_unitOfWork, shop.Id);
    }
}
