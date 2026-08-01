#!/usr/bin/env node
// codger-stats — read the active Claude Code session log, print real token
// usage for this session. Also reads persistent history from the hook
// (UserPromptSubmit.js) if available.
// Adapted from caveman's hooks/caveman-stats.js (MIT): same session-parsing
// shape, plus lifetime history from the Claude Code plugin hook.
//
// Run: node stats.js

const fs = require('fs');
const path = require('path');
const os = require('os');

// Measured LOC-reduction ratio, from benchmarks/results/nvidia-nim-set1.md
// (Set 1, n=3): codger 70 LOC vs baseline 152 = 54% less. Measured on NVIDIA NIM
// (meta/llama-3.3-70b-instruct), NOT on a real Claude session — applied as a flat
// estimate to any model until an Anthropic-paid Set 1 run replaces it. Caveat is
// always printed alongside the estimate so the source is never hidden.
const MEASURED_RATIO = 0.54;
const MEASURED_RATIO_SOURCE = 'meta/llama-3.3-70b-instruct via NVIDIA NIM, not Claude';

// Anthropic public output-token pricing, USD per million. Match by model id
// prefix so this stays correct across point releases.
const MODEL_OUTPUT_PRICE_PER_M = [
  ['claude-opus-4', 75.00],
  ['claude-sonnet-4', 15.00],
  ['claude-haiku-4', 4.00],
  ['claude-3-5-sonnet', 15.00],
  ['claude-3-5-haiku', 4.00],
  ['claude-3-opus', 75.00],
];

function priceForModel(model) {
  if (!model) return null;
  for (const [prefix, price] of MODEL_OUTPUT_PRICE_PER_M) {
    if (model.startsWith(prefix)) return price;
  }
  return null;
}

function formatUsd(amount) {
  if (amount >= 1) return `$${amount.toFixed(2)}`;
  if (amount >= 0.01) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(4)}`;
}

function findRecentSession(claudeDir) {
  const projectsDir = path.join(claudeDir, 'projects');
  let entries;
  try { entries = fs.readdirSync(projectsDir, { withFileTypes: true }); }
  catch { return null; }

  let best = null;
  const MAX_DEPTH = 10; // Prevent runaway traversal on deeply nested trees
  const stack = entries.map((e) => ({ p: path.join(projectsDir, e.name), depth: 1 }));
  while (stack.length) {
    const { p, depth } = stack.pop();
    if (depth > MAX_DEPTH) continue;
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      try {
        for (const child of fs.readdirSync(p)) stack.push({ p: path.join(p, child), depth: depth + 1 });
      } catch {}
    } else if (p.endsWith('.jsonl') && (!best || st.mtimeMs > best.mtime)) {
      best = { file: p, mtime: st.mtimeMs };
    }
  }
  return best ? best.file : null;
}

function parseSession(filePath) {
  let raw;
  try { raw = fs.readFileSync(filePath, 'utf8'); }
  catch { return { outputTokens: 0, cacheReadTokens: 0, turns: 0, model: null }; }

  let outputTokens = 0;
  let cacheReadTokens = 0;
  let turns = 0;
  let model = null;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry.type !== 'assistant' || !entry.message) continue;
    const usage = entry.message.usage;
    if (!usage) continue;
    outputTokens += usage.output_tokens || 0;
    cacheReadTokens += usage.cache_read_input_tokens || 0;
    turns++;
    if (!model && entry.message.model) model = entry.message.model;
  }
  return { outputTokens, cacheReadTokens, turns, model };
}

// Pure formatter — separated from main() so tests can pass synthetic inputs.
function formatStats({ outputTokens, cacheReadTokens, turns, model, sessionPath }) {
  const sep = '──────────────────────────────────';
  const shortPath = sessionPath && sessionPath.length > 45 ? '...' + sessionPath.slice(-45) : (sessionPath || '');

  if (turns === 0) {
    return `\nCodger Stats\n${sep}\nNo conversation yet — stats available after first response.\n${sep}\n`;
  }

  const ratio = MEASURED_RATIO;
  const price = priceForModel(model);

  const estNormal = Math.round(outputTokens / (1 - ratio));
  const estSaved = estNormal - outputTokens;
  let usdLine = '';
  if (price !== null) {
    const usd = (estSaved / 1_000_000) * price;
    usdLine = `Est. saved (USD):      ~${formatUsd(usd)}\n`;
  }
  const savings = `Est. without Codger:   ${estNormal.toLocaleString()}\n` +
    `Est. tokens saved:     ${estSaved.toLocaleString()} (~${Math.round(ratio * 100)}%)\n` +
    usdLine +
    `(ratio measured on ${MEASURED_RATIO_SOURCE} — approximation)`;

  return `\nCodger Stats\n${sep}\n` +
    (shortPath ? `Session:  ${shortPath}\n` : '') +
    `Turns:    ${turns}\n${sep}\n` +
    `Output tokens:         ${outputTokens.toLocaleString()}\n` +
    `Cache-read tokens:     ${cacheReadTokens.toLocaleString()}\n${sep}\n` +
    `${savings}\n`;
}

function main() {
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  const sessionFile = findRecentSession(claudeDir);

  if (!sessionFile) {
    process.stderr.write('codger-stats: no Claude Code session found.\n');
    process.exit(1);
  }

  const parsed = parseSession(sessionFile);
  process.stdout.write(formatStats({ ...parsed, sessionPath: sessionFile }));
}

if (require.main === module) main();

module.exports = { formatStats, parseSession, priceForModel, formatUsd, findRecentSession, MEASURED_RATIO, MODEL_OUTPUT_PRICE_PER_M };
