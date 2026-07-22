# Benchmark

Four profiles (no skill, [caveman](https://github.com/JuliusBrussee/caveman), [ponytail](https://github.com/DietrichGebert/ponytail), Codger), two task sets. Set 1 mirrors ponytail's own benchmark exactly (same 5 tasks, same metrics) so Codger lands on the same table. Set 2 is Codger-specific: it measures the one thing ponytail's harness doesn't — active architectural pushback.

**Why the Anthropic path hasn't been run:** `promptfoo eval` sends every test × every profile × `--repeat N` as real completions to the Anthropic API (Haiku/Sonnet/Opus). That's billed tokens on your key, not a local computation — 4 profiles × 5 tasks × 10 repeats × 3 models is 600 real API calls for Set 1 alone. Firing 600+ billed calls isn't something to do without you explicitly saying go — the harness is checked (profiles load correctly, metrics score correctly on synthetic input — see `node loc.test.js`), not results.

**What has been run:** Set 1 against a free NVIDIA NIM model instead (`benchmark-nvidia.py`, see below) — zero cost, no Anthropic key needed. Clean n=3 results: [results/2026-07-08-nvidia-nim-set1.md](results/2026-07-08-nvidia-nim-set1.md). On `meta/llama-3.3-70b-instruct`: caveman 55 LOC (64% less than baseline), codger 70 (54% less), ponytail 80 (47% less) — all three well under baseline, direction matches ponytail's own published Claude numbers, but the exact ranking is this-model-this-run, not a general claim (an earlier partial run with n=1-2 samples had codger in first place; a third real sample flipped it — read the honesty note in that file).

## Set 0 — free, zero-key (`benchmark-nvidia.py`)

No Anthropic key, no Claude Code subscription usage, no local GPU. Uses NVIDIA's free-tier NIM API (OpenAI-compatible `/v1/chat/completions`), stdlib-only Python, same profile-loading shape as the promptfoo arms.

```bash
cd codger
# NVIDIA_API_KEY=... in codger/.env (free key from build.nvidia.com)
python benchmarks/benchmark-nvidia.py --model meta/llama-3.3-70b-instruct --repeat 3 --set 1
python benchmarks/benchmark-nvidia.py --set 2   # pushback/guardianship set
```

Free tier is rate-limited (429/503 under burst) — the script retries both with exponential backoff and checkpoints the results JSON after every single call, not just at the end, so a kill or crash mid-run loses at most one sample instead of the whole batch. One run did genuinely hang past the retry budget (see the results file's honesty note); if that recurs, check for a real Win32 PID with `Get-CimInstance Win32_Process` before `taskkill` — `ps aux`'s Cygwin-translated PID won't match.

## Set 1 — parity with ponytail (`promptfooconfig.yaml`)

Same 5 tasks as [ponytail's benchmark](https://github.com/DietrichGebert/ponytail/tree/main/benchmarks): email validator, JS debounce, CSV sum, React countdown, FastAPI rate-limit. `loc.js` and `correctness.js` are vendored verbatim (MIT) from ponytail's own harness — same measurement, no reimplementation drift. `ponytail-SKILL.md` and `caveman-SKILL.md` are vendored the same way ponytail vendors caveman's: full skill text as the system prompt, single source of truth.

```bash
cd benchmarks
cp ../../.env.example .env      # add your ANTHROPIC_API_KEY (adjust path to wherever it lives)
npx promptfoo@latest eval -c promptfooconfig.yaml --env-file .env --repeat 10
npx promptfoo@latest view
```

Requires Node.js ≥ 22.22.0 (promptfoo's constraint) and, for `correctness.js`, Python 3.

## Set 2 — guardianship (`promptfooconfig.pushback.yaml`)

Three tasks, each with a real architectural flaw baked in: removing rate limiting under a flimsy pretext, adding Redux to a static page, replacing a local-first app's offline models with cloud calls. `pushback.js` is a keyword/structural heuristic (same rigor level as `correctness.js`'s React/FastAPI checks — plausible-signal, not semantic understanding): did the response flag the flaw, or build it without a word?

`profiles/codger-guardian.js` inlines `mode-1-always-on.md` + `skills/codger-reality-check/SKILL.md` as one system prompt. That's an approximation, not the real flow — a live session auto-invokes the skill by reading the file mid-response; a single-shot API call can't do that read, so the file content is pre-inlined instead. Treat Set 2 as a lower bound on how well the auto-invocation *would* work, not a measurement of the auto-invocation itself.

**Result (NVIDIA NIM, `meta/llama-3.3-70b-instruct`, n=3):** [results/2026-07-08-nvidia-nim-set2.md](results/2026-07-08-nvidia-nim-set2.md) — counterintuitively, **baseline scored the highest pushback rate (56%)**, codger came in at 22%. Read the file before citing this: the keyword heuristic structurally favors verbose baseline prose over codger's terse output, and n=3 is thin for a binary rate. This is evidence the *measurement* doesn't work well for terse skills, not evidence the guardianship skill itself doesn't work.

```bash
cd benchmarks
npx promptfoo@latest eval -c promptfooconfig.pushback.yaml --env-file .env --repeat 10
```

Neither ponytail nor caveman have an active-guardianship mechanism — the ladder optimizes code size, caveman optimizes prose. Expect both to mostly comply with the flawed request; that's not a bug in their harness; it's a different design goal than Codger's.

## Set 3 — agentic (`agentic/run.py`)

Real headless Claude Code sessions editing a seeded workspace, scored on the files left
behind: correctness + safety are deterministic gates, over-engineering and completeness are
LLM-judged. Vendored from ponytail's `benchmarks/agentic/` (MIT: `tasks.py`, `run.py`,
`judge.py`, `complete.py`), with these changes:

- Added a `codger` arm to `run.py` (`mode-1-always-on.md`, raw `--append-system-prompt` like
  `yagni-oneliner` — Codger isn't an installed marketplace plugin, so it can't use
  `--plugin-dir` the way the `ponytail`/`caveman` arms do).
- `judge.py`/`complete.py` call NVIDIA NIM instead of the Anthropic API — same
  `NVIDIA_API_KEY` as `benchmark-nvidia.py`, zero cost.
- `run.py`: `tempfile.TemporaryDirectory(ignore_cleanup_errors=True)` in `selftest()` —
  a Windows temp-dir file lock intermittently crashed cleanup; harmless on the actual
  scoring, so cleanup errors are ignored instead of aborting the run.

**Two different models, two different jobs — don't confuse them:**

| | model | why |
|---|---|---|
| code-generation (the 4 arms) | real Claude (`haiku` here) via the `claude` CLI | this is the whole point of Set 3: measure the *actual* Claude Code session with ponytail/caveman active as real plugins (hook-based), which only real Claude Code can run. Subscription usage, not a billed API key. |
| judge (`judge.py`, `complete.py` — scores the code, doesn't write it) | NVIDIA NIM (`meta/llama-3.3-70b-instruct`) | avoids an `ANTHROPIC_API_KEY` charge just for grading. Caveat: not the model ponytail validated (`claude-sonnet-4-6`) — scores are directionally useful, not calibrated against ponytail's published numbers. |

```bash
cd benchmarks/agentic
python run.py --selftest              # deterministic instruments, no API, no key — run first
python complete.py --selftest-offline # gate logic only, no API
python judge.py --selftest            # NVIDIA NIM, free
python complete.py --selftest         # NVIDIA NIM, free
```

**Result (2026-07-09, `haiku`, n=1, 12 surgical tasks — no external fixture needed):**
percent change vs the no-skill baseline (baseline absolute, per task: 19.0 LOC, 75.4k tokens,
$0.0363, 19.9s):

| arm | LOC | tokens | cost | time | safe | over-eng. (0–3) | completeness (0–3) |
|---|--:|--:|--:|--:|--:|--:|--:|
| caveman | +1% | −1% | −1% | −13% | 83% | 0.50 | 3.00 |
| ponytail | −5% | +10% | +14% | +10% | 83% | 0.67 | 2.92 |
| **codger** | **−10%** | +12% | +7% | +19% | 83% | **0.58** | 2.92 |

Codger writes the least code of the four and is second-lowest on over-engineering, at a
modest tokens/cost/time premium (the CLAUDE.md-style ruleset is heavier than a single skill
file). Completeness near-ceiling for every arm — no arm won on LOC by shipping less feature.

Honest caveats, read before citing this:
- **n=1.** Set 1's own single-shot data already showed a 3rd sample flip a ranking; treat
  this table as a first pass, not a settled result.
- **Safe rate identical (83%) across every arm**, driven by 2 of the 12 tasks (`todo-null`,
  `trace-transfer`) failing the safety check for **all four arms uniformly** — the scorer is
  validated against its own good/bad references (`run.py --selftest` passes), so this isn't a
  measurement bug, but it's an unexplained real failure under headless conditions that doesn't
  favor or penalize any arm differentially. Investigate before trusting the 83% number in
  isolation.
- Judge model caveat above applies to the two rightmost columns.

Raw data: `agentic/runs/20260709-090745/{results,summary,judge,completeness}.json`.

**Not yet run:** the LOC-tier open-feature tasks against the pinned
`full-stack-fastapi-template` fixture (needs an external clone, see upstream README), and
`--models sonnet,opus` / higher `--runs` for a more solid sample.

## What's not built yet

- **Cost/latency tables for Set 2.** Set 1 gets these for free from promptfoo's API telemetry once run; Set 2 doesn't need them — pushback is a boolean signal, not a size/cost tradeoff.

## Metrics

| File | Metric | Behavior |
|------|--------|----------|
| `loc.js` | `code_loc` | Measurement — always passes, records line count. Vendored from ponytail (MIT). |
| `correctness.js` | `correct` | Gate — fails if generated code doesn't work. Vendored from ponytail (MIT). |
| `pushback.js` | `pushback` | Measurement — always passes, records whether the flaw was flagged. Codger-specific. |

## Notes

- Set 1 numbers should land in the same neighborhood as [ponytail's published results](https://github.com/DietrichGebert/ponytail/tree/main/benchmarks#median-results-10-runs-2026-06-13-cost-re-verified-at-30-runs-2026-06-17) for the baseline/caveman/ponytail profiles — if they don't, something in this harness drifted from theirs and needs checking before trusting the codger column next to it.
- Single-shot cost numbers aren't a session-cost promise (ponytail's own caveat applies here too): a real session re-injects the ruleset and reads skill files across many turns, so per-session cost can land higher or lower than a one-prompt generation number.

## Stats (`../stats.js`)

Real per-session numbers, not benchmark medians — the equivalent of caveman's `hooks/caveman-stats.js`. Reads the active (or most recent) Claude Code session transcript and reports actual output/cache-read tokens and turn count for *this* session. Run manually:

```bash
node ../stats.js
```

Savings estimate uses the Set 1 measured ratio (54%, `meta/llama-3.3-70b-instruct` via NVIDIA NIM — see `MEASURED_RATIO` in `stats.js`), applied as a flat approximation to any Claude session since no Anthropic-paid run exists yet. Every printed estimate carries the measurement-source caveat so it's never mistaken for a Claude-measured number — replace `MEASURED_RATIO` once a real Set 1 promptfoo run against Anthropic models is committed to `results/`.

Unlike caveman's version, this one doesn't persist a lifetime history file — that needs a hook wired into `SessionStart`/`UserPromptSubmit` (caveman's `.caveman-history.jsonl` + `caveman-config.js`), which Codger doesn't have yet. This is a single-session, run-it-yourself report, not a background tracker.
