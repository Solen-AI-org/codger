// Codger profile: the repo's own mode-1-always-on.md (full) as the system prompt.
// Same loading shape as the ponytail/caveman profiles — single source of truth, no drift.
const fs = require('fs');
const path = require('path');
const system = fs.readFileSync(path.join(__dirname, '..', '..', 'mode-1-always-on.md'), 'utf8');
module.exports = ({ vars }) => [
  { role: 'system', content: system },
  { role: 'user', content: vars.task },
];
