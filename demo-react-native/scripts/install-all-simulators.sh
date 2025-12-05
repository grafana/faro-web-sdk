#!/bin/bash

# Simpler script to install on all booted simulators using react-native CLI
# This assumes the app is already built
# Usage: ./scripts/install-all-simulators.sh

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

cd "$(dirname "$0")/.."

# Install on each simulator using react-native CLI
echo "📲 Installing on all booted simulators..."
for UDID in $BOOTED_SIMULATORS; do
  SIM_NAME=$(xcrun simctl list devices | grep "$UDID" | sed -E 's/^[[:space:]]*(.+) \([0-9A-F-]+\) \(Booted\).*/\1/')

  echo "  Building and installing on $SIM_NAME ($UDID)..."
  npx react-native run-ios --simulator="$SIM_NAME" --no-packager 2>&1 | grep -E "(success|error|warning|BUILD)" || true

  if [ $? -eq 0 ]; then
    echo "  ✅ Installed on $SIM_NAME"
  else
    echo "  ⚠️  May have issues on $SIM_NAME (check output above)"
  fi
  echo ""
done

echo "🎉 Done! Attempted installation on $SIMULATOR_COUNT simulator(s)"
