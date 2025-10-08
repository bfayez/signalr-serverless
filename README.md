# Azure SignalR Service - Serverless Group Messaging Application

This project demonstrates a complete implementation of Azure SignalR Service in Serverless mode using Azure Functions and Angular. Users can join groups and communicate in real-time.

## 🏗️ Architecture

- **Backend**: Azure Functions (Node.js/TypeScript) with SignalR Service bindings
- **Frontend**: Angular (Latest version) with SignalR client library
- **SignalR Service**: Azure SignalR Service (Serverless mode, Free tier)

## 📁 Project Structure

```
signalr-serverless/
├── functions/           # Azure Functions backend
│   ├── src/
│   │   ├── negotiate.ts      # SignalR connection negotiation
│   │   ├── sendMessage.ts    # Send messages to groups
│   │   ├── joinGroup.ts      # Join a group
│   │   ├── leaveGroup.ts     # Leave a group
│   │   └── health.ts         # Health check endpoint
│   ├── package.json
│   ├── tsconfig.json
│   └── host.json
├── client/              # Angular frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/chat/    # Main chat component
│   │   │   ├── services/           # SignalR and health services
│   │   │   └── models/             # TypeScript interfaces
│   └── package.json
├── docs/                # Documentation
│   ├── DEPLOYMENT.md             # Deployment guide
│   ├── MONITORING.md             # Monitoring and diagnostics guide
│   └── TROUBLESHOOTING.md        # Troubleshooting guide
└── README.md
```

## ✨ Features

### Core Functionality
1. ✅ **SignalR Serverless Integration** - Using Azure SignalR Service Free Tier
2. ✅ **Latest Angular Client** - Built with the latest Angular framework
3. ✅ **Group Messaging** - Users can join groups and communicate with other members
4. ✅ **Real-time Communication** - Instant message delivery using WebSocket connections

### Monitoring & Diagnostics
5. ✅ **Azure Monitoring** - Resource logs and metrics configuration
6. ✅ **Connection Troubleshooting** - Tools to detect and simulate connection issues
7. ✅ **Throttling Detection** - Monitor and simulate throttling scenarios
8. ✅ **Diagnostic Client** - Built-in diagnostic capabilities in the client
9. ✅ **Communication Logging** - Detailed logging of all SignalR communications
10. ✅ **Live Trace Tool** - Instructions for using Azure's live trace tool
11. ✅ **Health Check Feature** - Real-time health status monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or later
- Azure subscription (for deployment)
- Azure Functions Core Tools v4
- Angular CLI

### Local Development Setup

#### 1. Setup Azure SignalR Service

```bash
# Create SignalR Service (Free tier)
az signalr create \
  --name <your-signalr-name> \
  --resource-group <your-resource-group> \
  --sku Free_F1 \
  --service-mode Serverless

# Get connection string
az signalr key list \
  --name <your-signalr-name> \
  --resource-group <your-resource-group> \
  --query primaryConnectionString -o tsv
```

#### 2. Setup Backend (Azure Functions)

```bash
cd functions

# Install dependencies
npm install

# Copy and configure local settings
cp local.settings.json.example local.settings.json

# Edit local.settings.json and add your SignalR connection string
# AzureSignalRConnectionString: "Endpoint=https://...;AccessKey=...;Version=1.0;"

# Build the functions
npm run build

# Start the functions locally
npm start
```

The functions will be available at `http://localhost:7071`

#### 3. Setup Frontend (Angular Client)

```bash
cd client

# Install dependencies
npm install

# Start the development server
npm start
```

The application will be available at `http://localhost:4200`

### Using the Application

1. **Connect**: Enter a User ID and click "Connect"
2. **Join Group**: Enter a group name and click "Join Group"
3. **Send Messages**: Type messages and send to all group members
4. **Monitor**: Use the diagnostics panel to view logs and health status

## 📊 Monitoring & Diagnostics

The application includes comprehensive monitoring features:

### Built-in Client Diagnostics
- **Real-time Logs**: View all SignalR communication events
- **Health Checks**: Monitor backend service health
- **Connection Testing**: Simulate connection issues
- **Throttling Testing**: Test rate limiting behavior

### Azure Monitoring
- Resource logs for connection events
- Metrics for message count and connection count
- Live trace tool for real-time debugging
- Application Insights integration

See [MONITORING.md](./docs/MONITORING.md) for detailed instructions.

## 🐛 Troubleshooting

Common issues and solutions:

### Connection Issues
- Verify SignalR connection string is correct
- Check CORS settings on Azure Functions
- Review connection logs in the diagnostic panel

### Throttling
- Free tier has limits: 20 concurrent connections, 20,000 messages/day
- Monitor usage in Azure portal
- Simulate throttling using the built-in test tool

See [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) for more details.

## 🚢 Deployment

For complete deployment instructions to Azure, see [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

### Quick Deploy

```bash
# Deploy Functions
cd functions
func azure functionapp publish <your-function-app-name>

# Deploy Angular App (to Azure Static Web Apps)
cd client
npm run build
# Deploy the dist/ folder to your hosting service
```

## 📚 API Reference

### Azure Functions Endpoints

- `POST /api/negotiate` - Get SignalR connection info
- `POST /api/sendMessage` - Send message to group
- `POST /api/joinGroup` - Join a group
- `POST /api/leaveGroup` - Leave a group
- `GET /api/health` - Health check endpoint

### SignalR Hub Events

- `newMessage` - Receive new messages
- `userJoined` - User joined the group
- `userLeft` - User left the group

## 🔒 Security Considerations

- Functions use anonymous authentication for demo purposes
- In production, implement proper authentication (Azure AD, JWT, etc.)
- Use managed identities for Azure services
- Enable HTTPS only in production
- Implement rate limiting and input validation

## 📝 License

This project is provided as-is for educational and demonstration purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues and questions:
- Check the [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) guide
- Review Azure SignalR Service documentation
- Open an issue on GitHub
