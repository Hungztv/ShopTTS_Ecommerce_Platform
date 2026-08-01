using MediatR;
using AutoMapper;
using ShopxBase.Domain.Interfaces;
using ShopxBase.Application.DTOs.Product;
using ShopxBase.Domain.Exceptions;

namespace ShopxBase.Application.Features.Products.Queries.GetProductById;

public class GetProductByIdQueryHandler : IRequestHandler<GetProductByIdQuery, ProductDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public GetProductByIdQueryHandler(IUnitOfWork unitOfWork, IMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<ProductDto> Handle(GetProductByIdQuery request, CancellationToken cancellationToken)
    {
        // 1. Get product by id
        var product = await _unitOfWork.ProductRepository.GetWithDetailsAsync(request.Id);
        if (product == null)
            throw new InvalidProductException($"Sản phẩm với Id {request.Id} không tồn tại");

        // 2. Map entity to DTO
        var productDto = _mapper.Map<ProductDto>(product);

        // 3. Set calculated fields
        productDto.IsInStock = product.IsInStock();

        return productDto;
    }
}
