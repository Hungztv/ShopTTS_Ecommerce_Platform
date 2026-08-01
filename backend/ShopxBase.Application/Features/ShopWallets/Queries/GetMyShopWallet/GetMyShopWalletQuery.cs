using MediatR;
using ShopxBase.Application.Features.ShopWallets.DTOs;

namespace ShopxBase.Application.Features.ShopWallets.Queries.GetMyShopWallet;

public record GetMyShopWalletQuery : IRequest<ShopWalletDto?>;
