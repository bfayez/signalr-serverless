using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Extensions.SignalRService;
using Microsoft.Extensions.Logging;
using SignalRServerless.Models;
using System.Net;
using System.Text.Json;

namespace SignalRServerless.Functions;

public class SendMessageFunction
{
    private readonly ILogger<SendMessageFunction> _logger;

    public SendMessageFunction(ILogger<SendMessageFunction> logger)
    {
        _logger = logger;
    }

    [Function("sendMessage")]
    public async Task<MultiResponse> SendMessage(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post")] HttpRequestData req)
    {
        _logger.LogInformation("SendMessage function triggered");

        try
        {
            var requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            var messageRequest = JsonSerializer.Deserialize<MessageRequest>(requestBody, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (messageRequest == null || string.IsNullOrEmpty(messageRequest.GroupName) || 
                string.IsNullOrEmpty(messageRequest.Message) || string.IsNullOrEmpty(messageRequest.Sender))
            {
                var errorResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                await errorResponse.WriteAsJsonAsync(new { error = "Missing required fields: groupName, message, sender" });
                return new MultiResponse { HttpResponse = errorResponse };
            }

            _logger.LogInformation($"Sending message to group {messageRequest.GroupName} from {messageRequest.Sender}");

            var messageData = new MessageData
            {
                Sender = messageRequest.Sender,
                Message = messageRequest.Message,
                Timestamp = DateTime.UtcNow.ToString("o")
            };

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new { success = true, message = "Message sent successfully" });

            return new MultiResponse
            {
                HttpResponse = response,
                SignalRMessages = new SignalRMessageAction("newMessage")
                {
                    GroupName = messageRequest.GroupName,
                    Arguments = new[] { messageData }
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending message");
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteAsJsonAsync(new { error = "Failed to send message" });
            return new MultiResponse { HttpResponse = errorResponse };
        }
    }

    public class MultiResponse
    {
        [SignalROutput(HubName = "chat")]
        public SignalRMessageAction? SignalRMessages { get; set; }

        public HttpResponseData? HttpResponse { get; set; }
    }
}
