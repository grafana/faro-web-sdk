#!/bin/bash

# Fastest option: Install an already-built app on all booted simulators
# Run this AFTER you've done `yarn ios` once
# Usage: ./scripts/install-existing-build.sh

set -e

echo "🔍 Finding all booted iOS simulators..."

# Get all booted simulator UDIDs
BOOTED_SIMULATORS=$(xcrun simctl list devices | grep "Booted" | grep -oE '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}')

# Count simulators
SIMULATOR_COUNT=$(echo "$BOOTED_SIMULATORS" | grep -c . || echo "0")

if [ "$SIMULATOR_COUNT" -eq "0" ]; then
  echo "❌ No booted simulators found. Please start at least one simulator."
  exit 1
fi

echo "✅ Found $SIMULATOR_COUNT booted simulator(s)"
echo ""

cd "$(dirname "$0")/.."

# Find the most recent build
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/FaroRNDemo-*/Build/Products/Debug-iphonesimulator/FaroRNDemo.app -type d 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
  echo "❌ No existing build found. Please run 'yarn ios' first to build the app."
  echo "   Then run this script to install on additional simulators."
  exit 1
fi

echo "📦 Found app at: $APP_PATH"
echo ""

# Install on each simulator
echo "📲 Installing on all booted simulators..."
for UDID in $BOOTED_SIMULATORS; do
  SIM_NAME=$(xcrun simctl list devices | grep "$UDID" | sed -E 's/^[[:space:]]*(.+) \([0-9A-F-]+\) \(Booted\).*/\1/')

  echo "  Installing on $SIM_NAME..."
  xcrun simctl install "$UDID" "$APP_PATH"

  if [ $? -eq 0 ]; then
    echo "  ✅ Installed on $SIM_NAME"

    # Optionally launch the app
    # Uncomment the next line if you want to auto-launch
    # xcrun simctl launch "$UDID" com.farorndemo
  else
    echo "  ❌ Failed to install on $SIM_NAME"
  fi
done

echo ""
echo "🎉 Done! App installed on $SIMULATOR_COUNT simulator(s)"
echo ""
echo "To launch the app on a specific simulator:"
echo "  xcrun simctl launch <UDID> com.farorndemo"
