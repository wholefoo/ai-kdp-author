#!/bin/bash
set -e

echo "Starting optimized deployment build..."

# Set production environment
export NODE_ENV=production

# Remove the package layer disable to enable caching
unset REPLIT_DISABLE_PACKAGE_LAYER

# Clean up only safe directories
echo "Cleaning up workspace..."
rm -rf node_modules dist
rm -f *.log *.sql *.zip *.backup

# Install all dependencies with retry logic
echo "Installing dependencies..."
MAX_RETRIES=3
RETRY_DELAY=15

for i in $(seq 1 $MAX_RETRIES); do
  echo "Install attempt $i of $MAX_RETRIES..."
  if npm ci --legacy-peer-deps --no-audit --no-fund; then
    echo "Dependencies installed successfully."
    break
  else
    if [ "$i" -eq "$MAX_RETRIES" ]; then
      echo "ERROR: Failed to install dependencies after $MAX_RETRIES attempts."
      exit 1
    fi
    echo "Attempt $i failed. Retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  fi
done

# Verify vite is installed
echo "Verifying build tools..."
npx vite --version || echo "Warning: vite not found"

# Build the application using npx to ensure local packages are used
echo "Building application..."
npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Verify dist folder was created
echo "Verifying build output..."
ls -la dist/

# Keep all dependencies for production (some may be needed at runtime)
echo "Build completed successfully!"
echo "Final disk usage:"
du -sh node_modules dist 2>/dev/null
