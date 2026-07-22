const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const CODGER_SRC = __dirname;
const COPY_FILTER = (src) => !['node_modules', '.git', 'graphify-out', 'graphify-demo'].includes(path.basename(src));

// Validate that a path stays within the expected base directory (prevent path traversal).
function validatePath(targetPath, baseDir) {
  const resolved = path.resolve(targetPath);
  const resolvedBase = path.resolve(baseDir);
  if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
    throw new Error(`Path traversal detected: ${targetPath} escapes ${baseDir}`);
  }
  return resolved;
}

// Per-agent install targets. Path depth matters: baseDir below walks up two
// levels from the copy destination to check whether the agent itself is
// installed (not just whether its plugin/skill folder already exists).
const TARGETS = {
  Antigravity: path.join(HOME, '.gemini', 'antigravity-cli', 'plugins', 'codger'),
  Hermes: path.join(HOME, '.hermes', 'skills', 'codger'),
  OpenClaw: path.join(HOME, '.openclaw', 'skills', 'codger'),
  OpenJarvis: path.join(HOME, '.openjarvis', 'skills', 'codger'),
  PiAgent: path.join(HOME, '.pi', 'agent', 'skills', 'codger')
};

console.log("Codger Universal Installer\n");

// 0. Claude Code plugin (highest priority — enables auto-inject + hooks + commands)
const claudePluginDir = path.join(HOME, '.claude', 'plugins', 'codger');
if (fs.existsSync(path.join(HOME, '.claude'))) {
  console.log(`[+] Detected Claude Code. Installing plugin to ${claudePluginDir}...`);
  fs.cpSync(CODGER_SRC, claudePluginDir, { recursive: true, filter: COPY_FILTER });
  console.log('    OK Claude Code plugin installed.');
} else {
  console.log('[-] Claude Code not detected (skipped).');
}

// 1. Install to CLI Agents (Global)
for (const [agent, targetDir] of Object.entries(TARGETS)) {
  const baseDir = path.dirname(path.dirname(targetDir));
  if (fs.existsSync(baseDir)) {
    console.log(`[+] Detected ${agent}. Installing to ${targetDir}...`);
    fs.cpSync(CODGER_SRC, targetDir, { recursive: true, filter: COPY_FILTER });
    console.log(`    OK ${agent} installation complete.`);
  } else {
    console.log(`[-] ${agent} not detected (skipped).`);
  }
}

// 2. Universal agentskills.io directory. OpenClaw, Pi Agent, and 26+ other
// tools read skills from here regardless of whether their own dir exists,
// so this is installed unconditionally rather than gated on detection.
const universalDir = path.join(HOME, '.agents', 'skills', 'codger');
console.log(`[+] Installing to universal skills dir ${universalDir}...`);
fs.cpSync(CODGER_SRC, universalDir, { recursive: true, filter: COPY_FILTER });
console.log(`    OK universal (agentskills.io) installation complete.`);

// 3. Local project rule files / directories
const cwd = process.cwd();
console.log(`\n[+] Checking for local IDE rule conventions in ${cwd}...`);

const mode1Path = path.join(CODGER_SRC, 'mode-1-always-on.md');
const mode1Content = fs.existsSync(mode1Path) ? fs.readFileSync(mode1Path, 'utf8') : '';

function injectIntoFile(targetPath, label) {
  validatePath(targetPath, cwd);
  console.log(`    Found ${label}. Appending Codger rules...`);
  let content = fs.readFileSync(targetPath, 'utf8');
  if (!content.includes('Codger')) {
    fs.appendFileSync(targetPath, '\n\n' + mode1Content);
    console.log(`    OK Updated ${label}.`);
  } else {
    console.log(`    Codger already present in ${label}.`);
  }
}

function injectIntoDir(dirPath, label) {
  validatePath(dirPath, cwd);
  const dest = path.join(dirPath, 'codger.md');
  if (fs.existsSync(dest)) {
    console.log(`    Codger already present in ${label}.`);
    return;
  }
  console.log(`    Found ${label}. Writing codger.md...`);
  fs.writeFileSync(dest, mode1Content);
  console.log(`    OK Updated ${label}.`);
}

// [rule path, label, isDirConvention]
const RULE_TARGETS = [
  ['.clinerules', 'Cline rules', null],       // dir (current) or legacy file
  ['.cursorrules', 'Cursor rules (legacy)', false],
  ['.cursor/rules', 'Cursor rules (modern)', true],
  ['.windsurfrules', 'Windsurf rules (legacy)', false],
  ['.windsurf/rules', 'Windsurf rules (modern)', true],
  ['.roo/rules', 'Roo Code rules', true],
  ['.roorules', 'Roo Code rules (legacy)', false],
  ['AGENTS.md', 'AGENTS.md (OpenCode + open standard)', false]
];

let anyFound = false;
RULE_TARGETS.forEach(([rel, label]) => {
  const targetPath = path.join(cwd, rel);
  if (!fs.existsSync(targetPath)) return;
  anyFound = true;
  if (fs.statSync(targetPath).isDirectory()) {
    injectIntoDir(targetPath, label);
  } else {
    injectIntoFile(targetPath, label);
  }
});

if (!anyFound) {
  console.log(`    None found in this directory. Run from your project root if you use Cursor/Cline/Windsurf/Roo/OpenCode.`);
}

console.log("\nDone. Your agent is now armed with Codger.");
