# Azure Functions - SignalR Serverless Backend (.NET 9.0)

This directory contains the Azure Functions backend for the SignalR Serverless application, implemented in C# using .NET 9.0.

## Functions Overview

### 1. `negotiate` (GET/POST /api/negotiate)
- **Purpose**: Provides SignalR connection information to clients
- **Input**: None
- **Output**: Connection URL and access token
- **Usage**: Called by SignalR client to establish connection

### 2. `sendMessage` (POST /api/sendMessage)
- **Purpose**: Send a message to a SignalR group
- **Input**: 
  ```json
  {
    "groupName": "string",
    "message": "string", 
    "sender": "string"
  }
  ```
- **Output**: Success confirmation
- **SignalR Event**: Triggers `newMessage` event to group members

### 3. `joinGroup` (POST /api/joinGroup)
- **Purpose**: Add a user to a SignalR group
- **Input**:
  ```json
  {
    "groupName": "string",
    "userId": "string"
  }
  ```
- **Output**: Success confirmation
- **SignalR Event**: Triggers `userJoined` event to group members

### 4. `leaveGroup` (POST /api/leaveGroup)
- **Purpose**: Remove a user from a SignalR group
- **Input**:
  ```json
  {
    "groupName": "string",
    "userId": "string"
  }
  ```
- **Output**: Success confirmation
- **SignalR Event**: Triggers `userLeft` event to group members

### 5. `health` (GET /api/health)
- **Purpose**: Health check endpoint
- **Input**: None
- **Output**: Service health status
- **Usage**: Monitor service availability

## Local Development

### Prerequisites
- .NET 9.0 SDK
- Azure Functions Core Tools v4
- Azure SignalR Service instance

### Setup

1. **Install dependencies:**
   ```bash
   dotnet restore
   ```

2. **Configure local settings:**
   ```bash
   cp local.settings.json.example local.settings.json
   ```

3. **Update connection string in `local.settings.json`:**
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
       "AzureSignalRConnectionString": "Endpoint=https://<your-signalr>.service.signalr.net;AccessKey=<key>;Version=1.0;"
     }
   }
   ```

4. **Build the functions:**
   ```bash
   dotnet build
   ```

5. **Start locally:**
   ```bash
   func start
   ```

The functions will be available at `http://localhost:7071`

### Test Endpoints

```bash
# Test health
curl http://localhost:7071/api/health

# Test negotiate
curl -X POST http://localhost:7071/api/negotiate

# Test send message
curl -X POST http://localhost:7071/api/sendMessage \
  -H "Content-Type: application/json" \
  -d '{
    "groupName": "testGroup",
    "message": "Hello World",
    "sender": "testUser"
  }'

# Test join group
curl -X POST http://localhost:7071/api/joinGroup \
  -H "Content-Type: application/json" \
  -d '{
    "groupName": "testGroup",
    "userId": "testUser"
  }'
```

## Deployment

### Deploy to Azure

```bash
# Login to Azure
az login

# Deploy
func azure functionapp publish <your-function-app-name>
```

### Configure Azure Function App

```bash
# Set SignalR connection string
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --settings "AzureSignalRConnectionString=<connection-string>"

# Enable CORS
az functionapp cors add \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --allowed-origins "*"
```

## Project Structure

```
functions/
├── NegotiateFunction.cs      # SignalR connection negotiation
├── SendMessageFunction.cs    # Send messages to groups
├── JoinGroupFunction.cs      # Join a group
├── LeaveGroupFunction.cs     # Leave a group
├── HealthFunction.cs         # Health check
├── Models.cs                 # Data models
├── Program.cs                # Function host configuration
├── SignalRServerless.csproj  # Project file
├── host.json                 # Function host configuration
├── local.settings.json       # Local settings (not committed)
└── README.md                 # This file
```

## Configuration

### host.json

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request",
        "maxTelemetryItemsPerSecond": 20
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| AzureSignalRConnectionString | SignalR Service connection string | Yes |
| AzureWebJobsStorage | Storage account for Functions | Yes |
| FUNCTIONS_WORKER_RUNTIME | Runtime (dotnet-isolated) | Yes |
| APPINSIGHTS_INSTRUMENTATIONKEY | Application Insights key | No |

## Monitoring

### Application Insights

Enable Application Insights for monitoring:

```bash
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=<key>"
```

### Logs

View logs in real-time:

```bash
func azure functionapp logstream <function-app-name>

# Or using Azure CLI
az functionapp log tail --name <function-app-name> --resource-group <resource-group>
```

### Metrics

Key metrics to monitor:
- Function execution count
- Function execution duration
- Error rate
- SignalR connection count
- SignalR message count

## Troubleshooting

### Function not starting
- Verify .NET 9.0 SDK is installed: `dotnet --version`
- Check `host.json` for correct configuration
- Ensure connection string is set correctly

### SignalR binding not working
- Verify SignalR extension package is installed
- Check connection string setting name matches binding configuration
- Ensure SignalR service mode is set to "Serverless"

### CORS errors
- Add client origin to CORS settings
- Verify allowed origins include protocol (http/https)

## Development Notes

- Functions use isolated worker process (.NET 9.0)
- Anonymous authentication for development
- Implement proper authentication for production
- Use Azure Key Vault for secrets in production
- Enable managed identity for Azure services
- Implement rate limiting for production workloads

## Technology Stack

- **.NET 9.0** - Latest .NET version
- **Azure Functions v4** - Isolated worker process
- **SignalR Service Extension** - For SignalR bindings
- **Application Insights** - For monitoring and diagnostics

## Additional Resources

- [Azure Functions Documentation](https://docs.microsoft.com/azure/azure-functions/)
- [Azure SignalR Service](https://docs.microsoft.com/azure/azure-signalr/)
- [SignalR Bindings for .NET](https://docs.microsoft.com/azure/azure-functions/functions-bindings-signalr-service)
- [.NET 9.0 Documentation](https://docs.microsoft.com/dotnet/core/whats-new/dotnet-9)
