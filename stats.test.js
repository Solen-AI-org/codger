// Regression guard for stats.js. Run: node stats.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { formatStats, parseSession, priceForModel } = require('./stats.js');

let pass = 0;
function check(name, got, want) {
  assert.deepStrictEqual(got, want, `FAILED: ${name}\ngot:  ${JSON.stringify(got)}\nwant: ${JSON.stringify(want)}`);
  console.log(`ok - ${name}`);
  pass++;
}

// parseSession: sums usage across assistant turns, ignores non-assistant lines.
const tmp = path.join(os.tmpdir(), `codger-stats-test-${Date.now()}.jsonl`);
fs.writeFileSync(tmp, [
  JSON.stringify({ type: 'user', message: {} }),
  JSON.stringify({ type: 'assistant', message: { model: 'claude-sonnet-4-6', usage: { output_tokens: 100, cache_read_input_tokens: 50 } } }),
  JSON.stringify({ type: 'assistant', message: { model: 'claude-sonnet-4-6', usage: { output_tokens: 200, cache_read_input_tokens: 0 } } }),
  '', // blank line must be skipped
  'not json', // malformed line must be skipped
].join('\n'));
check('parseSession sums usage', parseSession(tmp), { outputTokens: 300, cacheReadTokens: 50, turns: 2, model: 'claude-sonnet-4-6' });
fs.unlinkSync(tmp);

// priceForModel: prefix match, unknown returns null.
check('priceForModel known prefix', priceForModel('claude-sonnet-4-6'), 15.00);
check('priceForModel unknown model', priceForModel('claude-9-nonexistent'), null);

// formatStats: no turns yet.
assert.ok(formatStats({ outputTokens: 0, cacheReadTokens: 0, turns: 0, model: null }).includes('No conversation yet'));
console.log('ok - formatStats reports no-conversation state');
pass++;

// formatStats: savings estimate always shown, but flagged with the measurement source
// (ratio was measured on NVIDIA NIM llama, not on the Claude model the session actually ran).
const withRatio = formatStats({ outputTokens: 100, cacheReadTokens: 0, turns: 1, model: 'claude-sonnet-4-6' });
assert.ok(withRatio.includes('Est. without Codger'));
assert.ok(withRatio.includes('not Claude'));
console.log('ok - formatStats shows savings estimate with measurement-source caveat');
pass++;

console.log(`\n${pass}/${pass} passed`);
