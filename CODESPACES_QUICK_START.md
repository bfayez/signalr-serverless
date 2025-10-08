# 🎯 GitHub Codespaces Quick Reference

## Automatic Setup (Tools Only)

When you open this project in GitHub Codespaces, the following tools are automatically installed:
- ✅ .NET 9.0 SDK
- ✅ Node.js 18.x
- ✅ Azure Functions Core Tools v4
- ✅ Angular CLI
- ✅ Azure CLI
- ✅ VS Code extensions

**⚠️ You must manually configure and run the application - See [CODESPACES_SETUP.md](CODESPACES_SETUP.md)**

## Quick Setup Steps

1. **Create Azure SignalR Service** (Free tier, Serverless mode)
2. **Configure Backend**:
   ```bash
   cd functions
   dotnet restore
   cp local.settings.json.example local.settings.json
   # Edit local.settings.json with your SignalR connection string
   dotnet build
   ```
3. **Configure Frontend**:
   ```bash
   cd client
   npm install
   ```
4. **Run**: Press F5 or use manual commands

📖 **Full instructions**: [CODESPACES_SETUP.md](CODESPACES_SETUP.md)

## Debug Configurations

| Configuration | Description | Keyboard |
|--------------|-------------|----------|
| **Debug Full Stack** | Start both Functions + Angular | `F5` |
| Debug Azure Functions | C# backend only | Select + `F5` |
| Debug Angular Client | Frontend only | Select + `F5` |
| Attach to .NET Functions | Attach to running process | Select + `F5` |

## Quick Commands

### Start Services Manually
```bash
# Backend (Terminal 1)
cd functions && dotnet build && func start

# Frontend (Terminal 2)  
cd client && npm start
```

### Build for Production
```bash
# Functions
cd functions && dotnet publish -c Release

# Angular
cd client && npm run build
```

### Test APIs
- Open `.vscode/api-tests.http`
- Click "Send Request" above any HTTP request
- View response inline

## Useful Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Quick Open | `Ctrl+P` | `Cmd+P` |
| Toggle Terminal | `Ctrl+`` | `Ctrl+`` |
| Start Debugging | `F5` | `F5` |
| Toggle Breakpoint | `F9` | `F9` |
| Run Tasks | `Ctrl+Shift+B` | `Cmd+Shift+B` |

## Port Forwarding

| Port | Service | URL |
|------|---------|-----|
| 7071 | Azure Functions | http://localhost:7071 |
| 4200 | Angular Client | http://localhost:4200 |

Access ports via the **PORTS** tab in the terminal panel.

## Breakpoint Debugging

### C# Functions
1. Open any `.cs` file in `functions/`
2. Click left gutter to set breakpoint (red dot)
3. Press `F5` and trigger the function
4. Use Debug Console to evaluate C# expressions

### Angular/TypeScript
1. Open any `.ts` file in `client/src/`
2. Set breakpoints
3. Select "Debug Angular Client" and press `F5`
4. Open browser and trigger the code

## Common Tasks

Run via Command Palette (`Ctrl+Shift+P` → "Tasks: Run Task"):

- **Install Dependencies** - Fresh install all packages
- **Run Full Stack** - Start both services
- **build (functions)** - Build C# project
- **publish (functions)** - Production build
- **npm: start - client** - Start Angular
- **npm: build - client** - Build Angular

📖 **For detailed task documentation, see [.vscode/README.md](.vscode/README.md)**

## Troubleshooting

### Functions won't start
```bash
func --version  # Check installation
dotnet build    # Rebuild project
```

### Angular won't start  
```bash
node --version           # Check Node.js
cd client && npm install # Reinstall deps
```

### Can't connect to SignalR
- Verify `functions/local.settings.json` has correct connection string
- Check Azure SignalR is in "Serverless" mode
- Review logs in terminal

## 📚 Documentation

- [Full Codespaces Guide](./.vscode/CODESPACES.md)
- [Quick Start Guide](./QUICKSTART.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

## Next Steps

✅ Environment configured  
⚙️ Add SignalR connection string  
🐛 Press F5 to debug  
🌐 Test at http://localhost:4200  
📖 Read [QUICKSTART.md](./QUICKSTART.md)  

---
💡 **Tip**: Use `Ctrl+K Ctrl+O` to open folder in a new window
