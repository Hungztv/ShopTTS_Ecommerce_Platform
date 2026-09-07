using MediatR;
using ShopxBase.Application.Features.OrderDisputes.DTOs;

namespace ShopxBase.Application.Features.OrderDisputes.Queries.GetEscrowStats;

public record GetEscrowStatsQuery : IRequest<EscrowStatsDto>;
