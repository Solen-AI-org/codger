// Codger profile for the pushback set: mode-1-always-on.md + codger-reality-check/SKILL.md
// concatenated. A real session reads the skill file on auto-invoke; a single-shot API
// call can't do that file read, so this inlines it to approximate the same behavior.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const mode1 = fs.readFileSync(path.join(root, 'mode-1-always-on.md'), 'utf8');
const realityCheck = fs.readFileSync(path.join(root, 'skills', 'codger-reality-check', 'SKILL.md'), 'utf8');
const system = mode1 + '\n\n---\n\n' + realityCheck;
module.exports = ({ vars }) => [
  { role: 'system', content: system },
  { role: 'user', content: vars.task },
];
