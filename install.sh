#!/bin/bash
set -e

echo "Installing merge..."

npm install -g @mvmerge/merge --registry=https://npm.pkg.github.com

echo ""
echo "Done! Run 'merge' to get started."
