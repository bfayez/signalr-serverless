# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with the Azure SignalR Service Serverless application.

## Table of Contents

1. [Connection Issues](#connection-issues)
2. [Message Delivery Issues](#message-delivery-issues)
3. [Throttling and Rate Limiting](#throttling-and-rate-limiting)
4. [Performance Issues](#performance-issues)
5. [Deployment Issues](#deployment-issues)
6. [Azure Functions Issues](#azure-functions-issues)
7. [Client Application Issues](#client-application-issues)

## Connection Issues

### Issue: Cannot Connect to SignalR Service

**Symptoms:**
- Client shows "Disconnected" status
- Browser console shows connection errors
- No connection ID displayed

**Diagnosis Steps:**

1. **Check SignalR connection string:**
   ```bash
   # Verify connection string is configured
   az functionapp config appsettings list \
     --name <function-app-name> \
     --resource-group <resource-group> \
     --query "[?name=='AzureSignalRConnectionString']"
   ```

2. **Check client logs:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for SignalR-related errors

3. **Verify negotiate endpoint:**
   ```bash
   # Test negotiate endpoint
   curl -X POST https://<function-app-name>.azurewebsites.net/api/negotiate
   ```

**Solutions:**

✅ **Invalid Connection String:**
```bash
# Get correct connection string
az signalr key list \
  --name <signalr-name> \
  --resource-group <resource-group> \
  --query primaryConnectionString -o tsv

# Update function app settings
az functionapp config appsettings set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --settings "AzureSignalRConnectionString=<connection-string>"
```

✅ **CORS Issues:**
```bash
# Add CORS origin
az functionapp cors add \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --allowed-origins "https://your-client-domain.com"

# For local development
az functionapp cors add \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --allowed-origins "http://localhost:4200"
```

✅ **SignalR Service Mode:**
```bash
# Verify service mode is Serverless
az signalr show \
  --name <signalr-name> \
  --resource-group <resource-group> \
  --query "[features[?flag=='ServiceMode'].value]"

# Update to Serverless if needed
az signalr update \
  --name <signalr-name> \
  --resource-group <resource-group> \
  --service-mode Serverless
```

### Issue: Connection Drops Frequently

**Symptoms:**
- Repeated "Reconnecting..." messages
- Intermittent connection loss
- Messages not being received consistently

**Diagnosis:**

1. **Check connection logs:**
   ```kusto
   SignalRServiceDiagnosticLogs
   | where Category == "ConnectivityLogs"
   | where OperationName == "ConnectionDisconnected"
   | extend Reason = tostring(Properties.Reason)
   | summarize Count = count() by Reason
   | order by Count desc
   ```

2. **Monitor network stability:**
   - Check browser DevTools → Network tab
   - Look for WebSocket connection failures
   - Check for network timeout errors

**Solutions:**

✅ **Enable Automatic Reconnection:**
The client already has automatic reconnection enabled. Verify it's working:

```typescript
// In signalr.service.ts - Already implemented
.withAutomaticReconnect({
  nextRetryDelayInMilliseconds: retryContext => {
    return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
  }
})
```

✅ **Increase Timeout Settings:**
```typescript
// Add to connection builder
.withUrl(connectionInfo.url, {
  accessTokenFactory: () => connectionInfo.accessToken,
  timeout: 30000, // 30 seconds
  serverTimeout: 30000
})
```

✅ **Check Azure Service Health:**
```bash
# Check for service issues
az resource health show \
  --resource-group <resource-group> \
  --resource-type "Microsoft.SignalRService/SignalR" \
  --resource-name <signalr-name>
```

### Issue: "Unauthorized" or "Forbidden" Errors

**Symptoms:**
- 401 or 403 error in browser console
- Connection fails immediately
- No connection token received

**Solutions:**

✅ **Verify negotiate function is working:**
```bash
# Test negotiate endpoint
curl -X POST https://<function-app-name>.azurewebsites.net/api/negotiate -v
```

✅ **Check access key:**
```bash
# Regenerate keys if needed
az signalr key renew \
  --name <signalr-name> \
  --resource-group <resource-group> \
  --key-type primary

# Update connection string in function app
```

✅ **Verify function authorization:**
The negotiate function should have `authLevel: 'anonymous'`. Check the function code.

## Message Delivery Issues

### Issue: Messages Not Being Received

**Symptoms:**
- Sent messages don't appear for other users
- No errors in console
- Connection appears healthy

**Diagnosis:**

1. **Verify group membership:**
   ```kusto
   SignalRServiceDiagnosticLogs
   | where Category == "MessagingLogs"
   | where Properties.GroupName == "<group-name>"
   | project TimeGenerated, OperationName, Properties
   ```

2. **Check message logs:**
   ```kusto
   SignalRServiceDiagnosticLogs
   | where Category == "MessagingLogs"
   | where Level == "Error"
   | project TimeGenerated, Message, Properties
   ```

**Solutions:**

✅ **Verify Group Join:**
Ensure users are joining the group before sending messages:

```typescript
// Client must join group first
await signalrService.joinGroup(groupName);
// Then send messages
await signalrService.sendMessage(groupName, message);
```

✅ **Check Event Handler:**
Verify the client is listening for the correct event:

```typescript
// Event name must match
hubConnection.on('newMessage', (message) => {
  // Handle message
});
```

✅ **Verify Function Output Binding:**
Check that sendMessage function has correct groupName in the output:

```typescript
const signalRMessage = {
  groupName: body.groupName,  // Must be set
  target: 'newMessage',
  arguments: [{ ... }]
};
```

### Issue: Messages Delivered Out of Order

**Symptoms:**
- Messages appear in wrong sequence
- Timestamps are correct but order is wrong

**Solutions:**

✅ **Add sequence numbers:**

```typescript
// In sendMessage function
const signalRMessage = {
  groupName: body.groupName,
  target: 'newMessage',
  arguments: [{
    sender: body.sender,
    message: body.message,
    timestamp: new Date().toISOString(),
    sequence: generateSequenceNumber() // Add sequence tracking
  }]
};
```

✅ **Sort messages on client:**

```typescript
// In component
this.messages = this.messages.sort((a, b) => 
  new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
);
```

## Throttling and Rate Limiting

### Issue: "Too Many Requests" (429) Errors

**Symptoms:**
- HTTP 429 errors in console
- Messages fail to send
- Connection attempts rejected

**Diagnosis:**

1. **Check quota usage:**
   ```bash
   # View metrics
   az monitor metrics list \
     --resource "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.SignalRService/SignalR/<name>" \
     --metric ConnectionQuotaUtilization,MessageCount
   ```

2. **Query for throttling:**
   ```kusto
   SignalRServiceDiagnosticLogs
   | where Message contains "throttle" or Message contains "quota" or Message contains "limit"
   | project TimeGenerated, Level, Message, Properties
   ```

**Solutions:**

✅ **Free Tier Limits:**
- Max connections: 20
- Messages per day: 20,000
- Bandwidth: 20 KB/s

✅ **Implement Rate Limiting on Client:**

```typescript
// Add message queue with rate limiting
private messageQueue: Array<{group: string, message: string}> = [];
private isSending = false;

async sendMessageWithRateLimit(group: string, message: string) {
  this.messageQueue.push({group, message});
  
  if (!this.isSending) {
    await this.processMessageQueue();
  }
}

private async processMessageQueue() {
  this.isSending = true;
  
  while (this.messageQueue.length > 0) {
    const msg = this.messageQueue.shift();
    if (msg) {
      try {
        await this.sendMessage(msg.group, msg.message);
        await this.delay(100); // 100ms between messages
      } catch (error) {
        this.messageQueue.unshift(msg); // Re-queue on error
        await this.delay(1000); // Wait longer on error
      }
    }
  }
  
  this.isSending = false;
}
```

✅ **Upgrade Service Tier:**

```bash
# Upgrade to Standard for production
az signalr update \
  --name <signalr-name> \
  --resource-group <resource-group> \
  --sku Standard_S1

# Standard tier limits:
# - 1,000 concurrent connections
# - 1,000,000 messages per day
```

✅ **Implement Exponential Backoff:**

```typescript
async sendWithRetry(group: string, message: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await this.sendMessage(group, message);
      return;
    } catch (error: any) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

## Performance Issues

### Issue: Slow Message Delivery

**Symptoms:**
- Delays between sending and receiving
- High latency
- Messages take seconds to appear

**Diagnosis:**

1. **Check Azure region:**
   ```bash
   # Verify SignalR and Functions are in same region
   az signalr show --name <signalr-name> -g <rg> --query location
   az functionapp show --name <func-name> -g <rg> --query location
   ```

2. **Monitor function performance:**
   ```kusto
   requests
   | where cloud_RoleName == "<function-app-name>"
   | summarize AvgDuration = avg(duration), P95 = percentile(duration, 95) by name
   ```

**Solutions:**

✅ **Use Same Azure Region:**
Deploy all services in the same region to minimize latency:
- SignalR Service: East US
- Function App: East US
- Client hosting: East US (or closest region)

✅ **Optimize Function Performance:**

```typescript
// Enable function app always-on (requires Basic or higher plan)
az functionapp config set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --always-on true

// Use Premium plan for better performance
az functionapp plan create \
  --name premium-plan \
  --resource-group <resource-group> \
  --sku EP1 \
  --is-linux
```

✅ **Reduce Message Size:**

```typescript
// Compress large messages
const message = {
  s: sender,           // Use short keys
  m: messageText,
  t: Date.now()        // Use timestamp instead of ISO string
};
```

### Issue: High Memory Usage in Client

**Symptoms:**
- Browser becomes slow
- Tab crashes
- Console shows memory warnings

**Solutions:**

✅ **Limit Message History:**

```typescript
// In chat component
private maxMessages = 100;

this.signalrService.messages$.subscribe(message => {
  this.messages.push(message);
  
  // Keep only last 100 messages
  if (this.messages.length > this.maxMessages) {
    this.messages = this.messages.slice(-this.maxMessages);
  }
});
```

✅ **Clean Up Subscriptions:**

```typescript
ngOnDestroy(): void {
  // Unsubscribe from all subscriptions
  this.subscriptions.forEach(sub => sub.unsubscribe());
  
  // Disconnect SignalR
  this.signalrService.disconnect();
  
  // Clear messages
  this.messages = [];
}
```

## Deployment Issues

### Issue: Function App Not Starting

**Symptoms:**
- Function endpoints return 503
- Application logs show startup errors
- Functions not listed in portal

**Diagnosis:**

```bash
# View function app logs
az functionapp log tail \
  --name <function-app-name> \
  --resource-group <resource-group>

# Check application settings
az functionapp config appsettings list \
  --name <function-app-name> \
  --resource-group <resource-group>
```

**Solutions:**

✅ **Verify Runtime Settings:**

```bash
# Check Node.js version
az functionapp config show \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --query linuxFxVersion

# Update if needed
az functionapp config set \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --linux-fx-version "NODE|18"
```

✅ **Check Extension Bundle:**

Ensure `host.json` has correct extension bundle:

```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

✅ **Verify Dependencies:**

```bash
# Rebuild functions
cd functions
npm install
npm run build

# Redeploy
func azure functionapp publish <function-app-name>
```

### Issue: Static Web App Not Loading

**Symptoms:**
- Blank page or 404 errors
- Static files not found
- Routing not working

**Solutions:**

✅ **Check Build Output:**

```bash
# Verify build output location
cd client
npm run build
ls -la dist/client/browser  # Should contain index.html
```

✅ **Configure Fallback Routes:**

Create `staticwebapp.config.json` in client root:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.{css,js,png,jpg,gif,svg}"]
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["anonymous"]
    }
  ]
}
```

## Azure Functions Issues

### Issue: SignalR Binding Not Working

**Symptoms:**
- Functions execute but no messages sent
- No errors in logs
- SignalR events not triggered

**Solutions:**

✅ **Verify Extension Bundle:**

Ensure you're using extension bundle v4 or higher in `host.json`.

✅ **Check Output Binding Configuration:**

```typescript
// Correct binding configuration
app.http('sendMessage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  extraOutputs: [
    {
      type: 'signalR',
      name: 'signalRMessages',
      hubName: 'chat',
      connectionStringSetting: 'AzureSignalRConnectionString'
    }
  ],
  handler: async (request, context) => {
    // Set output
    context.extraOutputs.set('signalRMessages', message);
    return { status: 200 };
  }
});
```

✅ **Verify Connection String Setting Name:**

The `connectionStringSetting` must match the app setting name exactly:

```bash
# List settings to verify name
az functionapp config appsettings list \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --query "[?name=='AzureSignalRConnectionString']"
```

## Client Application Issues

### Issue: Angular Build Errors

**Symptoms:**
- `npm run build` fails
- TypeScript compilation errors
- Missing dependencies

**Solutions:**

✅ **Clear Node Modules:**

```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

✅ **Update Dependencies:**

```bash
# Update Angular CLI
npm install -g @angular/cli@latest

# Update project dependencies
ng update @angular/core @angular/cli
```

✅ **Fix TypeScript Errors:**

Check `tsconfig.json` settings:

```json
{
  "compilerOptions": {
    "strict": false,  // Set to false if having strict mode issues
    "strictPropertyInitialization": false
  }
}
```

### Issue: SignalR Client Not Connecting in Production

**Symptoms:**
- Works locally but not in production
- CORS errors in production
- Connection refused errors

**Solutions:**

✅ **Update API URL:**

Ensure production API URL is configured:

```typescript
// In environment.prod.ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://<function-app-name>.azurewebsites.net/api'
};
```

✅ **Configure CORS:**

```bash
# Add production domain to CORS
az functionapp cors add \
  --name <function-app-name> \
  --resource-group <resource-group> \
  --allowed-origins "https://<your-static-web-app>.azurestaticapps.net"
```

✅ **Use HTTPS:**

Ensure all URLs use HTTPS in production:
- Function App URL: `https://...`
- Client URL: `https://...`
- SignalR endpoint: Provided by negotiate, should be HTTPS

## Diagnostic Commands Cheat Sheet

### Quick Health Check

```bash
# Check all resources
az resource list --resource-group <rg> --output table

# Test negotiate endpoint
curl -X POST https://<func-app>.azurewebsites.net/api/negotiate

# Test health endpoint
curl https://<func-app>.azurewebsites.net/api/health

# Check SignalR status
az signalr show --name <signalr-name> -g <rg> --query "{Name:name, Status:provisioningState, Mode:features[?flag=='ServiceMode'].value | [0]}"
```

### View Logs

```bash
# Function app logs (live)
az functionapp log tail -n <func-app> -g <rg>

# SignalR diagnostic logs
az monitor diagnostic-settings show \
  --name signalr-diagnostics \
  --resource <signalr-resource-id>
```

### Common Metrics

```bash
# SignalR connection count
az monitor metrics list \
  --resource <signalr-resource-id> \
  --metric ConnectionCount \
  --start-time 2024-01-01T00:00:00Z \
  --interval PT1M

# Function execution count
az monitor metrics list \
  --resource <function-app-resource-id> \
  --metric FunctionExecutionCount \
  --start-time 2024-01-01T00:00:00Z \
  --interval PT5M
```

## Getting Help

If you're still experiencing issues:

1. **Check Azure Status**: https://status.azure.com
2. **Review Documentation**: 
   - [Azure SignalR Service](https://docs.microsoft.com/azure/azure-signalr/)
   - [Azure Functions](https://docs.microsoft.com/azure/azure-functions/)
3. **Enable Verbose Logging**: Set SignalR client log level to `Debug`
4. **Contact Support**: Open a support ticket in Azure Portal
5. **Community Forums**:
   - Stack Overflow (tag: azure-signalr)
   - Microsoft Q&A

## Additional Resources

- [Azure SignalR Troubleshooting Guide](https://docs.microsoft.com/azure/azure-signalr/signalr-howto-troubleshoot-guide)
- [Azure Functions Troubleshooting](https://docs.microsoft.com/azure/azure-functions/functions-diagnostics)
- [SignalR Client Troubleshooting](https://docs.microsoft.com/aspnet/core/signalr/javascript-client#troubleshooting)
