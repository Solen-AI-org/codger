---
model: meta/llama-3.3-70b-instruct (NVIDIA NIM free tier)
date: 2026-07-08
set: 1 (parity — 5 everyday tasks)
---

# Set 1 — NVIDIA NIM, meta/llama-3.3-70b-instruct

Free-tier NIM API, zero cost (no Anthropic/OpenAI key, no Claude Code subscription usage). Clean n=3 across all 4 profiles × 5 tasks (60 calls total, spread over several interrupted attempts — see "What went wrong" below for why it took multiple runs).

## Code LOC per task (median of 3)

| profile | email | debounce | csv-sum | countdown | rate-limit | TOTAL |
|---|--:|--:|--:|--:|--:|--:|
| baseline | 21 | 15 | 33 | 49 | 34 | 152 |
| caveman | 6 | 7 | 1 | 29 | 12 | 55 |
| ponytail | 13 | 11 | 8 | 34 | 14 | 80 |
| codger | 6 | 7 | 15 | 30 | 12 | 70 |

## LOC vs baseline (median totals)

- caveman: 55 LOC (64% less than baseline)
- codger: 70 LOC (54% less than baseline)
- ponytail: 80 LOC (47% less than baseline)

Direction matches ponytail's own published Claude-model results (all three skills land well under baseline). On this model, **caveman comes out leanest**, codger second, ponytail third — different ranking than an earlier partial run (n=1-2 per cell) suggested codger was leanest. That earlier ranking flipped once `codger`/csv-sum got its third sample (15 LOC, pulling the median way up from an n=2 median of 4) — a direct illustration of why n=1-2 medians aren't trustworthy and the note below existed in the first place.

Don't over-read this either: one model, one run, no repeated trials of the whole experiment. Treat "caveman < codger < ponytail" on `meta/llama-3.3-70b-instruct` as this run's result, not a general claim about the three skills.

## What went wrong (honesty note — why this took 5 attempts)

- **429 Too Many Requests**: free-tier NIM caps at 40 requests/minute *per account*, shared across every model and profile — not per-model. First attempts didn't retry 429 at all (only 503/timeout), dropping samples. Fixed: added 429 to the retry branch (respects `Retry-After` if present) and added a proactive sliding-window throttle (max 40 calls/min) so most 429s are avoided before they happen, not just retried after.
- **Genuine hang**: one call hung well past the retry budget. Killing it on Windows required finding the real Win32 PID via `Get-CimInstance Win32_Process` — `ps aux`'s PID (Cygwin-translated) didn't match what `taskkill` needed and silently failed to find the process.
- **Checkpointing**: `benchmark-nvidia.py` writes the results JSON after every single call, not just at the end — added after a premature kill (mine, misjudging a slow-but-working call as hung) discarded 44 already-completed calls under the old end-of-run-only write.
- **Unexplained background kills**: independent of all of the above, two full-batch runs died mid-way with exit code 1 and no Python traceback — looks like something external to the script (the sandboxed background-task runner) killing the process, not a bug in the retry/timeout logic. Cause not diagnosed. Worked around by adding `--fill` mode: reads the existing results JSON, and only (re)runs cells short of the target repeat count instead of starting the whole batch over. Ran `--fill` twice to top up the last stragglers after two more silent kills — each time it picked up exactly where the last one left off, confirming the checkpoint+fill combination is resilient to this even without knowing the root cause.

## Reproduce

```bash
cd codger
python benchmarks/benchmark-nvidia.py --model meta/llama-3.3-70b-instruct --repeat 3 --set 1
# if it dies partway (see above), just re-run with --fill to top up what's missing:
python benchmarks/benchmark-nvidia.py --model meta/llama-3.3-70b-instruct --repeat 3 --set 1 --fill
```

Needs `NVIDIA_API_KEY` in `codger/.env` (free key from build.nvidia.com).
