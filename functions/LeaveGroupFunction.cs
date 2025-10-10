using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Extensions.SignalRService;
using Microsoft.Extensions.Logging;
using SignalRServerless.Models;
using System.Net;
using System.Text.Json;

namespace SignalRServerless.Functions;

public class LeaveGroupFunction
{
    private readonly ILogger<LeaveGroupFunction> _logger;

    public LeaveGroupFunction(ILogger<LeaveGroupFunction> logger)
    {
        _logger = logger;
    }

    [Function("leaveGroup")]
    public async Task<MultiResponse> LeaveGroup(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
    {
        _logger.LogInformation("LeaveGroup function triggered");

        try
        {
            var requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            var groupRequest = JsonSerializer.Deserialize<GroupRequest>(requestBody, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (groupRequest == null || string.IsNullOrEmpty(groupRequest.GroupName) || 
                string.IsNullOrEmpty(groupRequest.UserId))
            {
                var errorResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                await errorResponse.WriteAsJsonAsync(new { error = "Missing required fields: groupName, userId" });
                return new MultiResponse { HttpResponse = errorResponse };
            }

            _logger.LogInformation($"Removing user {groupRequest.UserId} from group {groupRequest.GroupName}");

            var userEvent = new UserEvent
            {
                UserId = groupRequest.UserId,
                Timestamp = DateTime.UtcNow.ToString("o")
            };

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new 
            { 
                success = true, 
                message = $"User {groupRequest.UserId} left group {groupRequest.GroupName}" 
            });

            return new MultiResponse
            {
                HttpResponse = response,
                SignalRGroupActions = new SignalRGroupAction(SignalRGroupActionType.Remove)
                {
                    GroupName = groupRequest.GroupName,
                    UserId = groupRequest.UserId
                },
                SignalRMessages = new SignalRMessageAction("userLeft")
                {
                    GroupName = groupRequest.GroupName,
                    Arguments = new[] { userEvent }
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error leaving group");
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteAsJsonAsync(new { error = "Failed to leave group" });
            return new MultiResponse { HttpResponse = errorResponse };
        }
    }

    public class MultiResponse
    {
        [SignalROutput(HubName = "chat")]
        public SignalRGroupAction? SignalRGroupActions { get; set; }

        [SignalROutput(HubName = "chat")]
        public SignalRMessageAction? SignalRMessages { get; set; }

        public HttpResponseData? HttpResponse { get; set; }
    }
}
