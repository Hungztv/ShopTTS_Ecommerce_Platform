using ShopxBase.Application.Extensions;
using ShopxBase.Infrastructure.Extensions;
using ShopxBase.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using DotNetEnv;
using Npgsql;
using ShopxBase.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using ShopxBase.Application.Interfaces;
using ShopxBase.Infrastructure.Services;
using ShopxBase.Application.Settings;
using Microsoft.AspNetCore.Authentication;
using Microsoft.OpenApi.Models;

// 1. Load environment variables from .env file
var solutionRoot = Directory.GetCurrentDirectory();
while (!File.Exists(Path.Combine(solutionRoot, ".env")) && solutionRoot != Path.GetPathRoot(solutionRoot))
{
    solutionRoot = Path.GetDirectoryName(solutionRoot) ?? solutionRoot;
}

var envPath = Path.Combine(solutionRoot, ".env");
if (File.Exists(envPath))
{
    Env.Load(envPath);
    Console.WriteLine($"✅ Loaded .env from: {envPath}");
}
else
{
    Console.WriteLine($"❌ .env file not found at: {envPath}");
}

var builder = WebApplication.CreateBuilder(args);

// 2. Build connection string from environment variables (.env file)
var host = Environment.GetEnvironmentVariable("SUPABASE_HOST")
    ?? throw new InvalidOperationException("SUPABASE_HOST is not set in .env file");
var port = Environment.GetEnvironmentVariable("SUPABASE_PORT") ?? "6543";
var database = Environment.GetEnvironmentVariable("SUPABASE_DATABASE")
    ?? throw new InvalidOperationException("SUPABASE_DATABASE is not set in .env file");
var user = Environment.GetEnvironmentVariable("SUPABASE_USER")
    ?? throw new InvalidOperationException("SUPABASE_USER is not set in .env file");
var password = Environment.GetEnvironmentVariable("SUPABASE_PASSWORD")
    ?? throw new InvalidOperationException("SUPABASE_PASSWORD is not set in .env file");

Console.WriteLine($" Connecting to: {host}:{port}/{database}");
// Clear pools before establishing new connections
NpgsqlConnection.ClearAllPools();

// Optimized connection string for Supabase with port 5432 (direct, not pooler)
// Minimal pooling settings with connection reuse and extended timeout for complex queries
var connectionString = $"Host={host};Database={database};Username={user};Password={password};Port={port};SslMode=Require;CommandTimeout=120;Pooling=true;MaxPoolSize=3;MinPoolSize=1;Connection Idle Lifetime=60;";

// Load JWT Settings from .env and add to Configuration
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? throw new InvalidOperationException("JWT_SECRET is not set in .env file");
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "ShopxBaseAPI";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "ShopxBaseClient";
var jwtExpiryMinutes = Environment.GetEnvironmentVariable("JWT_EXPIRY_MINUTES") ?? "60";

// Add JWT settings to Configuration
builder.Configuration["JwtSettings:SecretKey"] = jwtSecret;
builder.Configuration["JwtSettings:Issuer"] = jwtIssuer;
builder.Configuration["JwtSettings:Audience"] = jwtAudience;
builder.Configuration["JwtSettings:AccessTokenExpirationMinutes"] = jwtExpiryMinutes;

// Add connection string to configuration for Infrastructure layer
builder.Configuration["ConnectionStrings:DefaultConnection"] = connectionString;

// 3.5 Load Email Settings from .env
var emailHost = Environment.GetEnvironmentVariable("EMAIL_HOST") ?? "smtp.gmail.com";
var emailPort = Environment.GetEnvironmentVariable("EMAIL_PORT") ?? "587";
var emailMail = Environment.GetEnvironmentVariable("EMAIL_MAIL") ?? "";
var emailPassword = Environment.GetEnvironmentVariable("EMAIL_PASSWORD") ?? "";
var emailDisplayName = Environment.GetEnvironmentVariable("EMAIL_DISPLAY_NAME") ?? "ShopX Support";
var emailEnableSsl = Environment.GetEnvironmentVariable("EMAIL_ENABLE_SSL") ?? "true";

// Add Email settings to Configuration
builder.Configuration["EmailSettings:Host"] = emailHost;
builder.Configuration["EmailSettings:Port"] = emailPort;
builder.Configuration["EmailSettings:Mail"] = emailMail;
builder.Configuration["EmailSettings:Password"] = emailPassword;
builder.Configuration["EmailSettings:DisplayName"] = emailDisplayName;
builder.Configuration["EmailSettings:EnableSsl"] = emailEnableSsl;

// 3.6 Load MoMo Payment Settings from .env
var momoPartnerCode = Environment.GetEnvironmentVariable("MOMO_PARTNER_CODE") ?? "MOMO";
var momoAccessKey = Environment.GetEnvironmentVariable("MOMO_ACCESS_KEY") ?? "";
var momoSecretKey = Environment.GetEnvironmentVariable("MOMO_SECRET_KEY") ?? "";
var momoApiUrl = Environment.GetEnvironmentVariable("MOMO_API_URL") ?? "https://test-payment.momo.vn/v2/gateway/api/create";
var momoReturnUrl = Environment.GetEnvironmentVariable("MOMO_RETURN_URL") ?? "http://localhost:3000/payment/momo-callback";
var momoNotifyUrl = Environment.GetEnvironmentVariable("MOMO_NOTIFY_URL") ?? "http://localhost:5266/api/MomoPayment/ipn";
var momoRequestType = Environment.GetEnvironmentVariable("MOMO_REQUEST_TYPE") ?? "payWithMethod";

builder.Configuration["MomoSettings:PartnerCode"] = momoPartnerCode;
builder.Configuration["MomoSettings:AccessKey"] = momoAccessKey;
builder.Configuration["MomoSettings:SecretKey"] = momoSecretKey;
builder.Configuration["MomoSettings:ApiUrl"] = momoApiUrl;
builder.Configuration["MomoSettings:ReturnUrl"] = momoReturnUrl;
builder.Configuration["MomoSettings:NotifyUrl"] = momoNotifyUrl;
builder.Configuration["MomoSettings:RequestType"] = momoRequestType;

// 4. Configure Supabase Settings
var supabaseUrl = Environment.GetEnvironmentVariable("SUPABASE_URL")
    ?? throw new InvalidOperationException("SUPABASE_URL is not set in .env file");
var supabaseAnonKey = Environment.GetEnvironmentVariable("SUPABASE_ANON_KEY")
    ?? throw new InvalidOperationException("SUPABASE_ANON_KEY is not set in .env file");
var supabaseJwtSecret = Environment.GetEnvironmentVariable("SUPABASE_JWT_SECRET")
    ?? throw new InvalidOperationException("SUPABASE_JWT_SECRET is not set in .env file");

builder.Services.Configure<SupabaseSettings>(options =>
{
    options.Url = supabaseUrl;
    options.AnonKey = supabaseAnonKey;
    options.JwtSecret = supabaseJwtSecret;
    options.ServiceRoleKey = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY") ?? "";
});

// 5. Configure JWT Settings (legacy - still used for custom tokens)
var jwtSettingsSection = builder.Configuration.GetSection("JwtSettings");
builder.Services.Configure<JwtSettings>(jwtSettingsSection);

var jwtSettings = jwtSettingsSection.Get<JwtSettings>();
var secretKey = jwtSettings?.SecretKey
    ?? Environment.GetEnvironmentVariable("JWT_SECRET") // Fallback lấy từ ENV nếu config null
    ?? throw new InvalidOperationException("JWT SecretKey is not configured");

// 6. Configure JWT Authentication with Supabase JWT support (ES256 via JWKS)
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = "DynamicBearer";
    options.DefaultChallengeScheme = "DynamicBearer";
})
.AddPolicyScheme("DynamicBearer", "Dynamic JWT Bearer", options =>
{
    options.ForwardDefaultSelector = context =>
    {
        var token = string.Empty;
        var authHeader = context.Request.Headers.Authorization.ToString();
        
        if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            token = authHeader.Substring("Bearer ".Length).Trim();
        }
        else if (context.Request.Query.TryGetValue("access_token", out var accessToken))
        {
            token = accessToken.ToString();
        }

        if (string.IsNullOrEmpty(token))
            return "SupabaseBearer";

        var segments = token.Split('.');
        if (segments.Length != 3)
            return "SupabaseBearer";

        try
        {
            var payload = segments[1]
                .Replace('-', '+')
                .Replace('_', '/');

            while (payload.Length % 4 != 0)
                payload += "=";

            var json = Encoding.UTF8.GetString(Convert.FromBase64String(payload));
            return json.Contains($"\"iss\":\"{supabaseUrl}/auth/v1\"", StringComparison.OrdinalIgnoreCase)
                ? "SupabaseBearer"
                : "AppBearer";
        }
        catch
        {
            return "SupabaseBearer";
        }
    };
})
.AddJwtBearer("SupabaseBearer", options =>
{
    options.Authority = $"{supabaseUrl}/auth/v1";
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = $"{supabaseUrl}/auth/v1",
        ValidAudience = "authenticated",
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = "role",
        NameClaimType = "email"
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/chathub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
})
.AddJwtBearer("AppBearer", options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = ClaimTypes.Role,
        NameClaimType = ClaimTypes.Email
    };

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/chathub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// 7. Add Controllers
builder.Services.AddControllers();

// Add SignalR
builder.Services.AddSignalR();

// Add Swagger documentation with JWT support
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "ShopxBase API", Version = "v1", Description = "E-Commerce API with CQRS Pattern" });

    // Add JWT Authentication to Swagger
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token."
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Add Application Layer (MediatR, AutoMapper, FluentValidation)
builder.Services.AddApplication();

// Add Infrastructure Layer (DbContext, Repositories, Identity, JWT)
builder.Services.AddInfrastructure(builder.Configuration);

// Add Auth Services
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();

// Add Supabase Auth Service
builder.Services.AddHttpClient<ISupabaseAuthService, SupabaseAuthService>();

// Add Supabase Storage Service
builder.Services.AddHttpClient<ISupabaseStorageService, SupabaseStorageService>();

// Add HttpClientFactory for ChatBot (GROQ API)
builder.Services.AddHttpClient();

// Add ChatBot Product Service (search & recommendation)
builder.Services.AddScoped<ShopxBase.Infrastructure.Services.IChatBotProductService,
    ShopxBase.Infrastructure.Services.ChatBotProductService>();

// Add User Behavior Service (tracking & personalized recommendations)
builder.Services.AddScoped<ShopxBase.Infrastructure.Services.IUserBehaviorService,
    ShopxBase.Infrastructure.Services.UserBehaviorService>();

// Add Gemini Embedding Service (RAG: vector embeddings)
builder.Services.AddHttpClient<ShopxBase.Infrastructure.Services.IEmbeddingService,
    ShopxBase.Infrastructure.Services.GeminiEmbeddingService>();

// Add Vector Search Service (RAG: pgvector similarity search)
builder.Services.AddScoped<ShopxBase.Infrastructure.Services.IVectorSearchService,
    ShopxBase.Infrastructure.Services.VectorSearchService>();

// Add User Behavior Tracking & Recommendation Service
builder.Services.AddScoped<ShopxBase.Infrastructure.Services.IUserBehaviorService,
    ShopxBase.Infrastructure.Services.UserBehaviorService>();

// Add Email Service
builder.Services.Configure<ShopxBase.Application.Settings.EmailSettings>(
    builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<ShopxBase.Application.Interfaces.IEmailService,
    ShopxBase.Infrastructure.Services.EmailService>();

// Add MoMo Payment Service
builder.Services.Configure<ShopxBase.Application.Settings.MomoSettings>(
    builder.Configuration.GetSection("MomoSettings"));
builder.Services.AddHttpClient<ShopxBase.Application.Interfaces.IMomoPaymentService,
    ShopxBase.Infrastructure.Services.MomoPaymentService>();

// 11. Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins",
        policy =>
        {
            policy.WithOrigins(
                    "http://localhost:3000",                  // Cho phép Localhost
                    "https://shop-vibe-frontend.vercel.app",  // ⚠️ Thay bằng link Vercel của bạn
                    "https://shop-tts-v1.vercel.app"          // Thêm các domain khác nếu có
                )
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials(); // SignalR requires credentials
        });
});

// Add logging
builder.Services.AddLogging();

builder.Services.AddHealthChecks();
var app = builder.Build();

// Seed roles
using (var scope = app.Services.CreateScope())
{
    await SeedData.Initialize(scope.ServiceProvider);
}

// Configure the HTTP request pipeline

// Enable Swagger in all environments (useful for testing on Render)
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "ShopxBase API v1");
    c.RoutePrefix = "swagger"; // Swagger at /swagger
});

// Health check endpoint for Render.com
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("AllowSpecificOrigins");

// Global exception handler - converts domain exceptions to proper HTTP responses
app.UseMiddleware<ShopxBase.Api.Middleware.GlobalExceptionHandlerMiddleware>();

app.UseAuthentication();

// Add middleware to inject roles from database into user claims BEFORE authorization
app.UseMiddleware<ShopxBase.Api.Middleware.AddRolesFromDatabaseMiddleware>();

app.UseAuthorization();

app.MapControllers();

// Map SignalR Hub
app.MapHub<ShopxBase.Api.Hubs.ChatHub>("/chathub");

app.MapHealthChecks("/health");

// 11. Seed roles and admin user
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        DbInitializer.SeedRolesAndAdminAsync(services).Wait();
        DataSeeder.SeedSampleDataAsync(app.Services).Wait();
        ShopDataSeeder.SeedShop8DataAsync(app.Services).Wait();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ Error seeding database: {ex.Message}");
    }
}

app.Run();