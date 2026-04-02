"""
Handoff — Universal AI Agent Context
=====================================
Generates a portable project context file that any AI agent can read.
Switch between Claude, ChatGPT, Gemini, Copilot, Cursor — without losing context.

Usage:
    python handoff.py                    # Scan current directory, generate HANDOFF.md
    python handoff.py /path/to/project   # Scan specific project
    python handoff.py --update           # Update existing HANDOFF.md with changes
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone
from pathlib import Path

__version__ = "0.1.0"

# Files to scan for existing agent context
AGENT_CONTEXT_FILES = [
    # AI agent context
    "CLAUDE.md", ".claude/settings.json",
    ".cursorrules", ".cursorignore",
    ".github/copilot-instructions.md",
    ".aider.conf.yml", ".aider.chat.history.md",
    "AGENTS.md", "AI_CONTEXT.md",
    "README.md", "CONTRIBUTING.md",
    "ARCHITECTURE.md", "DECISIONS.md",
    # Video/film project notes
    "notes.txt", "notes.md", "NOTES.md",
    "brief.txt", "brief.md", "brief.pdf",
    "script.txt", "script.md", "screenplay.md",
    "storyboard.md", "shotlist.md", "shot_list.md",
    "edit_notes.txt", "edit_notes.md",
    "color_notes.txt", "color_notes.md",
    "sound_notes.txt", "mix_notes.txt",
    # Video edit decision lists
    "timeline.edl", "project.edl",
    "timeline.xml", "project.xml",
    "timeline.fcpxml",
    # Music project notes
    "lyrics.txt", "lyrics.md",
    "mix_notes.md", "arrangement.md",
    "session_notes.txt", "session_notes.md",
    # Design project notes
    "design_brief.md", "style_guide.md", "brand_guide.md",
    "specs.md", "requirements.md",
    # General project docs
    "TODO.md", "TODO.txt", "CHANGELOG.md",
    "PROJECT.md", "ABOUT.md",
]

# External memory locations — agent memories stored outside the project folder
# These contain preferences, decisions, feedback, project context from prior conversations
def _find_agent_memories(project_root: str) -> dict:
    """Find agent memory files that reference this project."""
    memories = {}
    home = os.path.expanduser("~")
    project_name = os.path.basename(project_root).lower()
    project_path_escaped = project_root.replace("/", "-").lstrip("-")

    # Claude Code memory: ~/.claude/projects/<escaped-path>/memory/
    claude_memory_dirs = [
        os.path.join(home, ".claude", "projects", project_path_escaped, "memory"),
    ]
    # Also check all claude project dirs for matching project name
    claude_projects = os.path.join(home, ".claude", "projects")
    if os.path.isdir(claude_projects):
        for d in os.listdir(claude_projects):
            mem_dir = os.path.join(claude_projects, d, "memory")
            if os.path.isdir(mem_dir):
                # Check if MEMORY.md references this project
                index = os.path.join(mem_dir, "MEMORY.md")
                if os.path.exists(index):
                    try:
                        with open(index, "r", errors="ignore") as f:
                            content = f.read()
                        if project_name in content.lower():
                            claude_memory_dirs.append(mem_dir)
                    except Exception:
                        pass

    for mem_dir in set(claude_memory_dirs):
        if not os.path.isdir(mem_dir):
            continue
        for fname in os.listdir(mem_dir):
            if not fname.endswith(".md"):
                continue
            fpath = os.path.join(mem_dir, fname)
            try:
                with open(fpath, "r", errors="ignore") as f:
                    content = f.read(20000)
                # Only include memories that reference this project
                if (project_name in content.lower() or
                        fname == "MEMORY.md" or
                        "feedback" in fname.lower() or
                        "user" in fname.lower()):
                    memories[f"claude-memory/{fname}"] = content
            except Exception:
                pass

    # Cursor memory: check .cursorrules in project
    # Aider: check .aider.chat.history.md in project
    # These are already covered by AGENT_CONTEXT_FILES scan

    return memories

# Files that reveal project type and structure
PROJECT_MARKERS = {
    "package.json": "javascript/node",
    "tsconfig.json": "typescript",
    "requirements.txt": "python",
    "setup.py": "python",
    "pyproject.toml": "python",
    "Cargo.toml": "rust",
    "go.mod": "go",
    "pom.xml": "java/maven",
    "build.gradle": "java/gradle",
    "Gemfile": "ruby",
    "composer.json": "php",
    "Dockerfile": "docker",
    "docker-compose.yml": "docker",
    "Makefile": "make",
    ".env": "env-config",
    ".env.example": "env-config",
    "config.yaml": "yaml-config",
    "config.yml": "yaml-config",
}

# Directories to skip
SKIP_DIRS = {
    "node_modules", "venv", ".venv", "env", ".env",
    "__pycache__", ".git", ".hg", ".svn",
    "dist", "build", ".next", ".nuxt",
    "target", "bin", "obj",
    ".idea", ".vscode", ".cursor",
    "vendor", "bower_components",
    ".tox", ".pytest_cache", ".mypy_cache",
    "coverage", ".coverage", "htmlcov",
}

# Extensions to analyze (code — read contents)
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx",
    ".go", ".rs", ".java", ".kt", ".scala",
    ".rb", ".php", ".c", ".cpp", ".h",
    ".cs", ".swift", ".dart",
    ".sql", ".sh", ".bash",
    ".html", ".css", ".scss",
    ".yaml", ".yml", ".toml", ".json",
}

# Media extensions (creative — count and categorize, don't read contents)
MEDIA_EXTENSIONS = {
    # Video
    ".mp4": "video", ".mov": "video", ".avi": "video", ".mkv": "video",
    ".webm": "video", ".flv": "video", ".wmv": "video", ".m4v": "video",
    ".prproj": "video-project", ".drp": "video-project", ".fcpxml": "video-project",
    ".aep": "video-project", ".nk": "video-project",
    # Image
    ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image",
    ".webp": "image", ".svg": "image", ".bmp": "image", ".tiff": "image",
    ".psd": "image-project", ".ai": "image-project", ".xcf": "image-project",
    ".fig": "design-project", ".sketch": "design-project",
    # Audio / Music
    ".mp3": "audio", ".wav": "audio", ".flac": "audio", ".aac": "audio",
    ".ogg": "audio", ".m4a": "audio", ".aif": "audio", ".aiff": "audio",
    ".als": "music-project", ".flp": "music-project", ".logic": "music-project",
    ".ptx": "music-project", ".rpp": "music-project",
    # 3D
    ".blend": "3d-project", ".fbx": "3d", ".obj": "3d", ".glb": "3d",
    ".gltf": "3d", ".usd": "3d", ".usda": "3d", ".stl": "3d",
    ".c4d": "3d-project", ".max": "3d-project", ".ma": "3d-project",
    # Documents
    ".pdf": "document", ".doc": "document", ".docx": "document",
    ".txt": "text", ".rtf": "document", ".odt": "document",
    # Data
    ".csv": "data", ".xlsx": "data", ".xls": "data",
}

MAX_FILE_SIZE = 100_000  # Skip files larger than 100KB for content analysis
MAX_FILES_TO_READ = 50   # Don't read more than 50 files for summary


def _extract_purpose(lines: list, ext: str) -> str:
    """Extract file purpose from docstring, module comment, or first meaningful comment."""
    if not lines:
        return ""
    # Python: look for module docstring
    if ext == ".py":
        in_docstring = False
        doc_lines = []
        for line in lines[:30]:
            stripped = line.strip()
            if not in_docstring:
                if stripped.startswith('"""') or stripped.startswith("'''"):
                    in_docstring = True
                    # Single-line docstring
                    if stripped.count('"""') >= 2 or stripped.count("'''") >= 2:
                        return stripped.strip('"\'').strip()
                    content = stripped.lstrip('"\'').strip()
                    if content:
                        doc_lines.append(content)
                elif stripped.startswith("#") and not stripped.startswith("#!"):
                    return stripped.lstrip("# ").strip()
                elif stripped and not stripped.startswith("import") and not stripped.startswith("from"):
                    break
            else:
                if '"""' in stripped or "'''" in stripped:
                    content = stripped.rstrip('"\'').strip()
                    if content:
                        doc_lines.append(content)
                    break
                doc_lines.append(stripped)
        # Return first meaningful line of docstring
        for dl in doc_lines:
            dl = dl.strip().rstrip("=").rstrip("-").strip()
            if dl and len(dl) > 5:
                return dl[:100]

    # JS/TS: look for /** */ or // at top
    if ext in (".js", ".ts", ".tsx", ".jsx"):
        for line in lines[:15]:
            stripped = line.strip()
            if stripped.startswith("/**"):
                desc = stripped.lstrip("/**").rstrip("*/").strip()
                if desc:
                    return desc[:100]
            elif stripped.startswith("//"):
                desc = stripped.lstrip("/ ").strip()
                if desc and len(desc) > 5:
                    return desc[:100]
            elif stripped and not stripped.startswith("import") and not stripped.startswith("'use"):
                break

    # Go/Rust/Java: look for // at top
    if ext in (".go", ".rs", ".java", ".c", ".cpp", ".h"):
        for line in lines[:10]:
            stripped = line.strip()
            if stripped.startswith("//"):
                desc = stripped.lstrip("/ ").strip()
                if desc and len(desc) > 5 and not desc.startswith("Package"):
                    return desc[:100]
            elif stripped and not stripped.startswith("package") and not stripped.startswith("use"):
                break

    return ""


def _extract_imports(lines: list, ext: str) -> list:
    """Extract import targets to map file connections."""
    imports = []
    if ext == ".py":
        for line in lines[:80]:
            stripped = line.strip()
            if stripped.startswith("from ") and " import " in stripped:
                module = stripped.split("from ")[1].split(" import")[0].strip()
                imports.append(module)
            elif stripped.startswith("import "):
                module = stripped.split("import ")[1].split(" as")[0].split(",")[0].strip()
                imports.append(module)
    elif ext in (".js", ".ts", ".tsx", ".jsx"):
        for line in lines[:80]:
            stripped = line.strip()
            if "require(" in stripped or "from '" in stripped or 'from "' in stripped:
                for q in ("'", '"'):
                    if f"from {q}" in stripped:
                        parts = stripped.split(f"from {q}")
                        if len(parts) > 1:
                            imports.append(parts[1].split(q)[0])
    return imports[:20]


def scan_project(root: str) -> dict:
    """Scan a project directory and extract structure and metadata."""
    root = os.path.abspath(root)
    result = {
        "root": root,
        "name": os.path.basename(root),
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "languages": set(),
        "frameworks": [],
        "structure": {},
        "key_files": [],
        "agent_contexts": {},
        "entry_points": [],
        "config_files": [],
        "media_files": {},  # category → [{"path": str, "size_mb": float}]
        "total_files": 0,
        "total_lines": 0,
    }

    # Walk the directory
    file_list = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Skip ignored directories
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        rel_dir = os.path.relpath(dirpath, root)
        if rel_dir == ".":
            rel_dir = ""

        for fname in filenames:
            rel_path = os.path.join(rel_dir, fname) if rel_dir else fname
            full_path = os.path.join(dirpath, fname)
            ext = os.path.splitext(fname)[1].lower()

            # Project markers
            if fname in PROJECT_MARKERS:
                result["languages"].add(PROJECT_MARKERS[fname])
                result["config_files"].append(rel_path)

            # Agent context files
            if rel_path in AGENT_CONTEXT_FILES or fname in [os.path.basename(f) for f in AGENT_CONTEXT_FILES]:
                try:
                    with open(full_path, "r", errors="ignore") as f:
                        content = f.read(50000)  # First 50KB
                    result["agent_contexts"][rel_path] = content
                except Exception:
                    pass

            # Code files
            if ext in CODE_EXTENSIONS:
                result["total_files"] += 1
                try:
                    size = os.path.getsize(full_path)
                    lines = 0
                    purpose = ""
                    imports = []
                    if size < MAX_FILE_SIZE:
                        with open(full_path, "r", errors="ignore") as f:
                            file_lines = f.readlines()
                        lines = len(file_lines)
                        # Extract purpose from docstring or first comment
                        purpose = _extract_purpose(file_lines, ext)
                        # Extract imports to map connections
                        imports = _extract_imports(file_lines, ext)
                    result["total_lines"] += lines
                    file_list.append({
                        "path": rel_path,
                        "purpose": purpose,
                        "imports": imports,
                        "ext": ext,
                        "size": size,
                        "lines": lines,
                    })
                except Exception:
                    pass

            # Media files — categorize without reading contents
            if ext in MEDIA_EXTENSIONS:
                category = MEDIA_EXTENSIONS[ext]
                if category not in result["media_files"]:
                    result["media_files"][category] = []
                try:
                    size_mb = round(os.path.getsize(full_path) / (1024 * 1024), 2)
                except Exception:
                    size_mb = 0
                result["media_files"][category].append({
                    "path": rel_path,
                    "size_mb": size_mb,
                })

            # Entry points
            if fname in ("main.py", "app.py", "index.js", "index.ts", "main.go",
                         "main.rs", "Main.java", "Program.cs", "combined_bot.py",
                         "server.py", "proxy.py", "run.py"):
                result["entry_points"].append(rel_path)

    # Detect frameworks from content
    result["languages"] = sorted(result["languages"])

    # Build directory structure (top 2 levels)
    structure = {}
    for f in file_list:
        parts = f["path"].split(os.sep)
        if len(parts) == 1:
            structure[f["path"]] = f"({f['lines']} lines)"
        elif len(parts) <= 3:
            d = parts[0] + "/" if len(parts) > 1 else ""
            if d not in structure:
                structure[d] = []
            if isinstance(structure[d], list):
                structure[d].append(parts[-1])
    result["structure"] = structure

    # Key files: largest and most connected
    file_list.sort(key=lambda x: x["lines"], reverse=True)
    result["key_files"] = file_list[:20]

    return result


def read_git_info(root: str) -> dict:
    """Extract recent git history for decision context."""
    import subprocess
    info = {"recent_commits": [], "branches": [], "remotes": []}
    try:
        # Recent commits
        out = subprocess.run(
            ["git", "log", "--oneline", "-20", "--no-decorate"],
            capture_output=True, text=True, cwd=root, timeout=5
        )
        if out.returncode == 0:
            info["recent_commits"] = out.stdout.strip().split("\n")

        # Current branch
        out = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True, text=True, cwd=root, timeout=5
        )
        if out.returncode == 0:
            info["current_branch"] = out.stdout.strip()

        # Remotes
        out = subprocess.run(
            ["git", "remote", "-v"],
            capture_output=True, text=True, cwd=root, timeout=5
        )
        if out.returncode == 0:
            info["remotes"] = [l.strip() for l in out.stdout.strip().split("\n") if l.strip()]

    except Exception:
        pass
    return info


def read_dependencies(root: str) -> list:
    """Extract project dependencies."""
    deps = []

    # Python
    req_path = os.path.join(root, "requirements.txt")
    if os.path.exists(req_path):
        try:
            with open(req_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        deps.append(line)
        except Exception:
            pass

    # Node
    pkg_path = os.path.join(root, "package.json")
    if os.path.exists(pkg_path):
        try:
            with open(pkg_path) as f:
                pkg = json.load(f)
            for section in ("dependencies", "devDependencies"):
                for name, ver in pkg.get(section, {}).items():
                    deps.append(f"{name}@{ver}")
        except Exception:
            pass

    return deps


def extract_decisions(agent_contexts: dict) -> list:
    """Extract key decisions from existing agent context files."""
    decisions = []
    for path, content in agent_contexts.items():
        # Look for decision patterns
        lines = content.split("\n")
        for i, line in enumerate(lines):
            lower = line.lower()
            if any(kw in lower for kw in ["removed", "disabled", "don't", "never",
                                           "always", "must", "important", "warning",
                                           "deprecated", "replaced", "migrated"]):
                # Get some context
                context = line.strip()
                if context and len(context) > 10:
                    decisions.append({"source": path, "rule": context})
    return decisions[:50]  # Cap at 50


def generate_handoff(root: str, include_content: bool = False) -> str:
    """Generate the HANDOFF.md file content."""
    scan = scan_project(root)
    git = read_git_info(root)
    deps = read_dependencies(root)
    agent_memories = _find_agent_memories(root)
    # Merge memories into agent_contexts for decision extraction
    scan["agent_contexts"].update(agent_memories)
    decisions = extract_decisions(scan["agent_contexts"])

    md = []
    md.append(f"# HANDOFF — {scan['name']}")
    md.append(f"")
    md.append(f"Universal project context for AI agents. Generated by Handoff v{__version__}.")
    md.append(f"Last updated: {scan['scanned_at']}")
    md.append(f"")
    md.append(f"---")
    md.append(f"")

    # Overview
    md.append(f"## Overview")
    md.append(f"")
    md.append(f"- **Project:** {scan['name']}")
    md.append(f"- **Path:** {scan['root']}")
    md.append(f"- **Languages:** {', '.join(scan['languages']) if scan['languages'] else 'unknown'}")
    md.append(f"- **Files:** {scan['total_files']} code files, {scan['total_lines']:,} total lines")
    if scan["entry_points"]:
        md.append(f"- **Entry points:** {', '.join(scan['entry_points'])}")
    if git.get("current_branch"):
        md.append(f"- **Branch:** {git['current_branch']}")
    if git.get("remotes"):
        remote = git["remotes"][0].split("\t")[1].split(" ")[0] if git["remotes"] else ""
        if remote:
            md.append(f"- **Repo:** {remote}")
    # Detect project type from media files
    if scan["media_files"]:
        types = set()
        for cat in scan["media_files"]:
            if "video" in cat: types.add("video")
            elif "image" in cat or "design" in cat: types.add("image/design")
            elif "audio" in cat or "music" in cat: types.add("audio/music")
            elif "3d" in cat: types.add("3D")
        if types:
            md.append(f"- **Media:** {', '.join(sorted(types))} project ({sum(len(f) for f in scan['media_files'].values())} assets)")
    md.append(f"")

    # README summary (first 20 lines)
    readme = scan["agent_contexts"].get("README.md", "")
    if readme:
        readme_lines = readme.strip().split("\n")[:20]
        md.append(f"## What This Project Does")
        md.append(f"")
        for line in readme_lines:
            md.append(line)
        if len(readme.strip().split("\n")) > 20:
            md.append(f"")
            md.append(f"*(README truncated — see README.md for full docs)*")
        md.append(f"")

    # Architecture
    md.append(f"## Architecture")
    md.append(f"")
    md.append(f"### Key Files (by size)")
    md.append(f"")
    md.append(f"| File | Lines | Purpose |")
    md.append(f"|------|-------|---------|")
    for f in scan["key_files"][:15]:
        purpose = f.get("purpose", "")
        md.append(f"| `{f['path']}` | {f['lines']} | {purpose} |")
    md.append(f"")

    # File connections — which files import which
    connections = {}
    project_name = scan["name"].lower()
    for f in scan["key_files"]:
        local_imports = [i for i in f.get("imports", [])
                         if not i.startswith(("os", "sys", "json", "time", "datetime",
                                              "threading", "collections", "hashlib", "csv",
                                              "math", "re", "logging", "pathlib", "typing",
                                              "flask", "ccxt", "pandas", "numpy", "requests"))]
        if local_imports:
            connections[f["path"]] = local_imports
    if connections:
        md.append(f"### File Connections")
        md.append(f"")
        for fpath, imps in list(connections.items())[:15]:
            md.append(f"- `{fpath}` imports: {', '.join(f'`{i}`' for i in imps[:8])}")
        md.append(f"")

    # Folder structure
    folders = {}
    for f in scan["key_files"]:
        parts = f["path"].split(os.sep)
        if len(parts) > 1:
            folder = parts[0] + "/"
            if folder not in folders:
                folders[folder] = {"files": 0, "lines": 0, "purposes": []}
            folders[folder]["files"] += 1
            folders[folder]["lines"] += f.get("lines", 0)
            if f.get("purpose"):
                folders[folder]["purposes"].append(f["purpose"])
    if folders:
        md.append(f"### Folder Structure")
        md.append(f"")
        for folder, info in sorted(folders.items()):
            desc = info["purposes"][0] if info["purposes"] else ""
            md.append(f"- `{folder}` — {info['files']} files, {info['lines']:,} lines{' — ' + desc if desc else ''}")
        md.append(f"")

    if scan["config_files"]:
        md.append(f"### Config Files")
        md.append(f"")
        for cf in scan["config_files"]:
            md.append(f"- `{cf}`")
        md.append(f"")

    # Media assets
    if scan["media_files"]:
        md.append(f"## Media Assets")
        md.append(f"")
        total_media = sum(len(files) for files in scan["media_files"].values())
        total_size = sum(f["size_mb"] for files in scan["media_files"].values() for f in files)
        md.append(f"**{total_media} files, {total_size:.1f} MB total**")
        md.append(f"")
        md.append(f"| Category | Count | Size | Examples |")
        md.append(f"|----------|-------|------|----------|")
        for category in sorted(scan["media_files"].keys()):
            files = scan["media_files"][category]
            cat_size = sum(f["size_mb"] for f in files)
            examples = ", ".join(f"`{os.path.basename(f['path'])}`" for f in files[:3])
            if len(files) > 3:
                examples += f", +{len(files) - 3} more"
            md.append(f"| {category} | {len(files)} | {cat_size:.1f} MB | {examples} |")
        md.append(f"")

        # List project files specifically (they contain settings)
        project_files = []
        for cat, files in scan["media_files"].items():
            if "project" in cat:
                project_files.extend(files)
        if project_files:
            md.append(f"### Project Files (contain settings/timeline)")
            md.append(f"")
            for pf in project_files:
                md.append(f"- `{pf['path']}` ({pf['size_mb']} MB)")
            md.append(f"")

    # Dependencies
    if deps:
        md.append(f"## Dependencies")
        md.append(f"")
        for d in deps[:30]:
            md.append(f"- {d}")
        if len(deps) > 30:
            md.append(f"- *...and {len(deps) - 30} more*")
        md.append(f"")

    # Agent memories — preferences, decisions, feedback from prior conversations
    memory_files = {k: v for k, v in scan["agent_contexts"].items() if k.startswith("claude-memory/")}
    if memory_files:
        md.append(f"## Agent Memory (from prior conversations)")
        md.append(f"")
        md.append(f"These are memories saved by an AI agent during previous work on this project. They contain user preferences, key decisions, feedback, and project context that survived across conversations.")
        md.append(f"")
        for path, content in memory_files.items():
            fname = path.replace("claude-memory/", "")
            md.append(f"### {fname}")
            md.append(f"")
            lines = content.strip().split("\n")
            for line in lines[:60]:
                md.append(line)
            if len(lines) > 60:
                md.append(f"")
                md.append(f"*(Truncated — {len(lines)} lines total)*")
            md.append(f"")

    # Other existing agent context (CLAUDE.md, .cursorrules, etc.)
    other_contexts = {k: v for k, v in scan["agent_contexts"].items()
                      if k != "README.md" and not k.startswith("claude-memory/")}
    for path, content in other_contexts.items():
        md.append(f"## Existing Context: {path}")
        md.append(f"")
        lines = content.strip().split("\n")
        for line in lines[:100]:
            md.append(line)
        if len(lines) > 100:
            md.append(f"")
            md.append(f"*(Truncated — {len(lines)} lines total)*")
        md.append(f"")

    # Decisions and rules
    if decisions:
        md.append(f"## Key Decisions & Rules")
        md.append(f"")
        md.append(f"Extracted from project context files:")
        md.append(f"")
        for d in decisions[:30]:
            md.append(f"- [{d['source']}] {d['rule']}")
        md.append(f"")

    # Recent git history
    if git.get("recent_commits"):
        md.append(f"## Recent Changes")
        md.append(f"")
        for c in git["recent_commits"][:15]:
            md.append(f"- {c}")
        md.append(f"")

    # Instructions for agents
    md.append(f"## For AI Agents")
    md.append(f"")
    md.append(f"This file was generated by Handoff (https://github.com/rofomtl00/Handoff).")
    md.append(f"It provides portable project context that works across any AI coding assistant.")
    md.append(f"")
    md.append(f"When working on this project:")
    md.append(f"1. Read the Architecture section to understand file layout")
    md.append(f"2. Check Key Decisions before making changes that might conflict")
    md.append(f"3. Check Recent Changes for current work in progress")
    md.append(f"4. Respect any rules in Existing Context sections")
    md.append(f"")
    md.append(f"To update this file: `python handoff.py {scan['root']}`")

    return "\n".join(md)


def main():
    parser = argparse.ArgumentParser(
        description="Handoff — Generate universal AI agent context for your project")
    parser.add_argument("path", nargs="?", default=".",
                        help="Project directory (default: current)")
    parser.add_argument("--output", "-o", default="HANDOFF.md",
                        help="Output filename (default: HANDOFF.md)")
    parser.add_argument("--stdout", action="store_true",
                        help="Print to stdout instead of file")
    args = parser.parse_args()

    root = os.path.abspath(args.path)
    if not os.path.isdir(root):
        print(f"Error: {root} is not a directory")
        sys.exit(1)

    print(f"Scanning {root}...")
    content = generate_handoff(root)

    if args.stdout:
        print(content)
    else:
        out_path = os.path.join(root, args.output)
        with open(out_path, "w") as f:
            f.write(content)
        lines = content.count("\n")
        print(f"Generated {out_path} ({lines} lines)")
        print(f"")
        print(f"Copy this file to any AI agent as context:")
        print(f"  - Paste into ChatGPT/Gemini as first message")
        print(f"  - Place in project root for Cursor/Copilot/Claude Code")
        print(f"  - Attach as file in any AI chat")


if __name__ == "__main__":
    main()
