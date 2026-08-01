using MediatR;
using ShopxBase.Application.Features.ShopWallets.DTOs;

namespace ShopxBase.Application.Features.ShopWallets.Queries.GetShopWallet;

public record GetShopWalletQuery(int ShopId) : IRequest<ShopWalletDto?>;
