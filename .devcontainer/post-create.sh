#!/bin/bash

# Post-create script for GitHub Codespaces
echo "🚀 Setting up Azure SignalR Serverless development environment..."

# Install Azure Functions Core Tools
echo "📦 Installing Azure Functions Core Tools..."
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/debian/$(lsb_release -rs | cut -d'.' -f 1)/prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
sudo apt-get update
sudo apt-get install -y azure-functions-core-tools-4

# Install Angular CLI globally
echo "📦 Installing Angular CLI..."
npm install -g @angular/cli

# Restore .NET dependencies
echo "📦 Restoring .NET dependencies..."
cd /workspaces/*/functions && dotnet restore

# Install Node.js dependencies for Angular client
echo "📦 Installing Angular dependencies..."
cd /workspaces/*/client && npm install

# Create local.settings.json if it doesn't exist
echo "⚙️ Setting up local.settings.json..."
cd /workspaces/*/functions
if [ ! -f "local.settings.json" ]; then
    cp local.settings.json.example local.settings.json
    echo "✅ Created local.settings.json from example"
    echo "⚠️  Remember to add your Azure SignalR connection string to local.settings.json"
fi

# Display versions
echo ""
echo "✅ Environment setup complete!"
echo ""
echo "📋 Installed versions:"
echo "  .NET: $(dotnet --version)"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  Angular CLI: $(ng version --minimal 2>/dev/null | head -1)"
echo "  Azure Functions Core Tools: $(func --version)"
echo ""
echo "🎯 Next steps:"
echo "  1. Add your Azure SignalR connection string to functions/local.settings.json"
echo "  2. Press F5 or use 'Run and Debug' to start debugging"
echo "  3. Use the integrated terminal to run 'npm start' in the client directory"
echo ""
