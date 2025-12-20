#!/bin/bash
# Validation script to test the production build locally before deploying

set -e  # Exit on any error

echo "🔍 JuiceHub Build Validation"
echo "=============================="
echo ""

# 1. Clean build
echo "1️⃣  Cleaning previous builds..."
npm run clean
echo "✅ Clean complete"
echo ""

# 2. Install dependencies
echo "2️⃣  Installing dependencies..."
npm run install-all
echo "✅ Dependencies installed"
echo ""

# 3. Run production build
echo "3️⃣  Running production build..."
npm run build
echo "✅ Build complete with zero errors"
echo ""

# 4. Verify dist directories exist
echo "4️⃣  Verifying build outputs..."
required_dirs=(
  "00_Base/dist"
  "01_Data/dist"
  "02_Util/dist"
  "03_Modules/Configuration/dist"
  "03_Modules/EVDriver/dist"
  "03_Modules/Monitoring/dist"
  "03_Modules/OcppRouter/dist"
  "03_Modules/Reporting/dist"
  "03_Modules/SmartCharging/dist"
  "03_Modules/Transactions/dist"
  "Server/dist"
)

for dir in "${required_dirs[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "❌ Missing build output: $dir"
    exit 1
  fi
  echo "  ✓ $dir exists"
done
echo "✅ All build outputs verified"
echo ""

# 5. Verify Server entry point exists
echo "5️⃣  Verifying server entry point..."
if [ ! -f "Server/dist/index.js" ]; then
  echo "❌ Missing Server/dist/index.js"
  exit 1
fi
echo "✅ Server entry point exists"
echo ""

# 6. Check for assets
echo "6️⃣  Verifying assets were copied..."
if [ ! -d "Server/dist/assets" ]; then
  echo "❌ Missing Server/dist/assets"
  exit 1
fi
if [ ! -f "Server/dist/assets/logo.png" ]; then
  echo "❌ Missing logo.png asset"
  exit 1
fi
echo "✅ Assets verified"
echo ""

# 7. Test Docker build locally (optional - requires Docker)
if command -v docker &> /dev/null; then
  echo "7️⃣  Testing Docker build locally..."
  echo "   (This simulates the Render.com build process)"

  cd Server
  docker build -f deploy.Dockerfile -t juicehub-core-test ..

  if [ $? -eq 0 ]; then
    echo "✅ Docker build successful"
    echo ""
    echo "🎉 Would you like to test the container locally? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
      echo ""
      echo "Starting test container..."
      echo "This will start the server with your .env configuration."
      echo "Press Ctrl+C to stop."
      echo ""
      docker run --rm --env-file ../.env -p 8080:8080 juicehub-core-test
    fi
  else
    echo "❌ Docker build failed"
    exit 1
  fi
  cd ..
else
  echo "7️⃣  Skipping Docker test (Docker not installed)"
  echo ""
fi

echo "✅ All validation checks passed!"
echo ""
echo "📝 Summary:"
echo "  • Build completed with zero errors"
echo "  • All module outputs verified"
echo "  • Assets copied successfully"
echo "  • Server entry point exists"
echo ""
echo "🚀 Your build is ready for deployment!"
