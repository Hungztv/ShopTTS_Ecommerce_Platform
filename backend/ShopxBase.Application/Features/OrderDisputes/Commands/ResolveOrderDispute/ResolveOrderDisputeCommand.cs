using MediatR;

namespace ShopxBase.Application.Features.OrderDisputes.Commands.ResolveOrderDispute;

public record ResolveOrderDisputeCommand(
    int DisputeId,
    string Action, // "Refund" or "ReleaseToSeller"
    string? ResolutionNote
) : IRequest<bool>;
