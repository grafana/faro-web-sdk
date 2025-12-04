#!/bin/bash

# Fix React Hooks Issue in Faro Demo
# This script sets up the demo to properly use the local SDK package

echo "🔧 Fixing React Hooks issue..."
echo ""

# Step 1: Kill any running Metro processes
echo "1️⃣  Stopping any running Metro processes..."
killall node 2>/dev/null || true
sleep 1

# Step 2: Clean watchman
echo "2️⃣  Clearing watchman cache..."
watchman watch-del-all 2>/dev/null || echo "Watchman not installed or no watches to clear"

# Step 3: Remove node_modules and reinstall
echo "3️⃣  Reinstalling dependencies..."
rm -rf node_modules
yarn install

# Step 4: Clear Metro cache
echo "4️⃣  Clearing Metro bundler cache..."
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf $TMPDIR/metro-* 2>/dev/null || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "Now run:"
echo "  yarn start --reset-cache    (in one terminal)"
echo "  yarn ios                     (in another terminal)"
echo ""
