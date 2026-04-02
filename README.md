# Handoff — Universal AI Agent Context

Switch between Claude, ChatGPT, Gemini, Copilot, Cursor, Cody, or any AI coding assistant — without losing project context.

## The Problem

Every AI agent builds understanding through conversation, but that context is trapped in the platform. Switch agents and you start from zero. Explain your architecture again. Re-state your decisions. Watch it make mistakes you already corrected.

## The Solution

Handoff scans your project and generates a single `HANDOFF.md` file containing everything an AI agent needs: architecture, key files, dependencies, decisions, recent changes, and existing context from any platform-specific files (.cursorrules, CLAUDE.md, etc.).

Take this file to any AI agent. Paste it as the first message or place it in your project root. The agent has full context immediately.

## Quick Start

```bash
# Generate context for your project
python handoff.py /path/to/your/project

# Or current directory
python handoff.py
```

This creates `HANDOFF.md` in your project root. That's it.

## What It Captures

| Section | What's Included |
|---------|----------------|
| **Overview** | Project name, languages, file count, entry points, git branch |
| **What This Project Does** | First 20 lines of README |
| **Architecture** | Top 15 files by size with line counts |
| **Dependencies** | From requirements.txt, package.json, Cargo.toml, etc. |
| **Existing Context** | Reads CLAUDE.md, .cursorrules, copilot-instructions.md, AGENTS.md |
| **Key Decisions** | Auto-extracted rules and constraints from context files |
| **Recent Changes** | Last 15 git commits |

## How to Use

### Switching to ChatGPT / Gemini / any chat agent
1. Run `python handoff.py`
2. Copy the contents of `HANDOFF.md`
3. Paste as your first message: "Here's my project context:"
4. Continue working as normal

### Switching to Cursor / Copilot / Claude Code
1. Run `python handoff.py`
2. Leave `HANDOFF.md` in your project root
3. The agent reads it automatically

### Keeping it updated
```bash
# Re-run after major changes
python handoff.py

# Print to stdout (for piping)
python handoff.py --stdout
```

## What It Reads

Handoff automatically detects and includes context from these platform-specific files:

| Platform | File |
|----------|------|
| Claude Code | `CLAUDE.md` |
| Cursor | `.cursorrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Aider | `.aider.conf.yml` |
| Generic | `README.md`, `ARCHITECTURE.md`, `DECISIONS.md` |

All platform-specific rules are merged into one portable file.

## Example Output

```markdown
# HANDOFF — MyProject

## Overview
- **Project:** MyProject
- **Languages:** python, docker
- **Files:** 24 code files, 3,200 total lines
- **Entry points:** main.py

## Architecture
| File | Lines | Purpose |
|------|-------|---------|
| src/engine.py | 450 | |
| src/api.py | 320 | |
...

## Key Decisions & Rules
- [CLAUDE.md] Never add FH earnings to cumulative PnL — ledger only
- [.cursorrules] Always use TypeScript strict mode
...

## Recent Changes
- abc1234 Fix balance reconciliation
- def5678 Add audit trail module
...
```

## Zero Dependencies

Handoff is a single Python file with no dependencies beyond the standard library. Python 3.7+.

## License

MIT
