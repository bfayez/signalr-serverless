#!/bin/bash

# Post-create script for GitHub Codespaces - Tool Installation Only
echo "🚀 Installing development tools for Azure SignalR Serverless..."

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

# Display installed versions
echo ""
echo "✅ Tool installation complete!"
echo ""
echo "📋 Installed versions:"
echo "  .NET SDK: $(dotnet --version)"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  Angular CLI: $(ng version --minimal 2>/dev/null | head -1)"
echo "  Azure Functions Core Tools: $(func --version)"
echo "  Azure CLI: $(az version --output tsv --query '\"azure-cli\"' 2>/dev/null || echo 'installed')"
echo ""
echo "📚 Next Steps - See CODESPACES_SETUP.md for detailed instructions:"
echo ""
echo "  1️⃣  Configure Azure SignalR Service"
echo "      - Create Azure SignalR Service (Free tier)"
echo "      - Copy connection string"
echo ""
echo "  2️⃣  Setup Backend"
echo "      cd functions"
echo "      dotnet restore"
echo "      cp local.settings.json.example local.settings.json"
echo "      # Edit local.settings.json with your connection string"
echo ""
echo "  3️⃣  Setup Frontend"
echo "      cd client"
echo "      npm install"
echo ""
echo "  4️⃣  Run the Application"
echo "      # Backend: cd functions && func start"
echo "      # Frontend: cd client && npm start"
echo "      # Or press F5 to debug"
echo ""
echo "📖 For complete instructions, see: CODESPACES_SETUP.md"
echo ""
