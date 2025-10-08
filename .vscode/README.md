# VS Code Configuration

This directory contains VS Code workspace configuration files that enhance the development experience for the SignalR Serverless project.

## 📋 tasks.json - Purpose and Usage

The `tasks.json` file defines automated tasks that can be run from within VS Code to streamline development workflows. These tasks eliminate the need to remember complex commands and provide a consistent way to build, run, and manage the project.

### What is tasks.json?

VS Code Tasks allow you to automate repetitive command-line operations. The tasks.json file in this project configures pre-defined tasks for:

- **Building** the .NET backend
- **Running** Azure Functions locally
- **Starting** the Angular development server
- **Installing** project dependencies
- **Running** the full stack application

### How to Run Tasks

There are multiple ways to execute tasks:

#### Method 1: Command Palette
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type "Tasks: Run Task"
3. Select the task you want to run from the list

#### Method 2: Keyboard Shortcut
- Press `Ctrl+Shift+B` (Windows/Linux) or `Cmd+Shift+B` (macOS) to run the default build task

#### Method 3: Terminal Menu
- Go to **Terminal** → **Run Task...** in the menu bar

### Available Tasks

#### Backend (Azure Functions) Tasks

| Task Name | Purpose | Command | Dependencies |
|-----------|---------|---------|--------------|
| `clean (functions)` | Clean build artifacts | `dotnet clean` | None |
| `build (functions)` | Build the .NET project | `dotnet build` | `clean (functions)` |
| `clean release (functions)` | Clean release build | `dotnet clean --configuration Release` | None |
| `publish (functions)` | Build for production deployment | `dotnet publish --configuration Release` | `clean release (functions)` |
| `func: host start` | Start Azure Functions locally | `func host start` | `build (functions)` |

#### Frontend (Angular) Tasks

| Task Name | Purpose | Command |
|-----------|---------|---------|
| `npm: start - client` | Start Angular dev server | `npm start` |
| `npm: build - client` | Build Angular for production | `npm run build` |

#### Utility Tasks

| Task Name | Purpose | Command |
|-----------|---------|---------|
| `Install Dependencies` | Install all dependencies | `dotnet restore && cd client && npm install` |
| `Run Full Stack` | Start both backend and frontend | Runs `func: host start` + `npm: start - client` |

### Task Features

#### Background Tasks
Tasks marked with `"isBackground": true` run continuously in the background:
- `func: host start` - Keeps Functions running
- `npm: start - client` - Keeps Angular dev server running

#### Task Dependencies
Some tasks automatically run prerequisite tasks:
- `build (functions)` → First runs `clean (functions)`
- `publish (functions)` → First runs `clean release (functions)`
- `func: host start` → First runs `build (functions)`
- `Run Full Stack` → Runs both `func: host start` and `npm: start - client`

#### Problem Matchers
Tasks use problem matchers to parse output and highlight errors in VS Code:
- `$msCompile` - For .NET compilation errors
- `$func-dotnet-watch` - For Azure Functions runtime issues
- Custom patterns - For Angular build issues

### Common Task Workflows

#### First Time Setup
```
Run Task: "Install Dependencies"
```
This installs both .NET and npm packages.

#### Daily Development
```
Run Task: "Run Full Stack"
```
This builds and starts both backend and frontend services.

#### Production Build
```
1. Run Task: "publish (functions)"
2. Run Task: "npm: build - client"
```

#### Quick Backend-Only Development
```
Run Task: "func: host start"
```

#### Quick Frontend-Only Development
```
Run Task: "npm: start - client"
```

### Task Configuration Details

Tasks are configured in `tasks.json` with the following structure:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Task Name",           // Display name
      "type": "process",               // Task type (process, shell, npm, etc.)
      "command": "command-to-run",     // The actual command
      "args": [...],                   // Command arguments
      "options": {
        "cwd": "${workspaceFolder}/path"  // Working directory
      },
      "dependsOn": "other-task",       // Run this task first
      "problemMatcher": "$msCompile",  // How to parse errors
      "isBackground": true             // Run in background
    }
  ]
}
```

### Customizing Tasks

You can modify tasks.json to:

1. **Change ports**: Update `LocalHttpPort` in function tasks
2. **Add new tasks**: Define custom build or deployment tasks
3. **Modify build configurations**: Add different build profiles
4. **Add environment variables**: Set environment-specific settings

Example - Adding a custom task:
```json
{
  "label": "Run Tests",
  "type": "shell",
  "command": "dotnet test",
  "options": {
    "cwd": "${workspaceFolder}/functions"
  },
  "problemMatcher": "$msCompile"
}
```

### Integration with Other VS Code Features

Tasks work seamlessly with:

- **launch.json**: Debug configurations can depend on tasks (e.g., build before debug)
- **settings.json**: Workspace settings that affect task execution
- **extensions.json**: Recommended extensions that provide task types (e.g., Azure Functions extension)

## 📁 Other Configuration Files

### launch.json
Defines debug configurations for starting and debugging the application. Includes:
- Debug Full Stack
- Debug Azure Functions (C#)
- Debug Angular Client
- Attach to .NET Functions

### settings.json
Workspace-specific VS Code settings for:
- File associations
- Editor preferences
- Extension configurations

### extensions.json
Recommended VS Code extensions for this project:
- C# Dev Kit
- Azure Functions
- Angular Language Service
- ESLint
- Prettier
- REST Client

### api-tests.http
REST Client test file for testing API endpoints directly in VS Code.

### CODESPACES.md
GitHub Codespaces-specific development guide.

## 📚 Further Reading

- [VS Code Tasks Documentation](https://code.visualstudio.com/docs/editor/tasks)
- [Task Schema Reference](https://code.visualstudio.com/docs/editor/tasks-appendix)
- [Variables Reference](https://code.visualstudio.com/docs/editor/variables-reference)
- [Azure Functions in VS Code](https://code.visualstudio.com/docs/azure/functions)

## 🆘 Troubleshooting Tasks

### Task Not Found
**Issue**: "No task to run found" error  
**Solution**: Make sure you're in the workspace root and tasks.json exists

### Task Fails to Run
**Issue**: Task exits with error  
**Solution**: 
1. Check the Terminal output for error messages
2. Verify dependencies are installed
3. Check working directory is correct

### Background Task Won't Stop
**Issue**: Background task keeps running  
**Solution**: 
1. Open Terminal panel
2. Click the trash icon next to the running task
3. Or use `Ctrl+C` in the terminal

### Task Dependencies Not Running
**Issue**: Dependent tasks don't execute  
**Solution**: Check the `dependsOn` property is correctly specified

## 💡 Tips

- Use `Ctrl+Shift+B` for quick access to build tasks
- Check the **Terminal** panel to see task output
- Tasks can be run simultaneously (e.g., "Run Full Stack")
- Use task presentation options to control how output is displayed
- Create user-level tasks in your personal settings for custom workflows

---

For more information about the project setup and development, see:
- [CODESPACES.md](./CODESPACES.md) - Codespaces development guide
- [../QUICKSTART.md](../QUICKSTART.md) - Quick start guide
- [../README.md](../README.md) - Project overview
