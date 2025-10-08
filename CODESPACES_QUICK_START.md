# 🎯 GitHub Codespaces Quick Reference

## Getting Started (First Time Setup)

1. **Wait for the environment to load** - Dependencies are automatically installed
2. **Configure SignalR Connection**:
   ```bash
   code functions/local.settings.json
   # Add your Azure SignalR connection string
   ```
3. **Press F5** to start debugging both backend and frontend

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
