#!/bin/bash

# Script to build and install the React Native app on all open iOS simulators
# Usage: ./scripts/build-all-simulators.sh

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

# Get simulator names for each UDID
echo "📱 Booted simulators:"
for UDID in $BOOTED_SIMULATORS; do
  SIM_NAME=$(xcrun simctl list devices | grep "$UDID" | sed -E 's/^[[:space:]]*(.+) \([0-9A-F-]+\) \(Booted\).*/\1/')
  echo "  - $SIM_NAME ($UDID)"
done
echo ""

# Build the app first (only once) - Fast Debug build
echo "🔨 Building the app (Debug mode with fast optimizations)..."
cd "$(dirname "$0")/.."
xcodebuild -workspace ios/FaroRNDemo.xcworkspace \
  -scheme FaroRNDemo \
  -configuration Debug \
  -sdk iphonesimulator \
  -arch x86_64 \
  -derivedDataPath ios/build \
  ONLY_ACTIVE_ARCH=YES \
  COMPILER_INDEX_STORE_ENABLE=NO \
  -quiet

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

echo "✅ Build complete"
echo ""

# Find the built app
APP_PATH=$(find ios/build/Build/Products/Debug-iphonesimulator -name "FaroRNDemo.app" -type d | head -1)

if [ -z "$APP_PATH" ]; then
  echo "❌ Could not find built app"
  exit 1
fi

echo "📦 Built app at: $APP_PATH"
echo ""

# Install on each simulator
echo "📲 Installing on all booted simulators..."
for UDID in $BOOTED_SIMULATORS; do
  SIM_NAME=$(xcrun simctl list devices | grep "$UDID" | sed -E 's/^[[:space:]]*(.+) \([0-9A-F-]+\) \(Booted\).*/\1/')

  echo "  Installing on $SIM_NAME..."
  xcrun simctl install "$UDID" "$APP_PATH"

  if [ $? -eq 0 ]; then
    echo "  ✅ Installed on $SIM_NAME"
  else
    echo "  ❌ Failed to install on $SIM_NAME"
  fi
done

echo ""
echo "🎉 Done! App installed on $SIMULATOR_COUNT simulator(s)"
echo ""
echo "To launch the app on all simulators, run:"
echo "  xcrun simctl launch <UDID> com.farorndemo"
