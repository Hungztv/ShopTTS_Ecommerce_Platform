using MediatR;
using ShopxBase.Application.Features.ShopWallets.DTOs;

namespace ShopxBase.Application.Features.ShopWallets.Commands.RequestWithdrawal;

public record RequestWithdrawalCommand(
    decimal Amount,
    string? BankName = null,
    string? BankAccountNumber = null,
    string? BankAccountHolder = null
) : IRequest<ShopWalletDto?>;
