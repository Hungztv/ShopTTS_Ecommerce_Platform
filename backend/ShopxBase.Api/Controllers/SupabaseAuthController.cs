using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShopxBase.Application.DTOs.Auth;
using ShopxBase.Application.Interfaces;
using ShopxBase.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;

namespace ShopxBase.Api.Controllers;

/// <summary>
/// Controller for Supabase Authentication
/// Proxies authentication requests to Supabase Auth API
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SupabaseAuthController : ControllerBase
{
    private readonly ISupabaseAuthService _authService;
    private readonly ILogger<SupabaseAuthController> _logger;
    private readonly UserManager<AppUser> _userManager;
    private readonly IJwtTokenService _jwtTokenService;

    public SupabaseAuthController(
        ISupabaseAuthService authService,
        ILogger<SupabaseAuthController> logger,
        UserManager<AppUser> userManager,
        IJwtTokenService jwtTokenService)
    {
        _authService = authService;
        _logger = logger;
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
    }

    /// <summary>
    /// Sign up with email and password
    /// </summary>
    [HttpPost("signup")]
    [AllowAnonymous]
    public async Task<IActionResult> SignUp([FromBody] SupabaseSignUpRequest request)
    {
        if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest(new { success = false, message = "Email và mật khẩu là bắt buộc" });
        }

        // Chặn trùng email ở local trước khi gọi Supabase để tránh lỗi 23505 từ trigger
        var existingByEmail = await _userManager.FindByEmailAsync(request.Email);
        if (existingByEmail != null)
        {
            return Conflict(new { success = false, error = "email_exists", message = "Email đã được sử dụng" });
        }

        var metadata = new Dictionary<string, object>();
        if (!string.IsNullOrEmpty(request.FullName))
            metadata["full_name"] = request.FullName;
        if (!string.IsNullOrEmpty(request.Phone))
            metadata["phone"] = request.Phone;

        var result = await _authService.SignUpAsync(request.Email, request.Password, metadata);

        if (result.Success)
        {
            return Ok(new
            {
                success = true,
                message = result.Message,
                accessToken = result.AccessToken,
                refreshToken = result.RefreshToken,
                expiresIn = result.ExpiresIn,
                user = result.User
            });
        }

        // Xử lý lỗi domain email không được phép
        var errorMsg = result.ErrorDescription ?? result.Error ?? "Đăng ký thất bại";
        if (errorMsg.Contains("invalid", StringComparison.OrdinalIgnoreCase) &&
            errorMsg.Contains("email", StringComparison.OrdinalIgnoreCase))
        {
            var domain = request.Email.Split('@').LastOrDefault();
            return BadRequest(new
            {
                success = false,
                error = "email_domain_not_allowed",
                message = $"Email với domain '{domain}' chưa được hỗ trợ. Vui lòng sử dụng email từ các nhà cung cấp phổ biến (Gmail, Outlook, v.v.) hoặc liên hệ quản trị viên."
            });
        }

        return BadRequest(new
        {
            success = false,
            error = result.Error,
            message = errorMsg
        });
    }

    /// <summary>
    /// Sign in with email and password
    /// </summary>
    [HttpPost("signin")]
    [AllowAnonymous]
    public async Task<IActionResult> SignIn([FromBody] SupabaseSignInRequest request)
    {
        if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest(new { success = false, message = "Email và mật khẩu là bắt buộc" });
        }

        var result = await _authService.SignInWithPasswordAsync(request.Email, request.Password);

        if (result.Success)
        {
            var appRoles = await ResolveAppRolesAsync(result.User);
            var appAccessToken = await CreateAppAccessTokenAsync(result.User, appRoles);

            return Ok(new
            {
                success = true,
                message = result.Message,
                accessToken = appAccessToken ?? result.AccessToken,
                supabaseAccessToken = result.AccessToken,
                appAccessToken,
                refreshToken = result.RefreshToken,
                expiresIn = result.ExpiresIn,
                tokenType = result.TokenType,
                user = result.User,
                appRoles
            });
        }

        return Unauthorized(new
        {
            success = false,
            error = result.Error,
            message = result.ErrorDescription
        });
    }

    /// <summary>
    /// Refresh access token
    /// </summary>
    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> RefreshToken([FromBody] SupabaseRefreshTokenRequest request)
    {
        if (string.IsNullOrEmpty(request.RefreshToken))
        {
            return BadRequest(new { success = false, message = "Refresh token là bắt buộc" });
        }

        var result = await _authService.RefreshTokenAsync(request.RefreshToken);

        if (result.Success)
        {
            var appRoles = await ResolveAppRolesAsync(result.User);
            var appAccessToken = await CreateAppAccessTokenAsync(result.User, appRoles);

            return Ok(new
            {
                success = true,
                message = result.Message,
                accessToken = appAccessToken ?? result.AccessToken,
                supabaseAccessToken = result.AccessToken,
                appAccessToken,
                refreshToken = result.RefreshToken,
                expiresIn = result.ExpiresIn,
                user = result.User,
                appRoles
            });
        }

        return Unauthorized(new
        {
            success = false,
            error = result.Error,
            message = result.ErrorDescription
        });
    }

    /// <summary>
    /// Sign out user
    /// </summary>
    [HttpPost("signout")]
    [Authorize]
    public async Task<IActionResult> SignOutUser()
    {
        var accessToken = GetAccessToken();
        if (string.IsNullOrEmpty(accessToken))
        {
            return BadRequest(new { success = false, message = "Access token không hợp lệ" });
        }

        var result = await _authService.SignOutAsync(accessToken);

        if (result)
        {
            return Ok(new { success = true, message = "Đăng xuất thành công" });
        }

        return BadRequest(new { success = false, message = "Đăng xuất thất bại" });
    }

    /// <summary>
    /// Get current user info
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var accessToken = GetAccessToken();
        if (string.IsNullOrEmpty(accessToken))
        {
            return Unauthorized(new { success = false, message = "Access token không hợp lệ" });
        }

        var user = await _authService.GetUserAsync(accessToken);

        if (user != null)
        {
            return Ok(new
            {
                success = true,
                user = new
                {
                    id = user.Id,
                    email = user.Email,
                    phone = user.Phone,
                    emailConfirmed = user.EmailConfirmedAt.HasValue,
                    phoneConfirmed = user.PhoneConfirmedAt.HasValue,
                    lastSignInAt = user.LastSignInAt,
                    createdAt = user.CreatedAt,
                    metadata = user.UserMetadata
                }
            });
        }

        return Unauthorized(new { success = false, message = "Không thể lấy thông tin người dùng" });
    }

    /// <summary>
    /// Get current user info with roles from ASP.NET Core Identity
    /// Use this endpoint to get roles for authorization
    /// Works with both Supabase tokens and app JWTs
    /// </summary>
    [HttpGet("me/with-roles")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUserWithRoles()
    {
        var accessToken = GetAccessToken();

        // Cố lấy user từ Supabase trước
        SupabaseUser? supabaseUser = null;
        if (!string.IsNullOrEmpty(accessToken))
        {
            supabaseUser = await _authService.GetUserAsync(accessToken);
        }

        // Nếu là app token (không phải Supabase token), lấy thông tin từ claims
        string? userEmail = supabaseUser?.Email;
        string? userId = supabaseUser?.Id;

        if (supabaseUser == null)
        {
            // Fallback: token là app JWT, đọc claims trực tiếp
            userEmail = User.FindFirst(ClaimTypes.Email)?.Value
                ?? User.FindFirst("email")?.Value;
            userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;
        }

        if (string.IsNullOrWhiteSpace(userEmail) && string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new { success = false, message = "Không thể xác định người dùng" });
        }

        // Tìm AppUser (hoặc tạo nếu chưa có)
        AppUser? appUser = null;

        if (!string.IsNullOrWhiteSpace(userId))
            appUser = await _userManager.FindByIdAsync(userId);

        if (appUser == null && !string.IsNullOrWhiteSpace(userEmail))
            appUser = await _userManager.FindByEmailAsync(userEmail);

        // Nếu vẫn chưa có AppUser mà có supabaseUser → auto-create
        if (appUser == null && supabaseUser != null)
        {
            appUser = await FindOrCreateAppUserAsync(supabaseUser);
        }

        if (appUser == null)
        {
            return NotFound(new { success = false, message = "Người dùng không tồn tại trong hệ thống" });
        }

        // Get roles from AspNetUserRoles
        var roles = await _userManager.GetRolesAsync(appUser);

        return Ok(new
        {
            success = true,
            user = new
            {
                id = appUser.Id,
                email = appUser.Email,
                phone = supabaseUser?.Phone ?? appUser.PhoneNumber,
                emailConfirmed = supabaseUser?.EmailConfirmedAt.HasValue ?? appUser.EmailConfirmed,
                phoneConfirmed = supabaseUser?.PhoneConfirmedAt.HasValue ?? false,
                lastSignInAt = supabaseUser?.LastSignInAt,
                createdAt = supabaseUser?.CreatedAt ?? appUser.CreatedAt,
                roles = roles.ToList(),
                metadata = supabaseUser?.UserMetadata ?? new Dictionary<string, object>
                {
                    { "full_name", appUser.FullName ?? "" }
                }
            }
        });
    }

    /// <summary>
    /// Update user metadata
    /// </summary>
    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateUser([FromBody] Dictionary<string, object> metadata)
    {
        var accessToken = GetAccessToken();
        if (string.IsNullOrEmpty(accessToken))
        {
            return Unauthorized(new { success = false, message = "Access token không hợp lệ" });
        }

        var user = await _authService.UpdateUserAsync(accessToken, metadata);

        if (user != null)
        {
            return Ok(new
            {
                success = true,
                message = "Cập nhật thành công",
                user
            });
        }

        return BadRequest(new { success = false, message = "Cập nhật thất bại" });
    }

    /// <summary>
    /// Send password reset email
    /// </summary>
    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] SupabasePasswordResetRequest request)
    {
        if (string.IsNullOrEmpty(request.Email))
        {
            return BadRequest(new { success = false, message = "Email là bắt buộc" });
        }

        var redirectUrl = request.RedirectUrl ?? $"{Request.Scheme}://{Request.Host}/reset-password";
        var result = await _authService.ResetPasswordForEmailAsync(request.Email, redirectUrl);

        // Always return success to prevent email enumeration
        return Ok(new
        {
            success = true,
            message = "Nếu email tồn tại, chúng tôi đã gửi link đặt lại mật khẩu"
        });
    }

    /// <summary>
    /// Update password (for authenticated users)
    /// </summary>
    [HttpPost("update-password")]
    [Authorize]
    public async Task<IActionResult> UpdatePassword([FromBody] SupabaseUpdatePasswordRequest request)
    {
        if (string.IsNullOrEmpty(request.NewPassword))
        {
            return BadRequest(new { success = false, message = "Mật khẩu mới là bắt buộc" });
        }

        if (request.NewPassword.Length < 6)
        {
            return BadRequest(new { success = false, message = "Mật khẩu phải có ít nhất 6 ký tự" });
        }

        var accessToken = GetAccessToken();
        if (string.IsNullOrEmpty(accessToken))
        {
            return Unauthorized(new { success = false, message = "Access token không hợp lệ" });
        }

        var result = await _authService.UpdatePasswordAsync(accessToken, request.NewPassword);

        if (result)
        {
            return Ok(new { success = true, message = "Đổi mật khẩu thành công" });
        }

        return BadRequest(new { success = false, message = "Đổi mật khẩu thất bại" });
    }

    /// <summary>
    /// Get OAuth URL for provider
    /// </summary>
    [HttpGet("oauth/{provider}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetOAuthUrl(string provider, [FromQuery] string? redirectUrl)
    {
        var validProviders = new[] { "google", "github", "facebook", "twitter", "apple", "discord" };
        if (!validProviders.Contains(provider.ToLower()))
        {
            return BadRequest(new { success = false, message = $"Provider không hỗ trợ: {provider}" });
        }

        var redirect = redirectUrl ?? $"{Request.Scheme}://{Request.Host}/auth/callback";
        var url = await _authService.GetOAuthUrlAsync(provider.ToLower(), redirect);

        return Ok(new
        {
            success = true,
            provider,
            url
        });
    }

    /// <summary>
    /// Helper to extract access token from Authorization header
    /// </summary>
    private string? GetAccessToken()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            return null;
        }
        return authHeader.Substring(7);
    }

    private async Task<List<string>> ResolveAppRolesAsync(SupabaseUser? supabaseUser)
    {
        try
        {
            if (supabaseUser == null)
                return new List<string>();

            var appUser = await FindOrCreateAppUserAsync(supabaseUser);

            if (appUser == null)
                return new List<string>();

            var roles = await _userManager.GetRolesAsync(appUser);

            // Ensure at least Customer role
            if (!roles.Any())
            {
                if (!await _userManager.IsInRoleAsync(appUser, "Customer"))
                {
                    await _userManager.AddToRoleAsync(appUser, "Customer");
                }
                roles = await _userManager.GetRolesAsync(appUser);
            }

            return roles.ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Không thể resolve app roles cho user SupabaseId={SupabaseId}, Email={Email}", supabaseUser?.Id, supabaseUser?.Email);
            return new List<string>();
        }
    }

    private async Task<string?> CreateAppAccessTokenAsync(SupabaseUser? supabaseUser, List<string> appRoles)
    {
        try
        {
            if (supabaseUser == null)
                return null;

            var appUser = await FindOrCreateAppUserAsync(supabaseUser);

            if (appUser == null)
                return null;

            return await _jwtTokenService.GenerateAccessTokenAsync(appUser, appRoles);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Không thể tạo app access token cho user SupabaseId={SupabaseId}, Email={Email}", supabaseUser?.Id, supabaseUser?.Email);
            return null;
        }
    }

    /// <summary>
    /// Find AppUser by Supabase ID or Email. If not found, auto-create one.
    /// This handles users who registered via SupabaseAuth/signup without local AppUser creation.
    /// </summary>
    private async Task<AppUser?> FindOrCreateAppUserAsync(SupabaseUser supabaseUser)
    {
        try
        {
            AppUser? appUser = null;

            // Try find by Supabase ID first
            if (!string.IsNullOrWhiteSpace(supabaseUser.Id))
            {
                appUser = await _userManager.FindByIdAsync(supabaseUser.Id);
            }

            // Fallback: find by email
            if (appUser == null && !string.IsNullOrWhiteSpace(supabaseUser.Email))
            {
                appUser = await _userManager.FindByEmailAsync(supabaseUser.Email);
            }

            // If still not found, auto-create local AppUser
            if (appUser == null && !string.IsNullOrWhiteSpace(supabaseUser.Email))
            {
                var fullName = supabaseUser.UserMetadata != null
                    && supabaseUser.UserMetadata.TryGetValue("full_name", out var fnObj)
                    ? fnObj?.ToString()
                    : supabaseUser.Email;

                appUser = new AppUser
                {
                    Id = supabaseUser.Id,
                    UserName = supabaseUser.Email,
                    Email = supabaseUser.Email,
                    FullName = fullName,
                    PhoneNumber = supabaseUser.Phone,
                    Occupation = "Customer",
                    Address = string.Empty,
                    Avatar = string.Empty,
                    token = string.Empty,
                    CreatedAt = supabaseUser.CreatedAt,
                    EmailConfirmed = supabaseUser.EmailConfirmedAt.HasValue
                };

                var result = await _userManager.CreateAsync(appUser);
                if (result.Succeeded)
                {
                    await _userManager.AddToRoleAsync(appUser, "Customer");
                    _logger.LogInformation("Auto-created local AppUser for SupabaseId={SupabaseId}, Email={Email}", supabaseUser.Id, supabaseUser.Email);
                }
                else
                {
                    _logger.LogWarning("Failed to auto-create AppUser: {Errors}",
                        string.Join(", ", result.Errors.Select(e => e.Description)));
                    return null;
                }
            }

            return appUser;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in FindOrCreateAppUserAsync for SupabaseId={SupabaseId}, Email={Email}", supabaseUser.Id, supabaseUser.Email);
            return null;
        }
    }
}
