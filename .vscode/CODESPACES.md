# GitHub Codespaces Development Guide

This project is configured for development in GitHub Codespaces with automatic tool installation and manual configuration.

## 🚀 Quick Start

### 1. Open in Codespaces

Click the "Code" button on GitHub and select "Open with Codespaces" to create a new codespace. The environment will automatically install:

- ✅ .NET 9.0 SDK
- ✅ Node.js 18.x
- ✅ Azure Functions Core Tools v4
- ✅ Angular CLI
- ✅ Azure CLI
- ✅ All required VS Code extensions

**⚠️ The application is NOT automatically configured or started.**

### 2. Manual Configuration Required

After the codespace loads, you need to:

1. **Create Azure SignalR Service** (Free tier)
2. **Configure backend** with connection string
3. **Install dependencies** for both backend and frontend
4. **Run the application**

📖 **See [CODESPACES_SETUP.md](../CODESPACES_SETUP.md) for complete step-by-step instructions.**

### 3. Quick Setup Commands

```bash
# 1. Configure backend
cd functions
dotnet restore
cp local.settings.json.example local.settings.json
# Edit local.settings.json with your Azure SignalR connection string
dotnet build

# 2. Configure frontend
cd client
npm install

# 3. Run (choose one option):
# Option A: Press F5 (Debug Full Stack)
# Option B: Manual terminals
#   Terminal 1: cd functions && func start
#   Terminal 2: cd client && npm start
```

#### Option 1: Debug Full Stack (Recommended)
1. Press `F5` or click "Run and Debug" in the sidebar
2. Select "Debug Full Stack" from the dropdown
3. This will start both the Azure Functions backend AND the Angular frontend
4. Set breakpoints in C# or TypeScript code

#### Option 2: Debug Backend Only
1. Select "Debug Azure Functions (C#)" from the debug dropdown
2. Press `F5` to start debugging
3. The Functions will run on http://localhost:7071

#### Option 3: Debug Frontend Only
1. Select "Debug Angular Client" from the debug dropdown
2. Press `F5` to start debugging
3. The Angular app will open on http://localhost:4200

#### Option 4: Manual Terminal Commands
```bash
# Terminal 1 - Start Azure Functions
cd functions
dotnet build
func start

# Terminal 2 - Start Angular Client
cd client
npm start
```

## 🛠️ Development Tools

### VS Code Extensions

The following extensions are automatically installed:

- **C# Dev Kit** - C# development and debugging
- **Azure Functions** - Azure Functions development and deployment
- **Angular Language Service** - Angular template IntelliSense
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **REST Client** - Test APIs directly in VS Code

### API Testing

Use the REST Client extension to test the APIs:

1. Open `.vscode/api-tests.http`
2. Click "Send Request" above any HTTP request
3. View the response in a split pane

Example requests are provided for:
- Health check
- SignalR negotiation
- Joining groups
- Sending messages
- Leaving groups

## 🐛 Debugging

### Set Breakpoints

**C# (Azure Functions):**
- Open any `.cs` file in the `functions/` directory
- Click in the gutter to the left of line numbers to set breakpoints
- Press `F5` to start debugging
- Breakpoints will hit when the function is triggered

**TypeScript/Angular:**
- Open any `.ts` file in `client/src/app/`
- Set breakpoints
- Select "Debug Angular Client" and press `F5`
- Open http://localhost:4200 in your browser
- Breakpoints will hit in VS Code

### Debug Console

- **C#**: Use the Debug Console to evaluate C# expressions
- **TypeScript**: Use the Debug Console for JavaScript expressions
- **Terminal Output**: View function logs in the integrated terminal

### Watch Variables

- Use the "Variables" panel to inspect local and global variables
- Add expressions to the "Watch" panel
- View the call stack in the "Call Stack" panel

## 📦 Building and Testing

### Build Commands

```bash
# Build .NET Functions
cd functions
dotnet build

# Build Angular Client
cd client
npm run build

# Build for production
dotnet publish -c Release  # Functions
npm run build              # Angular
```

### Run Tests

```bash
# Run .NET tests (if you add them)
dotnet test

# Run Angular tests
cd client
npm test
```

## 🔧 Useful Tasks

VS Code tasks are configured for common operations. Access via:
- Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
- Type "Tasks: Run Task"
- Select from available tasks:

### Available Tasks:
- **Install Dependencies** - Restore all packages
- **build (functions)** - Build the .NET project
- **publish (functions)** - Build for deployment
- **func: host start** - Start Azure Functions
- **npm: start - client** - Start Angular dev server
- **npm: build - client** - Build Angular for production
- **Run Full Stack** - Start both backend and frontend

## 🌐 Port Forwarding

The codespace automatically forwards these ports:

- **7071** - Azure Functions backend
- **4200** - Angular frontend

Access forwarded ports:
1. Click the "PORTS" tab in the terminal panel
2. Click the globe icon to open the port in a browser
3. Or click the lock icon to change port visibility

## 📝 Troubleshooting

### Functions Not Starting

```bash
# Check if Functions Core Tools is installed
func --version

# Reinstall if needed
sudo apt-get install -y azure-functions-core-tools-4

# Check local.settings.json exists
ls functions/local.settings.json
```

### Angular Not Starting

```bash
# Check Node.js version
node --version

# Reinstall dependencies
cd client
rm -rf node_modules package-lock.json
npm install
```

### SignalR Connection Issues

1. Verify the connection string in `functions/local.settings.json`
2. Check that the Azure SignalR Service is in "Serverless" mode
3. Ensure CORS is configured (already set to "*" for development)

### Debugging Not Working

1. Make sure you've built the project: `dotnet build` in functions/
2. Check that the debugger is attached (look for the debug toolbar)
3. Verify breakpoints are enabled (they should be red, not gray)

## 🔒 Environment Variables

Development environment variables are managed in:

- **Functions**: `functions/local.settings.json`
- **Angular**: `client/src/environments/environment.ts`

**Never commit `local.settings.json` with real credentials!**

## 📚 Additional Resources

### Project Documentation
- [Main README](../README.md)
- [Quick Start Guide](../QUICKSTART.md)
- [Deployment Guide](../docs/DEPLOYMENT.md)
- [Monitoring Guide](../docs/MONITORING.md)
- [Troubleshooting Guide](../docs/TROUBLESHOOTING.md)

### Azure Resources
- [Azure SignalR Service Docs](https://docs.microsoft.com/azure/azure-signalr/)
- [Azure Functions Docs](https://docs.microsoft.com/azure/azure-functions/)
- [GitHub Codespaces Docs](https://docs.github.com/codespaces)

## 💡 Tips

1. **Use the Command Palette** (`Ctrl+Shift+P`) for quick access to all commands
2. **Split Terminal** - Click the split icon to run multiple terminals side-by-side
3. **IntelliSense** - Press `Ctrl+Space` for code completion suggestions
4. **Quick Fix** - Press `Ctrl+.` on errors to see suggested fixes
5. **Multi-Cursor** - Hold `Alt` and click to add multiple cursors
6. **Zen Mode** - Press `Ctrl+K Z` for distraction-free coding

## 🎯 Next Steps

1. ✅ Environment is set up
2. ⚙️ Configure Azure SignalR connection string
3. 🐛 Press F5 to start debugging
4. 🌐 Open http://localhost:4200 to test the app
5. 📝 Check the [QUICKSTART.md](../QUICKSTART.md) for usage instructions

Happy Coding! 🚀
