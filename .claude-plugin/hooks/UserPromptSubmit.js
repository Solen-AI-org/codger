#!/usr/bin/env node
// Claude Code hook — fires on every user prompt submit.
// Tracks cumulative token usage for codger-stats.
// Vendored shape from caveman's hooks/ (MIT), adapted for Codger.

const fs = require('fs');
const path = require('path');
const os = require('os');

const STATS_DIR = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'codger');

// This hook receives JSON via stdin from Claude Code:
// { session_id, turn, message: { usage: { output_tokens, cache_read_input_tokens } } }
let body = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { body += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(body);
    const historyFile = path.join(STATS_DIR, '.codger-history.jsonl');
    fs.mkdirSync(STATS_DIR, { recursive: true });
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      session_id: data.session_id,
      turn: data.turn,
      output_tokens: data.message?.usage?.output_tokens || 0,
      cache_read_tokens: data.message?.usage?.cache_read_input_tokens || 0,
      model: data.message?.model || 'unknown'
    });
    fs.appendFileSync(historyFile, entry + '\n', 'utf8');
  } catch (e) {
    // Hook must never crash the agent. Fail silently.
    process.stderr.write(`codger hook: ${e.message}\n`);
  }
});