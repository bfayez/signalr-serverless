# Angular Client - SignalR Serverless Frontend

This is the Angular frontend application for the SignalR Serverless group messaging system.

## Features

- ✅ Real-time group messaging using Azure SignalR Service
- ✅ Connection management with automatic reconnection
- ✅ Group join/leave functionality
- ✅ Comprehensive logging and diagnostics
- ✅ Health monitoring
- ✅ Connection issue simulation
- ✅ Throttling simulation and detection
- ✅ Live trace tool integration

## Prerequisites

- Node.js 18.x or later
- Angular CLI (latest version)
- Running Azure Functions backend

## Quick Start

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm start
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any source files.

### Build for Production

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Application Structure

```
client/src/app/
├── components/
│   └── chat/
│       ├── chat.component.ts       # Main chat component
│       ├── chat.component.html     # Chat UI template
│       └── chat.component.css      # Chat styles
├── services/
│   ├── signalr.service.ts         # SignalR communication service
│   └── health.service.ts          # Health check service
├── models/
│   └── signalr.models.ts          # TypeScript interfaces
├── app.ts                         # Root component
├── app.html                       # Root template
└── app.routes.ts                  # Routing configuration
```

## Using the Application

### 1. Connect to SignalR

1. Enter a unique User ID
2. (Optional) Update API Base URL if different from default
3. Click "Connect"

### 2. Join a Group

1. After connecting, enter a Group Name
2. Click "Join Group"
3. You'll receive notifications when other users join

### 3. Send Messages

1. Type your message in the text field
2. Click "Send" or press Enter
3. All group members will receive the message in real-time

### 4. Monitor and Diagnose

**View Logs:**
- Click "Show Logs" to view all SignalR communication events
- Logs include connection events, messages, errors, and warnings
- Color-coded by severity (info, warn, error, debug)

**Check Health:**
- Click "Check Health" to verify backend service status
- Displays service version, status, and configuration

**Diagnostics Panel:**
- Click "Show Diagnostics" to access testing tools
- Simulate connection issues to test reconnection logic
- Simulate throttling by sending many messages rapidly
- View instructions for Azure Live Trace Tool

### 5. Testing Features

**Connection Testing:**
1. Click "Simulate Connection Issue"
2. Observe automatic reconnection in logs
3. Monitor reconnection attempts and success

**Throttling Testing:**
1. Join a group first
2. Click "Simulate Throttling (100 messages)"
3. Sends 100 messages rapidly
4. Check logs for any rate limiting errors

## Services

### SignalR Service

The `SignalrService` handles all SignalR communication:

```typescript
// Connect to SignalR
await signalrService.connect(userId);

// Join a group
await signalrService.joinGroup(groupName);

// Send message
await signalrService.sendMessage(groupName, message);

// Leave group
await signalrService.leaveGroup(groupName);

// Disconnect
await signalrService.disconnect();
```

**Features:**
- Automatic reconnection with exponential backoff
- Comprehensive logging of all events
- Error handling and recovery
- Connection state management

**Observables:**
- `connectionState$`: Connection status updates
- `messages$`: Incoming messages
- `userJoined$`: User join events
- `userLeft$`: User leave events
- `logs$`: All diagnostic logs

### Health Service

The `HealthService` monitors backend health:

```typescript
// Check health
const status = await healthService.checkHealth();

// Subscribe to health updates
healthService.healthStatus$.subscribe(status => {
  console.log('Health:', status);
});
```

## Configuration

### API Base URL

Update the API URL to point to your deployed Azure Functions:

**In the UI:**
- Update the "API Base URL" field before connecting

**In Code (environment.ts):**
```typescript
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:7071/api'
};
```

**For Production (environment.prod.ts):**
```typescript
export const environment = {
  production: true,
  apiBaseUrl: 'https://<your-function-app>.azurewebsites.net/api'
};
```

## Logging

### Log Levels

- **INFO**: Normal operations (connections, messages sent/received)
- **WARN**: Warnings (reconnecting, connection issues)
- **ERROR**: Errors (connection failures, send failures)
- **DEBUG**: Detailed debug information

### Viewing Logs

**In-App Log Viewer:**
1. Click "Show Logs" in the UI
2. Logs are color-coded by level
3. Click "Clear Logs" to reset

**Browser Console:**
- All logs are also output to browser console
- Open DevTools (F12) → Console tab
- Filter by level if needed

### Log Export

Logs are stored in memory (last 100 entries). To export:

```typescript
// Access logs programmatically
signalrService.logs$.subscribe(logs => {
  // Export to file, send to server, etc.
  console.log(JSON.stringify(logs));
});
```

## Monitoring & Diagnostics

### Connection Monitoring

The app displays real-time connection status:
- 🟢 **Connected**: Active SignalR connection
- 🔴 **Disconnected**: No connection
- 🟡 **Reconnecting**: Attempting to reconnect

### Message Tracking

All messages include:
- Sender information
- Message content
- Timestamp
- Delivery status (in logs)

### Performance Metrics

Monitor in logs:
- Connection establishment time
- Message delivery latency
- Reconnection attempts
- Error rates

## Troubleshooting

### Cannot Connect

**Check:**
1. Backend is running and accessible
2. API Base URL is correct
3. CORS is configured on backend
4. SignalR connection string is set
5. Browser console for errors

**Solution:**
```bash
# Verify backend is running
curl http://localhost:7071/api/health

# Check negotiate endpoint
curl -X POST http://localhost:7071/api/negotiate
```

### Messages Not Received

**Check:**
1. User has joined the group
2. Other users are in the same group
3. Backend logs for errors
4. SignalR event handler is registered

**Solution:**
- Verify group name matches exactly
- Check logs for message send/receive events
- Ensure backend SignalR output binding is correct

### Throttling Errors

**Symptoms:**
- 429 errors in logs
- Messages fail to send
- Connection drops

**Solution:**
- Reduce message frequency
- Implement rate limiting on client
- Upgrade SignalR Service tier
- Use message batching

### Build Errors

**Common issues:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Update Angular CLI
npm install -g @angular/cli@latest

# Update project
ng update @angular/core @angular/cli
```

## Deployment

### Azure Static Web Apps

```bash
# Build
npm run build

# Deploy using Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli
swa deploy ./dist/client/browser \
  --deployment-token <token> \
  --app-name <app-name>
```

### Azure App Service

```bash
# Build
npm run build

# Create deployment package
cd dist/client/browser
zip -r ../../../deploy.zip .

# Deploy
az webapp deployment source config-zip \
  --name <app-name> \
  --resource-group <rg> \
  --src deploy.zip
```

### Azure Blob Storage (Static Website)

```bash
# Build
npm run build

# Enable static website
az storage blob service-properties update \
  --account-name <storage-account> \
  --static-website \
  --index-document index.html

# Upload files
az storage blob upload-batch \
  --account-name <storage-account> \
  --destination '$web' \
  --source ./dist/client/browser
```

## Development Tips

### Hot Reload

The dev server supports hot reload. Changes to TypeScript, HTML, or CSS files will automatically refresh the browser.

### Debug Mode

Enable verbose SignalR logging:

```typescript
// In signalr.service.ts
.configureLogging(signalR.LogLevel.Debug) // Change to Debug
```

### Testing Locally

1. Start backend: `cd ../functions && func start`
2. Start frontend: `npm start`
3. Open multiple browser tabs to test group messaging
4. Use different User IDs in each tab

### Simulating Network Issues

Use browser DevTools to simulate:
- **Offline mode**: DevTools → Network → Offline
- **Slow 3G**: DevTools → Network → Slow 3G
- **Throttling**: Use built-in simulation tool

## Scripts

- `npm start`: Start development server
- `npm run build`: Build for production
- `npm test`: Run unit tests
- `npm run watch`: Build in watch mode
- `npm run lint`: Lint code (if configured)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Additional Resources

- [Angular Documentation](https://angular.io/docs)
- [SignalR JavaScript Client](https://docs.microsoft.com/aspnet/core/signalr/javascript-client)
- [Azure SignalR Service](https://docs.microsoft.com/azure/azure-signalr/)
- [RxJS Documentation](https://rxjs.dev/)
