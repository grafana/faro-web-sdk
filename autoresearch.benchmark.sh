#!/bin/bash
set -e

cd "$(dirname "$0")"

# Build core first (needed by web-sdk)
cd packages/core
node bin/genVersion.js 2>/dev/null
../../node_modules/.bin/tsc --build tsconfig.esm.json 2>&1 >/dev/null
../../node_modules/.bin/rollup -c ./rollup.config.js 2>&1 >/dev/null
cd ../..

# Build web-sdk bundle
cd packages/web-sdk
../../node_modules/.bin/rollup -c ./rollup.config.js 2>&1 >/dev/null
cd ../..

# Build web-tracing bundle
cd packages/web-tracing
../../node_modules/.bin/rollup -c ./rollup.config.js 2>&1 >/dev/null
cd ../..

# Measure bundle sizes
CORE_RAW=$(stat -c%s packages/core/dist/bundle/faro-core.iife.js)
CORE_GZ=$(gzip -c packages/core/dist/bundle/faro-core.iife.js | wc -c)

SDK_RAW=$(stat -c%s packages/web-sdk/dist/bundle/faro-web-sdk.iife.js)
SDK_GZ=$(gzip -c packages/web-sdk/dist/bundle/faro-web-sdk.iife.js | wc -c)

TRACING_RAW=$(stat -c%s packages/web-tracing/dist/bundle/faro-web-tracing.iife.js)
TRACING_GZ=$(gzip -c packages/web-tracing/dist/bundle/faro-web-tracing.iife.js | wc -c)

# Total raw bytes (the primary metric we optimize)
TOTAL_RAW=$((CORE_RAW + SDK_RAW + TRACING_RAW))
TOTAL_GZ=$((CORE_GZ + SDK_GZ + TRACING_GZ))

echo "METRIC total_bytes=${TOTAL_RAW}"
echo "METRIC total_gz_bytes=${TOTAL_GZ}"
echo "METRIC core_bytes=${CORE_RAW}"
echo "METRIC core_gz_bytes=${CORE_GZ}"
echo "METRIC sdk_bytes=${SDK_RAW}"
echo "METRIC sdk_gz_bytes=${SDK_GZ}"
echo "METRIC tracing_bytes=${TRACING_RAW}"
echo "METRIC tracing_gz_bytes=${TRACING_GZ}"
