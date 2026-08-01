using MediatR;
using Microsoft.AspNetCore.Identity;
using ShopxBase.Application.DTOs.Auth;
using ShopxBase.Application.Interfaces;
using ShopxBase.Domain.Entities;
using ShopxBase.Domain.Exceptions;

namespace ShopxBase.Application.Features.Auth.Commands.Register;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, LoginResponseDto>
{
    private readonly UserManager<AppUser> _userManager;
    private readonly ISupabaseAuthService _supabaseAuthService;

    public RegisterCommandHandler(
        UserManager<AppUser> userManager,
        ISupabaseAuthService supabaseAuthService)
    {
        _userManager = userManager;
        _supabaseAuthService = supabaseAuthService;
    }

    public async Task<LoginResponseDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        // 1) Chặn trùng Email ở local
        var existingUserByEmail = await _userManager.FindByEmailAsync(request.Email);
        if (existingUserByEmail != null)
            throw new UserAlreadyExistsException($"Email '{request.Email}' đã được sử dụng");

        // 2) Đăng ký trên Supabase (nguồn chính)
        var metadata = new Dictionary<string, object>
        {
            { "full_name", request.FullName ?? request.Email },
            { "phone", request.PhoneNumber ?? string.Empty }
        };

        var supabaseResult = await _supabaseAuthService.SignUpAsync(request.Email, request.Password, metadata);
        if (!supabaseResult.Success || supabaseResult.User == null)
        {
            var errorMsg = supabaseResult.ErrorDescription ?? supabaseResult.Error ?? "Đăng ký Supabase thất bại";

            // Xử lý lỗi domain không được phép
            if (errorMsg.Contains("invalid", StringComparison.OrdinalIgnoreCase) &&
                errorMsg.Contains("email", StringComparison.OrdinalIgnoreCase))
            {
                var domain = request.Email.Split('@').LastOrDefault();
                throw new InvalidOperationException(
                    $"Email với domain '{domain}' chưa được hỗ trợ. Vui lòng sử dụng email từ các nhà cung cấp phổ biến (Gmail, Outlook, v.v.) hoặc liên hệ quản trị viên để thêm domain này vào danh sách cho phép."
                );
            }

            throw new InvalidOperationException(errorMsg);
        }

        var supabaseUserId = supabaseResult.User.Id;

        // 3) Smart retry: đợi trigger sync vào AspNetUsers
        AppUser? localUser = null;
        for (var i = 0; i < 5; i++)
        {
            localUser = await _userManager.FindByIdAsync(supabaseUserId);
            if (localUser != null) break;
            await Task.Delay(500, cancellationToken);
        }

        // 4) Fail-safe: nếu trigger chưa tạo thì tự tạo user local (ID phải khớp Supabase)
        if (localUser == null)
        {
            // Double-check sau khi chờ trigger
            var recheckUser = await _userManager.FindByEmailAsync(request.Email);
            if (recheckUser != null)
            {
                localUser = recheckUser;
            }
            else
            {
                localUser = new AppUser
                {
                    Id = supabaseUserId,
                    UserName = request.Email,
                    Email = request.Email,
                    FullName = request.FullName ?? request.Email,
                    PhoneNumber = request.PhoneNumber,
                    Occupation = "Customer",
                    Address = string.Empty,
                    Avatar = string.Empty,
                    token = string.Empty,
                    CreatedAt = DateTime.UtcNow,
                    EmailConfirmed = true
                };

                var createResult = await _userManager.CreateAsync(localUser);
                if (!createResult.Succeeded)
                {
                    var errors = string.Join(", ", createResult.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Tạo user local thất bại: {errors}");
                }
            }
        }

        // 5) Gán role Customer
        if (!await _userManager.IsInRoleAsync(localUser, "Customer"))
        {
            var roleResult = await _userManager.AddToRoleAsync(localUser, "Customer");
            if (!roleResult.Succeeded)
            {
                var errors = string.Join(", ", roleResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Thêm vai trò thất bại: {errors}");
            }
        }

        // 6) Trả về token từ Supabase + thông tin user local
        var roles = await _userManager.GetRolesAsync(localUser);
        var expiresIn = supabaseResult.ExpiresIn ?? 3600;

        return new LoginResponseDto
        {
            AccessToken = supabaseResult.AccessToken!,
            RefreshToken = supabaseResult.RefreshToken!,
            ExpiresAt = DateTime.UtcNow.AddSeconds(expiresIn),
            TokenType = supabaseResult.TokenType ?? "Bearer",
            User = new UserInfoDto
            {
                Id = localUser.Id,
                UserName = localUser.UserName!,
                Email = localUser.Email!,
                FullName = localUser.FullName,
                Avatar = localUser.Avatar,
                PhoneNumber = localUser.PhoneNumber,
                Roles = roles
            }
        };
    }
}
