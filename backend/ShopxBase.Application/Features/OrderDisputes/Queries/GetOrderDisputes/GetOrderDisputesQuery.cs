using MediatR;
using ShopxBase.Application.Features.OrderDisputes.DTOs;

namespace ShopxBase.Application.Features.OrderDisputes.Queries.GetOrderDisputes;

public record GetOrderDisputesQuery : IRequest<List<OrderDisputeDto>>;
