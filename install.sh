#!/usr/bin/env bash
# Codger installer — Mac/Linux/WSL/Git Bash
# One command: curl -fsSL https://raw.githubusercontent.com/SolenAI/codger/main/install.sh | bash
set -euo pipefail

echo "Codger Installer"
echo "================"
echo ""

SOURCE="$(cd "$(dirname "$0")" && pwd)"
HOME_DIR="${HOME}"

# 1. Install to CLI Agents (Global)
declare -A TARGETS=(
  ["Antigravity"]="${HOME_DIR}/.gemini/antigravity-cli/plugins/codger"
  ["Hermes"]="${HOME_DIR}/.hermes/skills/codger"
  ["OpenClaw"]="${HOME_DIR}/.openclaw/skills/codger"
  ["OpenJarvis"]="${HOME_DIR}/.openjarvis/skills/codger"
  ["PiAgent"]="${HOME_DIR}/.pi/agent/skills/codger"
)

COPY_EXCLUDE="node_modules .git graphify-out graphify-demo __pycache__"
# Build exclude pattern as a temp file (portable — process substitution fails on some shells)
EXCLUDE_FILE="$(mktemp /tmp/codger-exclude.XXXXXX)"
for e in $COPY_EXCLUDE; do echo "$e" >> "$EXCLUDE_FILE"; done

for agent in "${!TARGETS[@]}"; do
  TARGET="${TARGETS[$agent]}"
  BASE="$(dirname "$(dirname "$TARGET")")"
  if [ -d "$BASE" ]; then
    echo "[+] Detected ${agent}. Installing to ${TARGET}..."
    rm -rf "$TARGET"
    mkdir -p "$TARGET"
    rsync -a --exclude-from="$EXCLUDE_FILE" "$SOURCE/" "$TARGET/" 2>/dev/null || \
    cp -r "$SOURCE"/* "$TARGET/" 2>/dev/null || \
    echo "    WARNING: Could not copy to ${TARGET}."
    echo "    OK ${agent} installation complete."
  else
    echo "[-] ${agent} not detected (skipped)."
  fi
done
rm -f "$EXCLUDE_FILE"

# 2. Universal agentskills.io directory
UNIVERSAL="${HOME_DIR}/.agents/skills/codger"
echo "[+] Installing to universal skills dir ${UNIVERSAL}..."
rm -rf "$UNIVERSAL"
mkdir -p "$UNIVERSAL"
cp -r "$SOURCE"/* "$UNIVERSAL/"
echo "    OK universal (agentskills.io) installation complete."

# 3. Claude Code plugin
CLAUDE_PLUGIN_DIR="${HOME_DIR}/.claude/plugins/codger"
if [ -d "${HOME_DIR}/.claude" ]; then
  echo "[+] Installing Claude Code plugin..."
  rm -rf "$CLAUDE_PLUGIN_DIR"
  mkdir -p "$CLAUDE_PLUGIN_DIR"
  cp -r "$SOURCE"/* "$CLAUDE_PLUGIN_DIR/"
  echo "    OK Claude Code plugin installed."
fi

# 4. Local project rule files
cwd="$(pwd)"
echo ""
echo "[+] Checking for local IDE rule conventions in ${cwd}..."
ANY_FOUND=0
MODE1="$SOURCE/mode-1-always-on.md"

if [ -f "$MODE1" ]; then
  for rulefile in ".clinerules" ".cursorrules" ".windsurfrules" ".roorules" "AGENTS.md"; do
    if [ -f "${cwd}/${rulefile}" ]; then
      if ! grep -q "Codger" "${cwd}/${rulefile}" 2>/dev/null; then
        echo "" >> "${cwd}/${rulefile}"
        cat "$MODE1" >> "${cwd}/${rulefile}"
        echo "    OK Updated ${rulefile}."
      else
        echo "    Codger already present in ${rulefile}."
      fi
      ANY_FOUND=1
    fi
  done
  for ruledir in ".clinerules" ".cursor/rules" ".windsurf/rules" ".roo/rules"; do
    if [ -d "${cwd}/${ruledir}" ]; then
      if [ ! -f "${cwd}/${ruledir}/codger.md" ]; then
        cp "$MODE1" "${cwd}/${ruledir}/codger.md"
        echo "    OK Created ${ruledir}/codger.md."
      else
        echo "    Codger already present in ${ruledir}/."
      fi
      ANY_FOUND=1
    fi
  done
fi

if [ "$ANY_FOUND" -eq 0 ]; then
  echo "    None found in this directory. Run from your project root if you use Cursor/Cline/Windsurf/Roo/OpenCode."
fi

echo ""
echo "Done. Your agent is now armed with Codger."