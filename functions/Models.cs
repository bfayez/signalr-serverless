namespace SignalRServerless.Models;

public class MessageRequest
{
    public string GroupName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Sender { get; set; } = string.Empty;
}

public class GroupRequest
{
    public string GroupName { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
}

public class MessageData
{
    public string Sender { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
}

public class UserEvent
{
    public string UserId { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
}

public class HealthResponse
{
    public string Status { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public string Service { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public Dictionary<string, string> Checks { get; set; } = new();
}
