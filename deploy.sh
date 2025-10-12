#!/bin/bash
set -e

echo "Starting optimized deployment build..."

# Set production environment
export NODE_ENV=production

# Remove the package layer disable to enable caching
unset REPLIT_DISABLE_PACKAGE_LAYER

# Clean up unnecessary files before build
echo "Cleaning up workspace..."
rm -rf node_modules dist .cache .local
rm -f *.log *.sql *.zip *.backup

# Install all dependencies (including devDependencies needed for build)
echo "Installing dependencies..."
npm install --legacy-peer-deps --no-audit --no-fund

# Verify vite is installed
echo "Verifying build tools..."
npx vite --version || echo "Warning: vite not found"

# Build the application using npx to ensure local packages are used
echo "Building application..."
npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Remove devDependencies to save space (keep only production deps)
echo "Removing dev dependencies to save space..."
npm prune --production

echo "Build completed successfully!"
echo "Final disk usage:"
du -sh node_modules dist 2>/dev/null
