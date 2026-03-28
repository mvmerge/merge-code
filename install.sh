#!/bin/bash
set -e

REPO="https://github.com/mvmerge/merge-code.git"
INSTALL_DIR="$HOME/.merge"

echo "Installing merge..."

# Check for bun or node
if command -v bun &> /dev/null; then
  RUNNER="bun"
elif command -v node &> /dev/null; then
  RUNNER="node"
else
  echo "Error: bun or node is required. Install bun at https://bun.sh"
  exit 1
fi

# Clone or update
if [ -d "$INSTALL_DIR" ]; then
  echo "Updating existing install..."
  git -C "$INSTALL_DIR" pull --quiet
else
  git clone --quiet --depth=1 "$REPO" "$INSTALL_DIR"
fi

# Install dependencies
cd "$INSTALL_DIR"
if command -v bun &> /dev/null; then
  bun install --quiet
else
  npm install --quiet
fi

# Link the binary
BIN_PATH="/usr/local/bin/merge"
echo "#!/bin/bash" > /tmp/merge-bin
echo "exec bun run --conditions=browser \"$INSTALL_DIR/packages/opencode/src/index.ts\" \"\$@\"" >> /tmp/merge-bin
chmod +x /tmp/merge-bin
mv /tmp/merge-bin "$BIN_PATH" 2>/dev/null || sudo mv /tmp/merge-bin "$BIN_PATH"

echo ""
echo "✓ merge installed! Run 'merge' to get started."
