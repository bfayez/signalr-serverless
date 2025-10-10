using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Extensions.SignalRService;
using Microsoft.Extensions.Logging;

namespace SignalRServerless.Functions;

public class NegotiateFunction
{
    private readonly ILogger<NegotiateFunction> _logger;

    public NegotiateFunction(ILogger<NegotiateFunction> logger)
    {
        _logger = logger;
    }

    [Function("negotiate")]
    public async Task<HttpResponseData> Negotiate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")] HttpRequestData req,
        [SignalRConnectionInfoInput(HubName = "chat", UserId = "{query.userId}")] SignalRConnectionInfo connectionInfo)
    {
        _logger.LogInformation("Negotiate function triggered");
        
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json");
        
        // Serialize with camelCase naming policy to match client expectations
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        
        var json = JsonSerializer.Serialize(connectionInfo, options);
        await response.WriteStringAsync(json);
        
        return response;
    }
}
