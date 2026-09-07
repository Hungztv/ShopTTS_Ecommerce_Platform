using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ShopxBase.Infrastructure.Services;

// ═══════════════════════════════════════════════════════════
//  Interface
// ═══════════════════════════════════════════════════════════

public interface IEmbeddingService
{
    /// <summary>
    /// Tạo embedding vector từ text bằng Gemini API.
    /// Trả về float[768] (text-embedding-004).
    /// </summary>
    Task<float[]?> EmbedAsync(string text);

    /// <summary>
    /// Tạo embedding cho nhiều text cùng lúc (batch).
    /// </summary>
    Task<List<float[]>> EmbedBatchAsync(IEnumerable<string> texts);
}

// ═══════════════════════════════════════════════════════════
//  Implementation — Google Gemini text-embedding-004
// ═══════════════════════════════════════════════════════════

public class GeminiEmbeddingService : IEmbeddingService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GeminiEmbeddingService> _logger;
    private readonly string? _apiKey;
    private readonly string[] _candidateModels;

    // Gemini embedding endpoint
    private const string BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    private const int DIMENSIONS = 768;

    public GeminiEmbeddingService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiEmbeddingService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY")
            ?? configuration["Gemini:ApiKey"];

        var configuredModel = Environment.GetEnvironmentVariable("GEMINI_EMBEDDING_MODEL")
            ?? configuration["Gemini:EmbeddingModel"];

        _candidateModels = string.IsNullOrWhiteSpace(configuredModel)
            ? new[] { "models/gemini-embedding-001", "models/gemini-embedding-2-preview", "models/text-embedding-004" }
            : new[] { configuredModel!, "models/gemini-embedding-001", "models/gemini-embedding-2-preview" };
    }

    public async Task<float[]?> EmbedAsync(string text)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            _logger.LogError("GEMINI_API_KEY is not configured");
            return null;
        }

        if (string.IsNullOrWhiteSpace(text))
            return null;

        try
        {
            foreach (var model in _candidateModels.Distinct())
            {
                var values = await TryEmbedSingleAsync(text, model, "RETRIEVAL_DOCUMENT");
                if (values is { Length: > 0 })
                    return values;
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate embedding");
            return null;
        }
    }

    public async Task<List<float[]>> EmbedBatchAsync(IEnumerable<string> texts)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            _logger.LogError("GEMINI_API_KEY is not configured");
            return new List<float[]>();
        }

        var textList = texts.Where(t => !string.IsNullOrWhiteSpace(t)).ToList();
        if (!textList.Any())
            return new List<float[]>();

        try
        {
            foreach (var model in _candidateModels.Distinct())
            {
                var batchValues = await TryEmbedBatchAsync(textList, model);
                if (batchValues.Count > 0)
                    return batchValues;
            }

            return new List<float[]>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate batch embeddings");
            return new List<float[]>();
        }
    }

    /// <summary>
    /// Embed query — dùng taskType RETRIEVAL_QUERY thay vì RETRIEVAL_DOCUMENT
    /// </summary>
    public async Task<float[]?> EmbedQueryAsync(string query)
    {
        if (string.IsNullOrWhiteSpace(_apiKey) || string.IsNullOrWhiteSpace(query))
            return null;

        try
        {
            foreach (var model in _candidateModels.Distinct())
            {
                var values = await TryEmbedSingleAsync(query, model, "RETRIEVAL_QUERY");
                if (values is { Length: > 0 })
                    return values;
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate query embedding");
            return null;
        }
    }

    private async Task<float[]?> TryEmbedSingleAsync(string text, string model, string taskType)
    {
        var url = $"{BASE_URL}/{model}:embedContent?key={_apiKey}";
        var requestBody = new
        {
            model,
            content = new
            {
                parts = new[] { new { text } }
            },
            taskType,
            outputDimensionality = DIMENSIONS
        };

        var response = await _httpClient.PostAsJsonAsync(url, requestBody);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Gemini embed failed for {Model}: {Status} - {Body}",
                model, response.StatusCode, body);
            return null;
        }

        var result = JsonSerializer.Deserialize<GeminiEmbeddingResponse>(body,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        var values = result?.Embedding?.Values;
        if (values == null || values.Length == 0)
        {
            _logger.LogWarning("Gemini returned empty embedding for model {Model}", model);
            return null;
        }

        _logger.LogInformation("Gemini embedding success with model {Model}, dims={Dims}", model, values.Length);
        return values;
    }

    private async Task<List<float[]>> TryEmbedBatchAsync(List<string> texts, string model)
    {
        var url = $"{BASE_URL}/{model}:batchEmbedContents?key={_apiKey}";
        var requests = texts.Select(t => new
        {
            model,
            content = new
            {
                parts = new[] { new { text = t } }
            },
            taskType = "RETRIEVAL_DOCUMENT",
            outputDimensionality = DIMENSIONS
        }).ToArray();

        var requestBody = new { requests };

        var response = await _httpClient.PostAsJsonAsync(url, requestBody);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("Gemini batch embed failed for {Model}: {Status} - {Body}",
                model, response.StatusCode, body);
            return new List<float[]>();
        }

        var result = JsonSerializer.Deserialize<GeminiBatchEmbeddingResponse>(body,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        var vectors = result?.Embeddings?
            .Select(e => e.Values ?? Array.Empty<float>())
            .Where(v => v.Length > 0)
            .ToList() ?? new List<float[]>();

        if (vectors.Count > 0)
            _logger.LogInformation("Gemini batch embedding success with model {Model}, count={Count}", model, vectors.Count);

        return vectors;
    }
}

// ═══════════════════════════════════════════════════════════
//  Gemini API Response Models
// ═══════════════════════════════════════════════════════════

public class GeminiEmbeddingResponse
{
    [JsonPropertyName("embedding")]
    public GeminiEmbeddingData? Embedding { get; set; }
}

public class GeminiEmbeddingData
{
    [JsonPropertyName("values")]
    public float[]? Values { get; set; }
}

public class GeminiBatchEmbeddingResponse
{
    [JsonPropertyName("embeddings")]
    public List<GeminiEmbeddingData>? Embeddings { get; set; }
}
