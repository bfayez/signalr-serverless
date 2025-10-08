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
    public SignalRConnectionInfo Negotiate(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")] HttpRequestData req,
        [SignalRConnectionInfoInput(HubName = "chat")] SignalRConnectionInfo connectionInfo)
    {
        _logger.LogInformation("Negotiate function triggered");
        return connectionInfo;
    }
}
