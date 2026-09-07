using MediatR;
using ShopxBase.Application.Features.ShopWallets.DTOs;
using ShopxBase.Application.Interfaces;
using ShopxBase.Domain.Entities;
using ShopxBase.Domain.Exceptions;
using ShopxBase.Domain.Interfaces;

using ShopxBase.Application.Features.ShopWallets.Services;

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

        return await ShopWalletSettlementHelper.ReconcileAndGetWalletAsync(_unitOfWork, shop.Id);
    }
}
