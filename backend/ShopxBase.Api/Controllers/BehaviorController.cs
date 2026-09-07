using Microsoft.AspNetCore.Mvc;
using ShopxBase.Domain.Entities;
using ShopxBase.Infrastructure.Services;
using System.Security.Claims;

namespace ShopxBase.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class BehaviorController : ControllerBase
{
    private readonly IUserBehaviorService _behaviorService;
    private readonly ILogger<BehaviorController> _logger;

    public BehaviorController(
        IUserBehaviorService behaviorService,
        ILogger<BehaviorController> logger)
    {
        _behaviorService = behaviorService;
        _logger = logger;
    }

    /// <summary>
    /// Track a single user behavior event (view, search, add-to-cart, etc.)
    /// </summary>
    [HttpPost("track")]
    public async Task<IActionResult> Track([FromBody] TrackRequest request)
    {
        if (request == null)
            return BadRequest(new { success = false, message = "Request body is required" });

        var userId = GetUserId();

        await _behaviorService.TrackAsync(new TrackBehaviorRequest
        {
            UserId = userId,
            SessionId = request.SessionId,
            BehaviorType = request.BehaviorType,
            ProductId = request.ProductId,
            SearchQuery = request.SearchQuery,
            RatingScore = request.RatingScore,
            DwellTimeSeconds = request.DwellTimeSeconds,
            SourcePage = request.SourcePage
        });

        return Ok(new { success = true });
    }

    /// <summary>
    /// Track multiple behavior events at once
    /// </summary>
    [HttpPost("track-batch")]
    public async Task<IActionResult> TrackBatch([FromBody] TrackBatchRequest request)
    {
        if (request?.Events == null || !request.Events.Any())
            return BadRequest(new { success = false, message = "Events array is required" });

        var userId = GetUserId();

        var trackRequests = request.Events.Select(e => new TrackBehaviorRequest
        {
            UserId = userId,
            SessionId = e.SessionId ?? request.SessionId,
            BehaviorType = e.BehaviorType,
            ProductId = e.ProductId,
            SearchQuery = e.SearchQuery,
            RatingScore = e.RatingScore,
            DwellTimeSeconds = e.DwellTimeSeconds,
            SourcePage = e.SourcePage
        });

        await _behaviorService.TrackBatchAsync(trackRequests);

        return Ok(new { success = true, tracked = request.Events.Count });
    }

    /// <summary>
    /// Get dynamic, personalized home feed for all sections (recommended, flash sale, trending, new arrivals, recently viewed)
    /// </summary>
    [HttpGet("home-feed")]
    public async Task<IActionResult> GetHomeFeed(
        [FromQuery] string? sessionId,
        [FromQuery] int limit = 8)
    {
        var userId = GetUserId();
        _logger.LogInformation("[Behavior HomeFeed] User: {UserId}, Session: {SessionId}", userId ?? "guest", sessionId);
        var feed = await _behaviorService.GetHomeFeedAsync(userId, sessionId, limit);
        return Ok(new { success = true, data = feed });
    }

    /// <summary>
    /// Get personalized recommendations based on user behavior
    /// </summary>
    [HttpGet("recommendations")]
    public async Task<IActionResult> GetRecommendations(
        [FromQuery] string? sessionId,
        [FromQuery] int limit = 8)
    {
        var userId = GetUserId();
        _logger.LogInformation("[Behavior Recommendations] User: {UserId}, Session: {SessionId}", userId ?? "guest", sessionId);
        var products = await _behaviorService.GetPersonalizedRecommendationsAsync(userId, sessionId, limit);

        return Ok(new { success = true, data = products });
    }

    /// <summary>
    /// Get recently viewed products
    /// </summary>
    [HttpGet("recently-viewed")]
    public async Task<IActionResult> GetRecentlyViewed(
        [FromQuery] string? sessionId,
        [FromQuery] int limit = 8)
    {
        var userId = GetUserId();
        _logger.LogInformation("[Behavior RecentlyViewed] User: {UserId}, Session: {SessionId}", userId ?? "guest", sessionId);
        var products = await _behaviorService.GetRecentlyViewedAsync(userId, sessionId, limit);

        return Ok(new { success = true, data = products });
    }

    /// <summary>
    /// Get "frequently bought together" for a product
    /// </summary>
    [HttpGet("bought-together/{productId:int}")]
    public async Task<IActionResult> GetBoughtTogether(int productId, [FromQuery] int limit = 5)
    {
        var products = await _behaviorService.GetFrequentlyBoughtTogetherAsync(productId, limit);
        return Ok(new { success = true, data = products });
    }

    /// <summary>
    /// Get "users who viewed this also viewed" for a product
    /// </summary>
    [HttpGet("also-viewed/{productId:int}")]
    public async Task<IActionResult> GetAlsoViewed(int productId, [FromQuery] int limit = 5)
    {
        var products = await _behaviorService.GetAlsoViewedAsync(productId, limit);
        return Ok(new { success = true, data = products });
    }

    private string? GetUserId()
    {
        // Try Supabase JWT (sub claim) then app JWT (NameIdentifier)
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
    }
}

// ── Request DTOs ──

public class TrackRequest
{
    public string? SessionId { get; set; }
    public BehaviorType BehaviorType { get; set; }
    public int? ProductId { get; set; }
    public string? SearchQuery { get; set; }
    public int? RatingScore { get; set; }
    public int? DwellTimeSeconds { get; set; }
    public string? SourcePage { get; set; }
}

public class TrackBatchRequest
{
    public string? SessionId { get; set; }
    public List<TrackRequest> Events { get; set; } = new();
}
