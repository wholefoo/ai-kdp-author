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

# Install all dependencies (needed for build)
echo "Installing dependencies..."
npm install --legacy-peer-deps --no-audit --no-fund

# Build the application
echo "Building application..."
npm run build

# Remove devDependencies to save space (keep only production deps)
echo "Removing dev dependencies to save space..."
npm prune --production

echo "Build completed successfully!"
echo "Final disk usage:"
du -sh node_modules dist 2>/dev/null
