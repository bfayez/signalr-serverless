# Monitoring and Diagnostics Guide

This guide covers monitoring, logging, and diagnostics for the Azure SignalR Service Serverless application.

## Table of Contents

1. [Enable Monitoring](#enable-monitoring)
2. [Resource Logs](#resource-logs)
3. [Connection Troubleshooting](#connection-troubleshooting)
4. [Throttling Detection](#throttling-detection)
5. [Diagnostic Client](#diagnostic-client)
6. [Live Trace Tool](#live-trace-tool)
7. [Application Insights](#application-insights)

## 1. Enable Monitoring

### 1.1 Azure SignalR Service Metrics

Enable metrics collection for your SignalR Service:

```bash
# Navigate to Azure Portal
# Go to your SignalR Service → Metrics

# Available metrics:
# - Connection Count
# - Message Count
# - Inbound Traffic
# - Outbound Traffic
# - Server Load
# - Connection Quota Usage
# - Message Quota Usage
```

**Key Metrics to Monitor:**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Connection Count | Active connections | > 18 (Free tier limit: 20) |
| Message Count | Messages sent/received | > 18,000/day (Free tier limit: 20K) |
| Connection Quota Usage | % of quota used | > 90% |
| Server Load | Processing load | > 80% |

### 1.2 Create Metric Alerts

```bash
RESOURCE_GROUP="signalr-serverless-rg"
SIGNALR_NAME="your-signalr-name"

# Create alert for high connection count
az monitor metrics alert create \
  --name "SignalR-High-Connection-Count" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.SignalRService/SignalR/$SIGNALR_NAME" \
  --condition "avg ConnectionCount > 18" \
  --description "Alert when connection count exceeds 90% of free tier limit" \
  --evaluation-frequency 1m \
  --window-size 5m \
  --severity 2

# Create alert for message quota
az monitor metrics alert create \
  --name "SignalR-High-Message-Count" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.SignalRService/SignalR/$SIGNALR_NAME" \
  --condition "total MessageCount > 18000" \
  --description "Alert when message count exceeds 90% of daily limit" \
  --evaluation-frequency 5m \
  --window-size 1h \
  --severity 2
```

## 2. Resource Logs

### 2.1 Enable Diagnostic Settings

Resource logs provide detailed information about connections, messages, and operations.

**Via Azure Portal:**

1. Navigate to your SignalR Service
2. Click "Diagnostic settings" in the left menu
3. Click "+ Add diagnostic setting"
4. Configure:
   - Name: `signalr-diagnostics`
   - Logs: Select all categories
     - `AllLogs` (includes all log categories)
   - Metrics: `AllMetrics`
   - Destination: Choose one or more:
     - Log Analytics workspace (recommended)
     - Storage account (for archival)
     - Event Hub (for streaming)

**Via Azure CLI:**

```bash
# Create Log Analytics workspace (if not exists)
az monitor log-analytics workspace create \
  --resource-group $RESOURCE_GROUP \
  --workspace-name signalr-logs-workspace

# Get workspace ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group $RESOURCE_GROUP \
  --workspace-name signalr-logs-workspace \
  --query id -o tsv)

# Create diagnostic settings
az monitor diagnostic-settings create \
  --name signalr-diagnostics \
  --resource "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.SignalRService/SignalR/$SIGNALR_NAME" \
  --logs '[
    {
      "category": "AllLogs",
      "enabled": true,
      "retentionPolicy": {
        "enabled": true,
        "days": 30
      }
    }
  ]' \
  --metrics '[
    {
      "category": "AllMetrics",
      "enabled": true,
      "retentionPolicy": {
        "enabled": true,
        "days": 30
      }
    }
  ]' \
  --workspace $WORKSPACE_ID
```

### 2.2 View Resource Logs

**Example Log Categories:**

1. **ConnectivityLogs**: Connection lifecycle events
2. **MessagingLogs**: Message delivery events
3. **HttpRequestLogs**: HTTP request details

**Query Examples (Log Analytics):**

```kusto
// View all connection events
SignalRServiceDiagnosticLogs
| where Category == "ConnectivityLogs"
| project TimeGenerated, OperationName, Level, Message, Properties
| order by TimeGenerated desc

// View failed connections
SignalRServiceDiagnosticLogs
| where Category == "ConnectivityLogs" and Level == "Error"
| project TimeGenerated, Message, Properties
| order by TimeGenerated desc

// View message delivery failures
SignalRServiceDiagnosticLogs
| where Category == "MessagingLogs" and Level == "Error"
| project TimeGenerated, OperationName, Message
| order by TimeGenerated desc

// Connection count over time
SignalRServiceDiagnosticLogs
| where Category == "ConnectivityLogs"
| summarize ConnectionCount = count() by bin(TimeGenerated, 5m)
| render timechart

// Message count by operation
SignalRServiceDiagnosticLogs
| where Category == "MessagingLogs"
| summarize MessageCount = count() by OperationName
| render piechart
```

## 3. Connection Troubleshooting

### 3.1 Common Connection Issues

**Issue: Cannot establish connection**

Check the following in Log Analytics:

```kusto
SignalRServiceDiagnosticLogs
| where Category == "ConnectivityLogs"
| where Message contains "failed" or Level == "Error"
| project TimeGenerated, OperationName, Message, Properties
| order by TimeGenerated desc
| take 50
```

**Issue: Frequent disconnections**

```kusto
SignalRServiceDiagnosticLogs
| where Category == "ConnectivityLogs"
| where OperationName == "ConnectionDisconnected"
| extend Reason = tostring(Properties.Reason)
| summarize DisconnectionCount = count() by Reason
| order by DisconnectionCount desc
```

### 3.2 Simulate Connection Issues (Client)

The client application includes a built-in connection issue simulator:

```typescript
// In the client application UI:
// 1. Click "Show Diagnostics"
// 2. Click "Simulate Connection Issue"
// This will stop the connection to test reconnection logic
```

**What happens:**
1. Connection is forcefully stopped
2. SignalR client attempts automatic reconnection
3. Exponential backoff retry logic is triggered
4. All events are logged in the diagnostic panel

**Monitor the simulation:**

```kusto
// View reconnection attempts
SignalRServiceDiagnosticLogs
| where Category == "ConnectivityLogs"
| where OperationName in ("ConnectionConnected", "ConnectionDisconnected")
| project TimeGenerated, OperationName, Properties
| order by TimeGenerated desc
```

### 3.3 Connection States to Monitor

| State | Description | Action |
|-------|-------------|--------|
| Connected | Healthy connection | Normal operation |
| Reconnecting | Attempting to reconnect | Monitor reconnection attempts |
| Disconnected | No connection | Check logs for error details |

## 4. Throttling Detection

### 4.1 Throttling Limits (Free Tier)

- **Concurrent Connections**: 20
- **Messages per Day**: 20,000
- **Bandwidth**: 20 KB/s

### 4.2 Monitor for Throttling

**Create Throttling Alert:**

```bash
# Alert when approaching connection limit
az monitor metrics alert create \
  --name "SignalR-Throttling-Warning" \
  --resource-group $RESOURCE_GROUP \
  --scopes "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.SignalRService/SignalR/$SIGNALR_NAME" \
  --condition "avg ConnectionQuotaUtilization > 90" \
  --description "Warning: Approaching connection quota limit" \
  --evaluation-frequency 1m \
  --window-size 5m \
  --severity 1
```

**Query for Throttling Events:**

```kusto
// Check for throttling
SignalRServiceDiagnosticLogs
| where Message contains "throttl" or Message contains "quota" or Message contains "limit"
| project TimeGenerated, Level, Category, Message, Properties
| order by TimeGenerated desc

// Connection quota usage
SignalRServiceDiagnosticLogs
| where Category == "ConnectivityLogs"
| summarize ConnectionAttempts = count() by bin(TimeGenerated, 5m)
| where ConnectionAttempts > 18
| render timechart
```

### 4.3 Simulate Throttling (Client)

The client includes a throttling simulator:

```typescript
// In the client application UI:
// 1. Join a group
// 2. Click "Show Diagnostics"
// 3. Click "Simulate Throttling (100 messages)"
// This sends 100 messages rapidly
```

**Expected behavior:**
- Messages sent in rapid succession
- May hit rate limits
- Errors logged in diagnostic panel
- Monitor for 429 (Too Many Requests) responses

**Monitor simulation results:**

```kusto
// Look for rate limiting errors
SignalRServiceDiagnosticLogs
| where Category == "MessagingLogs"
| where Message contains "rate" or Message contains "throttl" or Properties.StatusCode == 429
| project TimeGenerated, Message, Properties
| order by TimeGenerated desc
```

### 4.4 Throttling Best Practices

1. **Implement backoff logic** in client applications
2. **Batch messages** when possible
3. **Monitor quota usage** proactively
4. **Upgrade to Standard tier** for production (1000 connections, 1M messages/day)

## 5. Diagnostic Client

### 5.1 Built-in Client Diagnostics

The Angular client includes comprehensive diagnostic features:

**Features:**
- ✅ Real-time communication logging
- ✅ Connection state monitoring
- ✅ Message tracking
- ✅ Error logging
- ✅ Performance metrics

**Access Diagnostics:**
1. Open the application
2. Click "Show Logs" to view all SignalR events
3. Click "Show Diagnostics" for testing tools

### 5.2 Log Levels

The client logs at different levels:

- **INFO**: Normal operations (connections, messages)
- **WARN**: Warnings (reconnecting)
- **ERROR**: Errors (connection failures, send failures)
- **DEBUG**: Detailed information (connection details)

### 5.3 Client-Side Logging Configuration

The SignalR service is configured with detailed logging:

```typescript
// From signalr.service.ts
.configureLogging(signalR.LogLevel.Information)
```

**Log Levels:**
- `Trace`: Most detailed
- `Debug`: Debug information
- `Information`: General information (default)
- `Warning`: Warnings
- `Error`: Errors only
- `Critical`: Critical errors only
- `None`: No logging

### 5.4 Export Logs

Logs can be viewed in:
1. **Browser Console**: All logs with details
2. **In-App Log Viewer**: Formatted logs with filtering
3. **Browser DevTools**: Network tab for HTTP requests

## 6. Live Trace Tool

### 6.1 Enable Live Trace

**Via Azure Portal:**

1. Go to your SignalR Service in Azure Portal
2. Click "Live trace settings" in the left menu
3. Enable live trace:
   - Toggle "Enable Live Trace" to ON
   - Select categories to trace:
     - ✅ Connectivity
     - ✅ Messaging
     - ✅ Method invocation
4. Set trace level: `Information` or `Debug`
5. Click "Save"

**Via Azure CLI:**

```bash
# Enable live trace
az signalr update \
  --name $SIGNALR_NAME \
  --resource-group $RESOURCE_GROUP \
  --enable-messaging-logs true
```

### 6.2 Use Live Trace Tool

**Open Live Trace Viewer:**

1. In Azure Portal, go to SignalR Service
2. Click "Live trace tool" in the left menu
3. Click "Start capture"

**Live Trace Features:**

- **Real-time events**: See connections and messages as they happen
- **Filtering**: Filter by:
  - Connection ID
  - User ID
  - Message type
  - Time range
- **Search**: Search through trace data
- **Export**: Download trace data for analysis

### 6.3 Debug Connection Issues with Live Trace

**Scenario: User cannot connect**

1. Start live trace capture
2. Have user attempt to connect
3. In live trace, filter by user ID or connection ID
4. Look for:
   - Connection negotiation events
   - Authentication failures
   - Network errors
   - Protocol handshake issues

**Example trace events:**

```
[INFO] ConnectionConnected - ConnectionId: abc123, UserId: user1
[INFO] MessageReceived - Target: newMessage, Arguments: {...}
[WARN] ConnectionDisconnected - ConnectionId: abc123, Reason: Network error
[ERROR] MessageSendFailed - MessageId: msg456, Error: Connection closed
```

### 6.4 Trace Message Flow

Use live trace to follow a message through the system:

1. **Client sends message** → Function receives HTTP request
2. **Function processes** → SignalR binding invoked
3. **SignalR distributes** → Message sent to group members
4. **Clients receive** → Message delivered to connected clients

Each step is visible in the live trace viewer.

## 7. Application Insights

### 7.1 Enable Application Insights for Functions

```bash
# Create Application Insights
az monitor app-insights component create \
  --app signalr-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type web

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app signalr-insights \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey -o tsv)

# Add to Function App
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY"
```

### 7.2 Application Insights Queries

**Function Performance:**

```kusto
requests
| where cloud_RoleName == "your-function-app-name"
| summarize RequestCount = count(), AvgDuration = avg(duration) by name
| order by RequestCount desc
```

**Error Analysis:**

```kusto
exceptions
| where cloud_RoleName == "your-function-app-name"
| project timestamp, operation_Name, problemId, outerMessage
| order by timestamp desc
```

**Dependency Tracking:**

```kusto
dependencies
| where cloud_RoleName == "your-function-app-name"
| where type == "HTTP" or type == "Azure SignalR"
| summarize Count = count(), AvgDuration = avg(duration) by name, type
```

### 7.3 Custom Telemetry

Add custom telemetry to your functions:

```typescript
import { InvocationContext } from "@azure/functions";

export async function sendMessage(request: HttpRequest, context: InvocationContext) {
  // Track custom event
  context.log('Custom Event', {
    customDimensions: {
      groupName: body.groupName,
      messageLength: body.message.length,
      sender: body.sender
    }
  });
  
  // Track metric
  context.log('Message Size', body.message.length);
}
```

## 8. Monitoring Dashboard

### 8.1 Create Azure Dashboard

1. Go to Azure Portal
2. Click "Dashboard" → "New dashboard"
3. Add tiles:
   - SignalR connection count (metric)
   - SignalR message count (metric)
   - Function execution count (metric)
   - Error rate (metric)
   - Log Analytics query results

### 8.2 Sample Dashboard Queries

**Connection Health:**
```kusto
SignalRServiceDiagnosticLogs
| where Category == "ConnectivityLogs"
| summarize Connected = countif(OperationName == "ConnectionConnected"),
            Disconnected = countif(OperationName == "ConnectionDisconnected")
            by bin(TimeGenerated, 5m)
| render timechart
```

**Message Throughput:**
```kusto
SignalRServiceDiagnosticLogs
| where Category == "MessagingLogs"
| summarize MessageCount = count() by bin(TimeGenerated, 1m)
| render timechart
```

**Error Rate:**
```kusto
SignalRServiceDiagnosticLogs
| summarize ErrorCount = countif(Level == "Error"),
            TotalCount = count()
            by bin(TimeGenerated, 5m)
| extend ErrorRate = ErrorCount * 100.0 / TotalCount
| render timechart
```

## 9. Health Check Monitoring

### 9.1 Implement Health Checks

The application includes a health check endpoint at `/api/health`.

**Monitor health endpoint:**

```bash
# Using Azure Monitor availability test
az monitor app-insights web-test create \
  --resource-group $RESOURCE_GROUP \
  --name "SignalR-Health-Check" \
  --location $LOCATION \
  --web-test-kind "ping" \
  --web-test-name "Health Check" \
  --defined-web-test-name "HealthCheck" \
  --url "https://$FUNCTION_APP_NAME.azurewebsites.net/api/health" \
  --frequency 300 \
  --timeout 30 \
  --enabled true
```

### 9.2 Client Health Monitoring

The client includes health check features:

1. Click "Check Health" button
2. View service health status
3. Monitor in diagnostic panel

**Health Status Indicators:**
- 🟢 **Healthy**: All systems operational
- 🟡 **Degraded**: Some issues detected
- 🔴 **Unhealthy**: Critical issues

## Best Practices

1. **Enable all diagnostic categories** for comprehensive monitoring
2. **Set up alerts** for critical metrics (connection quota, error rate)
3. **Use Log Analytics** for centralized logging
4. **Monitor throttling** proactively, especially on Free tier
5. **Use live trace** for real-time debugging
6. **Implement health checks** for availability monitoring
7. **Review logs regularly** for patterns and issues
8. **Export and archive** logs for compliance

## Additional Resources

- [Azure SignalR Service Monitoring](https://docs.microsoft.com/azure/azure-signalr/signalr-howto-troubleshoot-guide)
- [Azure Monitor Documentation](https://docs.microsoft.com/azure/azure-monitor/)
- [Application Insights](https://docs.microsoft.com/azure/azure-monitor/app/app-insights-overview)
- [Log Analytics Query Language](https://docs.microsoft.com/azure/azure-monitor/log-query/query-language)
