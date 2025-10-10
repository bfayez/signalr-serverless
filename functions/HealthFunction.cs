using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using SignalRServerless.Models;
using System.Net;

namespace SignalRServerless.Functions;

public class HealthFunction
{
    private readonly ILogger<HealthFunction> _logger;

    public HealthFunction(ILogger<HealthFunction> logger)
    {
        _logger = logger;
    }

    [Function("health")]
    public async Task<HttpResponseData> Health(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")] HttpRequestData req)
    {
        _logger.LogInformation("Health check triggered");

        var signalRConnectionString = Environment.GetEnvironmentVariable("AzureSignalRConnectionString");

        var healthStatus = new HealthResponse
        {
            Status = "healthy",
            Timestamp = DateTime.UtcNow.ToString("o"),
            Service = "signalr-serverless-functions",
            Version = "1.0.0",
            Checks = new Dictionary<string, string>
            {
                { "functions", "ok" },
                { "signalr", !string.IsNullOrEmpty(signalRConnectionString) ? "configured" : "not configured" }
            }
        };

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(healthStatus);
        return response;
    }
}
