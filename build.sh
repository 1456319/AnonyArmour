#!/usr/bin/env bash

# AnonyArmour Extension Builder
set -e

GREEN='\033[0;32m'
ORANGE='\033[0;33m'
RED='\033[0;31m'
NC='\033[0;0m' # No Color

echo -e "${GREEN}"
echo "=========================================================="
echo "    _                            _                         "
echo "   / \   _ __   ___  _ __  _   _| |__  _ __ ___   ___  _   _ _ __"
echo "  / _ \ | '_ \ / _ \| '_ \| | | | '_ \| '_ \` _ \ / _ \| | | | '__|"
echo " / ___ \| | | | (_) | | | | |_| | |_) | | | | | | (_) | |_| | |   "
echo "/_/   \_\_| |_|\___/|_| |_|\__, |_.__/|_| |_| |_|\___/ \__,_|_|   "
echo "                           |___/                                  "
echo "=========================================================="
echo -e "${NC}"

echo -e "* Cleaning previous build directories..."
rm -rf dist
mkdir -p dist/chrome dist/firefox

echo -e "* Copying common source files..."
cp -R src/* dist/chrome/
cp -R src/* dist/firefox/

echo -e "* Copying browser-specific manifests..."
if [ -f "manifests/chrome/manifest.json" ]; then
  cp manifests/chrome/manifest.json dist/chrome/manifest.json
  echo -e "  [${GREEN}✓${NC}] Assembled Chrome/Brave build"
else
  echo -e "  [${RED}✗${NC}] Chrome manifest missing!"
  exit 1
fi

if [ -f "manifests/firefox/manifest.json" ]; then
  cp manifests/firefox/manifest.json dist/firefox/manifest.json
  echo -e "  [${GREEN}✓${NC}] Assembled Firefox build"
else
  echo -e "  [${RED}✗${NC}] Firefox manifest missing!"
  exit 1
fi

echo -e "\n${GREEN}Build completed successfully!${NC}"
echo -e "----------------------------------------------------------"
echo -e "To load into Brave/Chrome:"
echo -e "  Select: ${ORANGE}$(pwd)/dist/chrome${NC}"
echo -e "To load into Firefox:"
echo -e "  Select: ${ORANGE}$(pwd)/dist/firefox${NC}"
echo -e "----------------------------------------------------------"
