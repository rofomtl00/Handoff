"""
Handoff GUI — Web Dashboard
============================
Open http://localhost:9090 in your browser.
Browse projects, generate context, copy to clipboard, switch agents.
"""

import os
import sys
import json
import threading
import webbrowser
from datetime import datetime, timezone

try:
    from flask import Flask, request, jsonify
except ImportError:
    print("Installing Flask...")
    os.system(f"{sys.executable} -m pip install flask --quiet")
    from flask import Flask, request, jsonify

from handoff import generate_handoff, scan_project, __version__

app = Flask(__name__, static_folder=None)
PROJECTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "projects.json")


def _load_projects() -> list:
    if os.path.exists(PROJECTS_FILE):
        try:
            with open(PROJECTS_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return []


def _save_projects(projects: list):
    with open(PROJECTS_FILE, "w") as f:
        json.dump(projects, f, indent=2)


HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Handoff</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0a0a0a;color:#e0e0e0;min-height:100vh}
.header{background:#111;border-bottom:1px solid #222;padding:16px 24px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:20px;color:#fff}.header h1 span{color:#a78bfa}
.header .ver{font-size:12px;color:#666;margin-left:8px}
.main{max-width:900px;margin:0 auto;padding:24px}

.btn{display:inline-block;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s;text-decoration:none}
.btn-primary{background:#7c3aed;color:#fff}
.btn-primary:hover{background:#6d28d9}
.btn-sm{padding:6px 14px;font-size:13px}
.btn-green{background:#14532d;color:#22c55e}
.btn-green:hover{background:#166534}
.btn-red{background:#450a0a;color:#ef4444}
.btn-red:hover{background:#7f1d1d}
.btn-blue{background:#1e3a5f;color:#60a5fa}
.btn-blue:hover{background:#1e40af}

.field{margin-bottom:16px}
.field label{display:block;font-size:13px;color:#999;margin-bottom:4px;font-weight:500}
.field input{width:100%;padding:10px 12px;background:#0a0a0a;border:1px solid #333;border-radius:6px;color:#fff;font-size:15px;outline:none}
.field input:focus{border-color:#7c3aed}

.card{background:#111;border:1px solid #222;border-radius:10px;padding:20px;margin-bottom:16px}
.card h3{font-size:16px;color:#fff;margin-bottom:4px}
.card .meta{font-size:13px;color:#666;margin-bottom:12px}
.card .actions{display:flex;gap:8px;flex-wrap:wrap}

.empty{text-align:center;padding:60px;color:#666}
.empty h2{color:#999;margin-bottom:8px}

.modal{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);display:none;align-items:center;justify-content:center;z-index:100}
.modal.show{display:flex}
.modal-body{background:#111;border:1px solid #333;border-radius:12px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto}
.modal-body h2{color:#fff;margin-bottom:16px}

.preview{background:#0a0a0a;border:1px solid #222;border-radius:8px;padding:16px;font-family:'SF Mono',Consolas,monospace;font-size:13px;line-height:1.6;white-space:pre-wrap;max-height:500px;overflow-y:auto;color:#ccc;margin:16px 0}

.copied{position:fixed;top:20px;right:20px;background:#14532d;color:#22c55e;padding:12px 20px;border-radius:8px;font-weight:600;display:none;z-index:200}

.agents{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.agent-tag{padding:4px 10px;border-radius:4px;font-size:12px;font-weight:500}
.agent-claude{background:#1a1a2e;color:#a78bfa}
.agent-chatgpt{background:#1a2e1a;color:#22c55e}
.agent-gemini{background:#2e1a1a;color:#60a5fa}
.agent-cursor{background:#1a2e2e;color:#06b6d4}
.agent-copilot{background:#2e2e1a;color:#f59e0b}
</style>
</head>
<body>

<div class="header">
  <h1>Hand<span>off</span> <span class="ver">v""" + __version__ + """</span></h1>
  <button class="btn btn-primary btn-sm" onclick="showAdd()">+ Add Project</button>
</div>

<div class="main" id="app"></div>

<div class="modal" id="addModal">
  <div class="modal-body">
    <h2>Add Project</h2>
    <div class="field">
      <label>Project Folder Path</label>
      <input type="text" id="addPath" placeholder="/home/user/Desktop/MyProject">
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" onclick="addProject()">Scan & Add</button>
      <button class="btn" style="background:#222;color:#999" onclick="hideAdd()">Cancel</button>
    </div>
  </div>
</div>

<div class="modal" id="previewModal">
  <div class="modal-body" style="max-width:800px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h2 id="previewTitle">HANDOFF.md</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-green btn-sm" onclick="copyContent()">Copy to Clipboard</button>
        <button class="btn btn-sm" style="background:#222;color:#999" onclick="hidePreview()">Close</button>
      </div>
    </div>
    <div class="agents">
      <span>Paste into:</span>
      <span class="agent-tag agent-chatgpt">ChatGPT</span>
      <span class="agent-tag agent-gemini">Gemini</span>
      <span class="agent-tag agent-claude">Claude</span>
      <span class="agent-tag agent-cursor">Cursor</span>
      <span class="agent-tag agent-copilot">Copilot</span>
    </div>
    <div class="preview" id="previewContent"></div>
  </div>
</div>

<div class="copied" id="copiedMsg">Copied to clipboard!</div>

<script>
let projects = [];
let currentContent = '';

async function api(path, opts) {
  const r = await fetch(path, opts);
  return await r.json();
}

async function load() {
  projects = await api('/api/projects');
  render();
}

function render() {
  const app = document.getElementById('app');
  if (!projects.length) {
    app.innerHTML = `<div class="empty">
      <h2>No projects yet</h2>
      <p>Click "+ Add Project" to scan your first project</p>
    </div>`;
    return;
  }
  let h = '';
  for (const p of projects) {
    h += `<div class="card">
      <h3>${esc(p.name)}</h3>
      <div class="meta">${esc(p.path)} &middot; ${p.files || '?'} files &middot; ${(p.lines||0).toLocaleString()} lines &middot; ${p.languages || ''}</div>
      <div class="actions">
        <button class="btn btn-primary btn-sm" onclick="generate('${esc(p.path)}', '${esc(p.name)}')">Generate & Copy</button>
        <button class="btn btn-blue btn-sm" onclick="preview('${esc(p.path)}', '${esc(p.name)}')">Preview</button>
        <button class="btn btn-green btn-sm" onclick="refresh('${esc(p.path)}')">Rescan</button>
        <button class="btn btn-red btn-sm" onclick="remove('${esc(p.path)}')">Remove</button>
      </div>
    </div>`;
  }
  app.innerHTML = h;
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function showAdd() { document.getElementById('addModal').classList.add('show'); document.getElementById('addPath').focus(); }
function hideAdd() { document.getElementById('addModal').classList.remove('show'); }
function hidePreview() { document.getElementById('previewModal').classList.remove('show'); }

async function addProject() {
  const path = document.getElementById('addPath').value.trim();
  if (!path) return;
  const r = await api('/api/projects/add', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({path})
  });
  if (r.ok) {
    hideAdd();
    document.getElementById('addPath').value = '';
    load();
  } else {
    alert(r.error || 'Failed to add project');
  }
}

async function remove(path) {
  if (!confirm('Remove this project from Handoff?')) return;
  await api('/api/projects/remove', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({path})
  });
  load();
}

async function refresh(path) {
  const r = await api('/api/projects/scan', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({path})
  });
  if (r.ok) load();
}

async function generate(path, name) {
  const r = await api('/api/generate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({path})
  });
  if (r.content) {
    currentContent = r.content;
    try {
      await navigator.clipboard.writeText(r.content);
      const msg = document.getElementById('copiedMsg');
      msg.style.display = 'block';
      setTimeout(() => msg.style.display = 'none', 2000);
    } catch(e) {
      // Fallback: show preview
      preview(path, name);
    }
  }
}

async function preview(path, name) {
  const r = await api('/api/generate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({path})
  });
  if (r.content) {
    currentContent = r.content;
    document.getElementById('previewTitle').textContent = name + ' — HANDOFF.md';
    document.getElementById('previewContent').textContent = r.content;
    document.getElementById('previewModal').classList.add('show');
  }
}

async function copyContent() {
  try {
    await navigator.clipboard.writeText(currentContent);
    const msg = document.getElementById('copiedMsg');
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 2000);
  } catch(e) {
    // Select all text in preview for manual copy
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('previewContent'));
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }
}

// Enter key in add modal
document.getElementById('addPath').addEventListener('keydown', e => {
  if (e.key === 'Enter') addProject();
});

load();
</script>
</body>
</html>
"""


@app.route("/")
def index():
    return HTML, 200, {"Content-Type": "text/html"}


@app.route("/api/projects")
def list_projects():
    return jsonify(_load_projects())


@app.route("/api/projects/add", methods=["POST"])
def add_project():
    body = request.get_json() or {}
    path = body.get("path", "").strip()
    if not path or not os.path.isdir(path):
        return jsonify({"ok": False, "error": f"Directory not found: {path}"})
    path = os.path.abspath(path)
    projects = _load_projects()
    # Check if already added
    if any(p["path"] == path for p in projects):
        return jsonify({"ok": False, "error": "Project already added"})
    # Scan
    scan = scan_project(path)
    projects.append({
        "name": scan["name"],
        "path": path,
        "files": scan["total_files"],
        "lines": scan["total_lines"],
        "languages": ", ".join(scan["languages"]),
        "added_at": datetime.now(timezone.utc).isoformat(),
    })
    _save_projects(projects)
    return jsonify({"ok": True})


@app.route("/api/projects/remove", methods=["POST"])
def remove_project():
    body = request.get_json() or {}
    path = os.path.abspath(body.get("path", ""))
    projects = _load_projects()
    projects = [p for p in projects if p["path"] != path]
    _save_projects(projects)
    return jsonify({"ok": True})


@app.route("/api/projects/scan", methods=["POST"])
def rescan_project():
    body = request.get_json() or {}
    path = os.path.abspath(body.get("path", ""))
    if not os.path.isdir(path):
        return jsonify({"ok": False, "error": "Directory not found"})
    scan = scan_project(path)
    projects = _load_projects()
    for p in projects:
        if p["path"] == path:
            p["files"] = scan["total_files"]
            p["lines"] = scan["total_lines"]
            p["languages"] = ", ".join(scan["languages"])
            break
    _save_projects(projects)
    return jsonify({"ok": True})


@app.route("/api/generate", methods=["POST"])
def gen():
    body = request.get_json() or {}
    path = os.path.abspath(body.get("path", ""))
    if not os.path.isdir(path):
        return jsonify({"ok": False, "error": "Directory not found"})
    content = generate_handoff(path)
    # Also save to project
    out_path = os.path.join(path, "HANDOFF.md")
    try:
        with open(out_path, "w") as f:
            f.write(content)
    except Exception:
        pass
    return jsonify({"ok": True, "content": content})


def main():
    port = 9090
    print(f"")
    print(f"  Handoff v{__version__}")
    print(f"  Dashboard: http://localhost:{port}")
    print(f"")
    # Open browser automatically
    threading.Timer(1.0, lambda: webbrowser.open(f"http://localhost:{port}")).start()
    app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    main()
