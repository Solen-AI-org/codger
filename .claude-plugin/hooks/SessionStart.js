#!/usr/bin/env node
// Claude Code hook — fires when a new session starts.
// Writes a flag file so the agent knows Codger is active from message one.
// Vendored shape from caveman's hooks/ (MIT), adapted for Codger.

const fs = require('fs');
const path = require('path');

// Write a tiny flag file that mode-1-always-on.md can check.
// Claude Code reads this on init; the flag tells Codger's ruleset
// to activate Mode 1 automatically without /codger.
const flagDir = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(require('os').homedir(), '.claude'), 'codger');
fs.mkdirSync(flagDir, { recursive: true });
fs.writeFileSync(path.join(flagDir, 'session-active'), 'Codger active. Talk terse. Build minimal. Push back on bad requests.\n');
