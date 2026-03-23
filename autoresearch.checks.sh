#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Running core tests..."
cd packages/core && npx jest --passWithNoTests 2>&1
cd ../..

echo "Running web-sdk tests..."
cd packages/web-sdk && npx jest --passWithNoTests 2>&1
cd ../..

echo "Running web-tracing tests..."
cd packages/web-tracing && npx jest --passWithNoTests 2>&1
cd ../..

echo "All tests passed!"
