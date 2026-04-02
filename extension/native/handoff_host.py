#!/usr/bin/env python3
"""
Native Messaging Host for Handoff browser extension.
Receives commands from the extension, runs them locally.
Handles: start server, check server, install deps.
"""

import sys
import os
import json
import struct
import subprocess
import threading

HANDOFF_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return None
    length = struct.unpack('=I', raw_length)[0]
    data = sys.stdin.buffer.read(length)
    return json.loads(data.decode('utf-8'))


def send_message(msg):
    encoded = json.dumps(msg).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('=I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def check_python():
    for cmd in ['python3', 'python']:
        try:
            r = subprocess.run([cmd, '--version'], capture_output=True, text=True, timeout=5)
            if r.returncode == 0 and '3.' in r.stdout:
                return cmd
        except Exception:
            pass
    return None


def check_server():
    import urllib.request
    try:
        urllib.request.urlopen('http://localhost:9090/api/projects', timeout=2)
        return True
    except Exception:
        return False


def start_server():
    py = check_python()
    if not py:
        return {"ok": False, "error": "Python3 not found"}

    # Install flask if needed
    try:
        subprocess.run([py, '-c', 'import flask'], capture_output=True, timeout=10)
    except Exception:
        subprocess.run([py, '-m', 'pip', 'install', 'flask', '--quiet', '--user'],
                       capture_output=True, timeout=60)

    # Start the GUI server in background
    gui_path = os.path.join(HANDOFF_DIR, 'handoff_gui.py')
    if not os.path.exists(gui_path):
        return {"ok": False, "error": f"handoff_gui.py not found at {gui_path}"}

    subprocess.Popen(
        [py, gui_path],
        cwd=HANDOFF_DIR,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )

    # Wait for it to come up
    import time
    for _ in range(10):
        time.sleep(0.5)
        if check_server():
            return {"ok": True, "message": "Server started on http://localhost:9090"}

    return {"ok": False, "error": "Server started but not responding yet. Try again in a few seconds."}


def main():
    while True:
        msg = read_message()
        if msg is None:
            break

        action = msg.get('action', '')

        if action == 'check':
            running = check_server()
            py = check_python()
            send_message({"ok": True, "server_running": running, "python": py is not None})

        elif action == 'start':
            result = start_server()
            send_message(result)

        elif action == 'ping':
            send_message({"ok": True, "pong": True})

        else:
            send_message({"ok": False, "error": f"Unknown action: {action}"})


if __name__ == '__main__':
    main()
