#!/bin/bash
set -e

echo "Verifying Node.js installation..."
which node
node --version

# Set production environment
export NODE_ENV=production

# Remove the package layer disable to enable caching
unset REPLIT_DISABLE_PACKAGE_LAYER

# Clean up unnecessary files before build
echo "Cleaning up workspace..."
rm -rf node_modules dist .cache .local
rm -f *.log *.sql *.zip *.backup
rm -rf node_modules/.vite-temp

# Continue with your existing build steps
npm install
npm run build

echo "Verifying build tools..."
npm install --no-save vite@^5.4.19 @vitejs/plugin-react@^4.3.2
npx vite --version || echo "Warning: vite not found"

# Build the application using npx to ensure local packages are used
echo "Building application..."
npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "Build completed successfully!"
echo "Final disk usage:"
du -sh node_modules dist 2>/dev/null