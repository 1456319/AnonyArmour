#!/usr/bin/env bash

# AnonyArmour Extension Installer & Status Helper
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

echo -e "* Verifying project files..."
REQUIRED_FILES=("manifest.json" "background.js" "content.js" "popup.html" "popup.js" "README.md")
MISSING=0

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "  [${GREEN}✓${NC}] Found: $file"
  else
    echo -e "  [${RED}✗${NC}] Missing: $file"
    MISSING=$((MISSING + 1))
  fi
done

if [ $MISSING -gt 0 ]; then
  echo -e "${RED}Error: Project validation failed. Missing $MISSING files.${NC}"
  exit 1
fi

echo -e "\n* Verifying Git repository status..."
if [ -d ".git" ]; then
  UNTRACKED=$(git status --porcelain | wc -l)
  if [ "$UNTRACKED" -gt 0 ]; then
    echo -e "  [${ORANGE}!${NC}] Detected uncommitted changes. Pushing update..."
    git add .
    git commit -m "Auto-commit: files initialized/updated by install script" || true
    git push origin main || echo -e "  [${ORANGE}!${NC}] Push skipped. Set up your upstream repository credentials to sync updates."
  else
    echo -e "  [${GREEN}✓${NC}] Git status is clean."
  fi
else
  echo -e "  [${ORANGE}!${NC}] Directory is not initialized as a git repository."
fi

echo -e "\n${GREEN}AnonyArmour is fully configured!${NC}"
echo -e "----------------------------------------------------------"
echo -e "To load into your browser:"
echo -e "  1. Open Brave and go to URL: ${ORANGE}brave://extensions/${NC}"
echo -e "  2. Enable ${ORANGE}Developer Mode${NC} (toggle in top-right)"
echo -e "  3. Click ${ORANGE}Load Unpacked${NC} (top-left)"
echo -e "  4. Select this directory: ${GREEN}$(pwd)${NC}"
echo -e "----------------------------------------------------------"
