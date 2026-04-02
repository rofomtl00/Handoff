#!/usr/bin/env bash
# Register Handoff native messaging host for Firefox and Chrome
# Run once after installing the extension
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_PATH="$DIR/extension/native/handoff_host.py"
chmod +x "$HOST_PATH"

# Generate manifest with correct absolute path
generate_manifest() {
  cat <<EOF
{
  "name": "handoff_host",
  "description": "Handoff Native Messaging Host",
  "path": "$HOST_PATH",
  "type": "stdio",
  "$1": ["$2"]
}
EOF
}

# Firefox
FF_DIR="$HOME/.mozilla/native-messaging-hosts"
mkdir -p "$FF_DIR"
generate_manifest "allowed_extensions" "handoff@rofomtl00" > "$FF_DIR/handoff_host.json"
echo "  ✓ Firefox: registered"

# Chrome
CH_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
if [ -d "$HOME/.config/google-chrome" ]; then
  mkdir -p "$CH_DIR"
  generate_manifest "allowed_origins" "chrome-extension://*/" > "$CH_DIR/handoff_host.json"
  echo "  ✓ Chrome: registered"
fi

# Chromium
CR_DIR="$HOME/.config/chromium/NativeMessagingHosts"
if [ -d "$HOME/.config/chromium" ]; then
  mkdir -p "$CR_DIR"
  generate_manifest "allowed_origins" "chrome-extension://*/" > "$CR_DIR/handoff_host.json"
  echo "  ✓ Chromium: registered"
fi

# Brave
BR_DIR="$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
if [ -d "$HOME/.config/BraveSoftware" ]; then
  mkdir -p "$BR_DIR"
  generate_manifest "allowed_origins" "chrome-extension://*/" > "$BR_DIR/handoff_host.json"
  echo "  ✓ Brave: registered"
fi

echo ""
echo "  Done. Reload the Handoff extension in your browser."
echo "  The 'Start Server' button will now work automatically."
