# Deployment Guide - Azure SignalR Service Serverless Application

This guide provides step-by-step instructions for deploying the SignalR Serverless application to Azure.

## Prerequisites

- Azure subscription
- Azure CLI installed and configured
- Node.js 22.x or later (required for Angular 20)
- Azure Functions Core Tools v4
- Azure Static Web Apps CLI (for frontend deployment)

## Architecture Overview

```
┌─────────────┐
│   Angular   │
│   Client    │──────┐
└─────────────┘      │
                     │ HTTPS
                     ▼
              ┌──────────────┐
              │Azure Functions│
              │   (REST API)  │
              └──────────────┘
                     │
                     │ SignalR Binding
                     ▼
              ┌──────────────┐
              │Azure SignalR │
              │   Service    │
              └──────────────┘
```

## Step 1: Create Azure Resources

### 1.1 Create Resource Group

```bash
# Set variables
RESOURCE_GROUP="signalr-serverless-rg"
LOCATION="eastus"
SIGNALR_NAME="signalr-serverless-$(openssl rand -hex 4)"
FUNCTION_APP_NAME="signalr-functions-$(openssl rand -hex 4)"
STORAGE_ACCOUNT_NAME="signalrstorage$(openssl rand -hex 4)"
STATIC_WEB_APP_NAME="signalr-client-$(openssl rand -hex 4)"

# Create resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### 1.2 Create Azure SignalR Service

```bash
# Create SignalR Service (Free tier for development)
az signalr create \
  --name $SIGNALR_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku Free_F1 \
  --service-mode Serverless \
  --location $LOCATION

# Get connection string
SIGNALR_CONNECTION_STRING=$(az signalr key list \
  --name $SIGNALR_NAME \
  --resource-group $RESOURCE_GROUP \
  --query primaryConnectionString -o tsv)

echo "SignalR Connection String: $SIGNALR_CONNECTION_STRING"
```

**Note**: Free tier limits:
- 20 concurrent connections
- 20,000 messages per day
- Use Standard tier for production workloads

### 1.3 Create Storage Account (for Azure Functions)

```bash
az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Standard_LRS
```

### 1.4 Create Function App

```bash
az functionapp create \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --storage-account $STORAGE_ACCOUNT_NAME \
  --consumption-plan-location $LOCATION \
  --runtime dotnet-isolated \
  --runtime-version 9.0 \
  --functions-version 4 \
  --os-type Linux
```

### 1.5 Configure Function App Settings

```bash
# Add SignalR connection string to function app
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings "AzureSignalRConnectionString=$SIGNALR_CONNECTION_STRING"

# Enable CORS for your frontend domain
az functionapp cors add \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --allowed-origins "*"

# For production, replace * with your specific domain:
# --allowed-origins "https://your-domain.azurestaticapps.net"
```

## Step 2: Deploy Azure Functions

### 2.1 Build the Functions

```bash
cd functions
dotnet restore
dotnet build
```

### 2.2 Deploy to Azure

```bash
# Deploy using Azure Functions Core Tools
func azure functionapp publish $FUNCTION_APP_NAME

# Or use Azure CLI with dotnet publish
dotnet publish -c Release
cd bin/Release/net9.0/publish
zip -r ../../../deploy.zip .
cd ../../..
az functionapp deployment source config-zip \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --src deploy.zip
```

### 2.3 Verify Deployment

```bash
# Get function app URL
FUNCTION_APP_URL="https://$FUNCTION_APP_NAME.azurewebsites.net"
echo "Function App URL: $FUNCTION_APP_URL"

# Test health endpoint
curl "$FUNCTION_APP_URL/api/health"
```

## Step 3: Deploy Angular Client

### Option A: Azure Static Web Apps (Recommended)

#### 3.1 Build the Angular App

```bash
cd client
npm install
npm run build
```

#### 3.2 Deploy to Static Web Apps

```bash
# Install Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Create Static Web App
az staticwebapp create \
  --name $STATIC_WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Get deployment token
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list \
  --name $STATIC_WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query properties.apiKey -o tsv)

# Deploy using SWA CLI
swa deploy ./dist/client/browser \
  --deployment-token $DEPLOYMENT_TOKEN \
  --app-name $STATIC_WEB_APP_NAME
```

#### 3.3 Update API Configuration

Update the `environment.prod.ts` or configuration to point to your deployed Function App:

```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://<your-function-app>.azurewebsites.net/api'
};
```

### Option B: Azure App Service

```bash
# Create App Service Plan
az appservice plan create \
  --name signalr-client-plan \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --name signalr-client-web \
  --resource-group $RESOURCE_GROUP \
  --plan signalr-client-plan \
  --runtime "NODE:18-lts"

# Deploy
cd client
npm run build
az webapp deployment source config-zip \
  --name signalr-client-web \
  --resource-group $RESOURCE_GROUP \
  --src ./dist.zip
```

### Option C: Azure Blob Storage (Static Website)

```bash
# Enable static website hosting
az storage blob service-properties update \
  --account-name $STORAGE_ACCOUNT_NAME \
  --static-website \
  --index-document index.html \
  --404-document index.html

# Upload files
cd client/dist/client/browser
az storage blob upload-batch \
  --account-name $STORAGE_ACCOUNT_NAME \
  --destination '$web' \
  --source .

# Get website URL
az storage account show \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "primaryEndpoints.web" -o tsv
```

## Step 4: Configure Application Insights (Optional but Recommended)

### 4.1 Create Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app signalr-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP

# Get instrumentation key
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app signalr-insights \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey -o tsv)
```

### 4.2 Add to Function App

```bash
az functionapp config appsettings set \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings "APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY"
```

## Step 5: Security Configuration

### 5.1 Enable Managed Identity

```bash
# Enable system-assigned managed identity for Function App
az functionapp identity assign \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP

# Get principal ID
PRINCIPAL_ID=$(az functionapp identity show \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId -o tsv)

# Assign SignalR Service role to managed identity
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "SignalR App Server" \
  --scope "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.SignalRService/SignalR/$SIGNALR_NAME"
```

### 5.2 Update CORS for Production

```bash
# Remove wildcard CORS
az functionapp cors remove \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --allowed-origins "*"

# Add specific domain
az functionapp cors add \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --allowed-origins "https://$STATIC_WEB_APP_NAME.azurestaticapps.net"
```

### 5.3 Enable HTTPS Only

```bash
az functionapp update \
  --name $FUNCTION_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set httpsOnly=true
```

## Step 6: Monitoring Setup

See [MONITORING.md](./MONITORING.md) for detailed monitoring configuration.

### Quick Setup

```bash
# Enable diagnostic settings for SignalR
az monitor diagnostic-settings create \
  --name signalr-diagnostics \
  --resource "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.SignalRService/SignalR/$SIGNALR_NAME" \
  --logs '[{"category": "AllLogs", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]' \
  --workspace "/subscriptions/<subscription-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.OperationalInsights/workspaces/<workspace-name>"
```

## Step 7: Verification

### 7.1 Test the Deployment

```bash
# Get the client URL
echo "Client URL: https://$STATIC_WEB_APP_NAME.azurestaticapps.net"

# Test health endpoint
curl "https://$FUNCTION_APP_NAME.azurewebsites.net/api/health"

# Test negotiate endpoint
curl -X POST "https://$FUNCTION_APP_NAME.azurewebsites.net/api/negotiate"
```

### 7.2 Open the Application

1. Navigate to your client URL
2. Enter a user ID and connect
3. Join a group
4. Send messages
5. Open another browser tab to test group messaging

## Environment Variables Reference

### Azure Functions

| Variable | Description | Example |
|----------|-------------|---------|
| AzureSignalRConnectionString | SignalR connection string | Endpoint=https://...;AccessKey=... |
| APPINSIGHTS_INSTRUMENTATIONKEY | Application Insights key | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| FUNCTIONS_WORKER_RUNTIME | Runtime language | node |

### Angular Client

| Variable | Description | Example |
|----------|-------------|---------|
| API_BASE_URL | Function App URL | https://signalr-functions.azurewebsites.net/api |

## Scaling Considerations

### SignalR Service Tiers

- **Free (F1)**: 20 connections, 20K messages/day - Good for development
- **Standard (S1)**: 1000 connections, 1M messages/day - Production use
- **Premium (P1)**: High availability, VNet support

### Function App Scaling

- **Consumption Plan**: Auto-scales, pay per execution
- **Premium Plan**: Pre-warmed instances, VNet support
- **Dedicated Plan**: Fixed pricing, more control

## CI/CD Pipeline (GitHub Actions Example)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy SignalR Serverless

on:
  push:
    branches: [ main ]

jobs:
  deploy-functions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install and Build
        run: |
          cd functions
          npm install
          npm run build
      
      - name: Deploy to Azure Functions
        uses: Azure/functions-action@v1
        with:
          app-name: ${{ secrets.FUNCTION_APP_NAME }}
          package: functions
          publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}

  deploy-client:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Build Angular App
        run: |
          cd client
          npm install
          npm run build
      
      - name: Deploy to Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "client"
          output_location: "dist/client/browser"
```

## Cleanup

To remove all resources:

```bash
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

## Troubleshooting Deployment Issues

### Function App Not Starting
- Check logs: `az functionapp log tail --name $FUNCTION_APP_NAME --resource-group $RESOURCE_GROUP`
- Verify Node.js version compatibility
- Check application settings

### SignalR Connection Failures
- Verify connection string is correct
- Check CORS settings
- Ensure service mode is set to "Serverless"

### CORS Errors
- Update CORS settings on Function App
- Verify allowed origins match your client domain

## Additional Resources

- [Azure SignalR Service Documentation](https://docs.microsoft.com/azure/azure-signalr/)
- [Azure Functions Documentation](https://docs.microsoft.com/azure/azure-functions/)
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/azure/static-web-apps/)
