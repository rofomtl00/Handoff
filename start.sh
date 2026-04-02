#!/usr/bin/env bash
# Handoff — One-click launcher
# Double-click this file or run: ./start.sh
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo ""
echo "  ╔═══════════════════════════════════════╗"
echo "  ║            Handoff v0.1.0              ║"
echo "  ║   Universal AI Agent Context           ║"
echo "  ╚═══════════════════════════════════════╝"
echo ""

# ── Check Python ──
PY=""
for cmd in python3 python; do
    if command -v "$cmd" &>/dev/null; then
        VER=$("$cmd" --version 2>&1 | grep -oP '\d+\.\d+' | head -1)
        MAJOR=$(echo "$VER" | cut -d. -f1)
        MINOR=$(echo "$VER" | cut -d. -f2)
        if [ "$MAJOR" -ge 3 ] && [ "$MINOR" -ge 7 ]; then
            PY="$cmd"
            echo "  ✓ Python $VER found"
            break
        fi
    fi
done

if [ -z "$PY" ]; then
    echo "  ⚠ Python 3.7+ not found. Installing..."
    if command -v apt &>/dev/null; then
        sudo apt update -qq && sudo apt install -y python3 python3-pip
    elif command -v dnf &>/dev/null; then
        sudo dnf install -y python3 python3-pip
    elif command -v brew &>/dev/null; then
        brew install python3
    elif command -v pacman &>/dev/null; then
        sudo pacman -S --noconfirm python python-pip
    elif command -v apk &>/dev/null; then
        apk add python3 py3-pip
    else
        echo "  ✗ Cannot install Python automatically."
        echo "  Please install Python 3.7+ from https://python.org/downloads"
        echo "  Then run this script again."
        read -p "  Press Enter to exit..."
        exit 1
    fi
    PY="python3"
    echo "  ✓ Python installed"
fi

# ── Check Flask ──
if ! $PY -c "import flask" 2>/dev/null; then
    echo "  Installing Flask..."
    $PY -m pip install flask --quiet --user 2>/dev/null || $PY -m pip install flask --quiet
    echo "  ✓ Flask installed"
else
    echo "  ✓ Flask ready"
fi

# ── Launch ──
echo ""
echo "  Starting dashboard..."
echo "  Opening http://localhost:9090 in your browser..."
echo ""
echo "  Press Ctrl+C to stop"
echo ""

$PY "$DIR/handoff_gui.py"
