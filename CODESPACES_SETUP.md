# GitHub Codespaces Setup Guide

This guide provides step-by-step instructions for configuring and running the Azure SignalR Serverless application in GitHub Codespaces.

## Overview

When you open this project in GitHub Codespaces, the environment automatically installs:
- ✅ .NET 9.0 SDK
- ✅ Node.js 22.x (required for Angular 20)
- ✅ Azure Functions Core Tools v4
- ✅ Angular CLI
- ✅ Azure CLI
- ✅ **Azurite (Azure Storage Emulator)** - Auto-started for local storage
- ✅ Required VS Code extensions

**You need to manually configure and run the application following the steps below.**

> **Note:** Azurite is automatically installed and running in the background, so `AzureWebJobsStorage: "UseDevelopmentStorage=true"` works out of the box!

---

## Step 1: Create Azure SignalR Service

### Option A: Using Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"Create a resource"**
3. Search for **"SignalR Service"**
4. Click **"Create"**
5. Fill in the details:
   - **Resource Group**: Create new or use existing
   - **Name**: Choose a unique name (e.g., `myapp-signalr`)
   - **Region**: Choose closest to you
   - **Pricing Tier**: **Free** (F1)
   - **Service Mode**: **Serverless**
6. Click **"Review + Create"** then **"Create"**
7. After deployment, go to **"Keys"** and copy the **Connection String**

### Option B: Using Azure CLI (in Codespaces Terminal)

```bash
# Set variables
RESOURCE_GROUP="my-signalr-rg"
SIGNALR_NAME="myapp-signalr-$(date +%s)"
LOCATION="eastus"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create SignalR Service (Free tier, Serverless mode)
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
  --query primaryConnectionString \
  --output tsv
```

**Save the connection string** - you'll need it in the next step.

---

## Step 2: Configure Azure Functions Backend

### 2.1 Restore .NET Dependencies

Open a terminal in Codespaces and run:

```bash
cd functions
dotnet restore
```

### 2.2 Create Local Settings File

```bash
# Create local.settings.json from the example
cp local.settings.json.example local.settings.json
```

### 2.3 Add SignalR Connection String

Edit `functions/local.settings.json`:

```bash
code functions/local.settings.json
```

Replace the placeholder with your actual Azure SignalR connection string:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "AzureSignalRConnectionString": "Endpoint=https://YOUR-SIGNALR.service.signalr.net;AccessKey=YOUR-KEY;Version=1.0;"
  },
  "Host": {
    "LocalHttpPort": 7071,
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

**Important**: 
- Replace `YOUR-SIGNALR` and `YOUR-KEY` with your actual values.
- **`AzureWebJobsStorage: "UseDevelopmentStorage=true"`** uses Azurite (already running) - no changes needed!

### 2.4 Build the Functions

```bash
# Still in the functions directory
dotnet build
```

You should see:

```
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

---

## Step 3: Setup Angular Client

### 3.1 Install Node.js Dependencies

Open a **new terminal** (keep the Functions terminal open) and run:

```bash
cd client
npm install
```

This will install all Angular dependencies. It may take 1-2 minutes.

### 3.2 Verify Environment Configuration (Optional)

The client is pre-configured to connect to `http://localhost:7071`. If you need to change this:

Edit `client/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:7071'
};
```

---

## Step 4: Run the Application

You have **three options** to run the application:

### Option 1: Debug with F5 (Recommended for Development)

1. Press **F5** or click **"Run and Debug"** in the sidebar
2. Select **"Debug Full Stack"** from the dropdown
3. Both services will start with debugging enabled
4. Breakpoints will work in both C# and TypeScript code
5. The browser will automatically open to `http://localhost:4200`

**Ports forwarded:**
- `7071` - Azure Functions (backend)
- `4200` - Angular (frontend)

### Option 2: Use VS Code Tasks

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type **"Tasks: Run Task"**
3. Select **"Run Full Stack"**
4. Both backend and frontend will start

### Option 3: Manual Terminal Commands

**Terminal 1 - Start Azure Functions:**
```bash
cd functions
func start
```

You should see:

```
Functions:
    health: [GET,POST] http://localhost:7071/api/health
    joinGroup: [POST] http://localhost:7071/api/joinGroup
    leaveGroup: [POST] http://localhost:7071/api/leaveGroup
    negotiate: [GET,POST] http://localhost:7071/api/negotiate
    sendMessage: [POST] http://localhost:7071/api/sendMessage

For detailed output, run func with --verbose flag.
```

**Terminal 2 - Start Angular Client:**
```bash
cd client
npm start
```

You should see:

```
✔ Browser application bundle generation complete.
  ➜  Local:   http://localhost:4200/
```

**Terminal 3 - Open the Application:**

Click the **"Ports"** tab in the terminal panel, then click the globe icon next to port 4200 to open the application in your browser.

---

## Step 5: Test the Application

### 5.1 Access the Application

- **Frontend**: http://localhost:4200 (or use forwarded port)
- **Backend Health Check**: http://localhost:7071/api/health

### 5.2 Test Group Messaging

1. **Open the frontend** in your browser
2. **Enter your name** (e.g., "Alice")
3. **Join a group** (e.g., "test-group")
4. **Open another browser tab** (or incognito window)
5. **Enter a different name** (e.g., "Bob")
6. **Join the same group** ("test-group")
7. **Send messages** between Alice and Bob
8. **View the diagnostics panel** to see connection logs

### 5.3 Test with REST Client (Optional)

Open `.vscode/api-tests.http` and click **"Send Request"** above any HTTP request to test the APIs directly:

- Health check
- SignalR negotiation
- Join group
- Send message
- Leave group

---

## Step 6: Debugging

### Set Breakpoints in C# (Backend)

1. Open any `.cs` file in `functions/` (e.g., `SendMessageFunction.cs`)
2. Click in the left gutter next to a line number to set a breakpoint (red dot appears)
3. Trigger the function by sending a message in the UI
4. The debugger will pause at the breakpoint
5. Use the **Debug Console** to inspect variables

### Set Breakpoints in TypeScript (Frontend)

1. Open any `.ts` file in `client/src/app/` (e.g., `signalr.service.ts`)
2. Set a breakpoint
3. Make sure you started with **"Debug Angular Client"** configuration
4. Trigger the code by interacting with the UI
5. The debugger will pause in VS Code

### View Logs

- **Functions Logs**: Terminal 1 (where `func start` is running)
- **Angular Logs**: Browser Developer Console (F12)
- **SignalR Logs**: Diagnostics panel in the application UI

---

## Common Tasks

### Rebuild Backend

```bash
cd functions
dotnet clean
dotnet build
```

### Rebuild Frontend

```bash
cd client
npm run build
```

### Restart Functions (if running)

Press `Ctrl+C` in the Functions terminal, then:

```bash
func start
```

### Restart Angular (if running)

Press `Ctrl+C` in the Angular terminal, then:

```bash
npm start
```

### Install New Dependencies

**Backend:**
```bash
cd functions
dotnet add package PackageName
dotnet restore
```

**Frontend:**
```bash
cd client
npm install package-name --save
```

---

## Troubleshooting

### Issue: Functions won't start

**Check 1**: Verify Azure Functions Core Tools is installed
```bash
func --version
# Should show: 4.x.x
```

**Check 2**: Verify local.settings.json exists and has the connection string
```bash
cat functions/local.settings.json
```

**Check 3**: Rebuild the project
```bash
cd functions
dotnet clean
dotnet build
```

### Issue: Angular won't start

**Check 1**: Verify Node.js version
```bash
node --version
# Should be 18.x or later
```

**Check 2**: Clear and reinstall dependencies
```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

### Issue: Can't connect to SignalR

**Check 1**: Verify the connection string in `functions/local.settings.json` is correct

**Check 2**: Make sure Azure SignalR Service is in **Serverless** mode
```bash
az signalr show --name <your-signalr-name> --resource-group <your-rg> --query "serviceMode"
```

**Check 3**: Check CORS settings in `functions/local.settings.json`:
```json
"Host": {
  "CORS": "*"
}
```

### Issue: Port already in use

**Solution 1**: Find and kill the process
```bash
# Find process on port 7071
lsof -i :7071

# Kill the process (replace PID)
kill -9 <PID>
```

**Solution 2**: Change the port in `functions/local.settings.json`:
```json
"Host": {
  "LocalHttpPort": 7072
}
```

Then update `client/src/environments/environment.ts` to use the new port.

### Issue: Breakpoints not working

**C# Breakpoints:**
- Make sure you selected **"Debug Azure Functions (C#)"** or **"Debug Full Stack"**
- Rebuild: `dotnet build`
- Check that the debugger is attached (look for debug toolbar)

**TypeScript Breakpoints:**
- Make sure you selected **"Debug Angular Client"** or **"Debug Full Stack"**
- Verify source maps are enabled in `client/tsconfig.json`

---

## Next Steps

### Deploy to Azure

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete deployment instructions.

### Enable Monitoring

See [docs/MONITORING.md](docs/MONITORING.md) to set up:
- Azure Monitor
- Application Insights
- Resource logs
- Diagnostic settings
- Live Trace Tool

### Troubleshooting Guide

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for:
- Connection issues
- Throttling detection
- Performance optimization
- Common errors and solutions

---

## Quick Reference Commands

### Backend (Functions)
```bash
cd functions
dotnet restore          # Restore dependencies
dotnet build           # Build project
func start             # Run locally
dotnet publish -c Release  # Build for deployment
```

### Frontend (Angular)
```bash
cd client
npm install            # Install dependencies
npm start              # Run dev server
npm run build          # Build for production
npm test               # Run tests
```

### Azure CLI
```bash
# Login
az login

# List SignalR services
az signalr list --output table

# Get connection string
az signalr key list --name <name> --resource-group <rg> --query primaryConnectionString
```

### Debugging
- **F5** - Start debugging (select configuration first)
- **F9** - Toggle breakpoint
- **F10** - Step over
- **F11** - Step into
- **Shift+F11** - Step out
- **Ctrl+Shift+F5** - Restart debugging

---

## Additional Resources

- [QUICKSTART.md](QUICKSTART.md) - Quick start guide for local development
- [CODESPACES_QUICK_START.md](CODESPACES_QUICK_START.md) - Quick reference card
- [.vscode/CODESPACES.md](.vscode/CODESPACES.md) - VS Code tips and tricks
- [README.md](README.md) - Project overview
- [Azure SignalR Service Docs](https://docs.microsoft.com/azure/azure-signalr/)
- [Azure Functions Docs](https://docs.microsoft.com/azure/azure-functions/)

---

## Support

For issues or questions:
1. Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
2. Review the [README.md](README.md)
3. Open an issue on GitHub

---

**Happy Coding in Codespaces! 🚀**
