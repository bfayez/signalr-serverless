# Quick Start Guide

Get the SignalR Serverless application running locally in minutes.

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18.x or later installed
- ✅ npm installed
- ✅ An Azure account with an active subscription
- ✅ Azure CLI installed (for deployment)

## Step 1: Create Azure SignalR Service

### Option A: Using Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource" → Search for "SignalR Service"
3. Click "Create"
4. Configure:
   - **Resource Group**: Create new or select existing
   - **Name**: Choose a unique name (e.g., `signalr-demo-xyz`)
   - **Region**: Choose nearest region
   - **Pricing Tier**: **Free F1** (for testing)
   - **Service Mode**: **Serverless**
5. Click "Review + Create" → "Create"
6. Once deployed, go to resource → "Keys" → Copy "Connection String"

### Option B: Using Azure CLI

```bash
# Login to Azure
az login

# Set variables
RESOURCE_GROUP="signalr-serverless-rg"
LOCATION="eastus"
SIGNALR_NAME="signalr-demo-$(openssl rand -hex 4)"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create SignalR Service (Free tier)
az signalr create \
  --name $SIGNALR_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku Free_F1 \
  --service-mode Serverless \
  --location $LOCATION

# Get connection string
az signalr key list \
  --name $SIGNALR_NAME \
  --resource-group $RESOURCE_GROUP \
  --query primaryConnectionString -o tsv
```

**Save the connection string** - you'll need it in the next step.

## Step 2: Setup Azure Functions Backend

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Create local settings file
cp local.settings.json.example local.settings.json

# Edit local.settings.json and paste your SignalR connection string
# Replace the placeholder with your actual connection string
```

Edit `functions/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureSignalRConnectionString": "Endpoint=https://YOUR-SIGNALR.service.signalr.net;AccessKey=YOUR-KEY;Version=1.0;"
  },
  "Host": {
    "LocalHttpPort": 7071,
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

Build and start the functions:

```bash
# Build TypeScript
npm run build

# Start functions locally (requires Azure Functions Core Tools)
# If you don't have it: npm install -g azure-functions-core-tools@4
npm start
```

You should see:

```
Functions:
    health: [GET,POST] http://localhost:7071/api/health
    joinGroup: [POST] http://localhost:7071/api/joinGroup
    leaveGroup: [POST] http://localhost:7071/api/leaveGroup
    negotiate: [GET,POST] http://localhost:7071/api/negotiate
    sendMessage: [POST] http://localhost:7071/api/sendMessage
```

**Keep this terminal running** and open a new terminal for the next step.

## Step 3: Setup Angular Client

In a new terminal:

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start development server
npm start
```

The application will open at `http://localhost:4200`

## Step 4: Test the Application

### Single User Test

1. **Open the application** at `http://localhost:4200`
2. **Enter User ID**: Type any username (e.g., "Alice")
3. **Click "Connect"**: Wait for "Status: Connected"
4. **Enter Group Name**: Type a group name (e.g., "general")
5. **Click "Join Group"**: You'll see "Current Group: general"
6. **Send a message**: Type "Hello!" and click "Send"

### Multi-User Test

1. **Open another browser tab** (or incognito window)
2. Go to `http://localhost:4200`
3. **Enter different User ID**: (e.g., "Bob")
4. **Connect and join the SAME group** ("general")
5. **Send messages** from either tab
6. **Observe real-time communication** between users!

## Step 5: Explore Features

### View Logs

1. Click "**Show Logs**" button
2. See all SignalR events in real-time
3. Logs include:
   - Connection events
   - Message sent/received
   - Group join/leave
   - Errors and warnings

### Check Health

1. Click "**Check Health**" button
2. View backend service status
3. See configuration details

### Test Diagnostics

1. Click "**Show Diagnostics**"
2. Try "**Simulate Connection Issue**":
   - Disconnects and auto-reconnects
   - Watch logs for reconnection events
3. Try "**Simulate Throttling**":
   - Sends 100 messages rapidly
   - May trigger rate limiting

## Common Issues & Solutions

### Issue: Functions won't start

**Error**: `Cannot find module '@azure/functions'`

**Solution**:
```bash
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Cannot connect to SignalR

**Check**:
1. Functions are running (check terminal)
2. Connection string is correct in `local.settings.json`
3. Browser console for errors (F12 → Console)

**Test negotiate endpoint**:
```bash
curl -X POST http://localhost:7071/api/negotiate
# Should return connection info
```

### Issue: CORS errors in browser

**Solution**: Already configured in `local.settings.json` with `"CORS": "*"`

If still having issues, restart the functions.

### Issue: Messages not received

**Check**:
1. Both users joined the SAME group (exact name)
2. Check browser console for errors
3. Look at "Show Logs" for message events

## Next Steps

### Deploy to Azure

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for complete deployment instructions.

Quick deploy commands:

```bash
# Deploy Functions
cd functions
func azure functionapp publish <your-function-app-name>

# Build and deploy Client
cd ../client
npm run build
# Deploy dist/client/browser to Azure Static Web Apps or App Service
```

### Enable Monitoring

See [MONITORING.md](./docs/MONITORING.md) for:
- Setting up Application Insights
- Configuring resource logs
- Creating metric alerts
- Using Live Trace Tool

### Customize the App

**Change SignalR hub name**:
- In functions: Update `hubName: 'chat'` in all functions
- In client: Ensure event listeners match

**Add authentication**:
- Update function `authLevel` from `'anonymous'` to `'function'` or `'admin'`
- Implement Azure AD or custom authentication

**Modify UI**:
- Edit `client/src/app/components/chat/chat.component.html`
- Update styles in `chat.component.css`

## Architecture Overview

```
┌─────────────────┐
│  Angular Client │  (Port 4200)
│  - Join groups  │
│  - Send messages│
│  - View logs    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│ Azure Functions │  (Port 7071)
│  - negotiate    │
│  - sendMessage  │
│  - joinGroup    │
│  - leaveGroup   │
│  - health       │
└────────┬────────┘
         │ SignalR Binding
         ▼
┌─────────────────┐
│  Azure SignalR  │  (Serverless mode)
│    Service      │
│  - Free tier    │
│  - 20 max conn  │
│  - 20K msgs/day │
└─────────────────┘
```

## Testing Checklist

- [ ] Functions start without errors
- [ ] Client loads at localhost:4200
- [ ] Can connect with User ID
- [ ] Can join a group
- [ ] Can send messages in group
- [ ] Messages appear in real-time
- [ ] Second user can join same group
- [ ] Both users see each other's messages
- [ ] Logs show all events
- [ ] Health check returns status
- [ ] Connection simulation works
- [ ] Can disconnect cleanly

## Free Tier Limits

**Azure SignalR Service (Free F1)**:
- Max concurrent connections: **20**
- Messages per day: **20,000**
- Message size: Up to 1MB
- Bandwidth: 20 KB/s

**Upgrade to Standard** for production:
```bash
az signalr update \
  --name $SIGNALR_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku Standard_S1
```

Standard tier provides:
- 1,000 concurrent connections
- 1,000,000 messages/day
- Better performance and reliability

## Resources

- **Main README**: [README.md](./README.md)
- **Deployment Guide**: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
- **Monitoring Guide**: [docs/MONITORING.md](./docs/MONITORING.md)
- **Troubleshooting**: [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- **Functions README**: [functions/README.md](./functions/README.md)
- **Client README**: [client/README.md](./client/README.md)

## Support

- **Azure SignalR Docs**: https://docs.microsoft.com/azure/azure-signalr/
- **Azure Functions Docs**: https://docs.microsoft.com/azure/azure-functions/
- **Angular Docs**: https://angular.io/docs
- **Issue Tracker**: GitHub Issues

---

🎉 **Congratulations!** You now have a working SignalR Serverless application with real-time group messaging!
