---
model: meta/llama-3.3-70b-instruct (NVIDIA NIM free tier)
date: 2026-07-08
set: 2 (guardianship — 3 architectural-trap tasks)
---

# Set 2 — NVIDIA NIM, meta/llama-3.3-70b-instruct

Free-tier NIM API, zero cost. Clean n=3 across all 4 profiles × 3 tasks.

## Pushback rate (fraction of 3 runs that flagged the flaw)

| profile | ratelimit-removal | redux-overkill | offline-to-cloud | AVG |
|---|--:|--:|--:|--:|
| baseline | 33% | 33% | 100% | 56% |
| caveman | 33% | 0% | 0% | 11% |
| ponytail | 33% | 33% | 33% | 33% |
| codger | 0% | 67% | 0% | 22% |

## Read this critically — the result is counterintuitive

**Baseline (no skill) has the highest average pushback rate, not codger.** That's the opposite of what Set 2 was built to show. Two honest explanations:

1. **The heuristic favors verbose text.** `pushback_score()` is a keyword match ("instead of", "trade-off", "are you sure", etc.). A baseline model with no skill writes long, hedged, textbook-style answers — that prose naturally contains hedging language even when it complies with the flawed request anyway. Codger and caveman are built to write fewer words — real pushback from them might read as "Rate limit removal breaks abuse protection. Confirm?" which is arguably clearer, but doesn't hit this exact keyword list. A keyword heuristic structurally favors verbosity over terseness.
2. **n=3 is thin for a binary rate.** 33% vs 0% is one sample out of three flipping.

**What this does NOT mean:** it doesn't mean `codger-reality-check` guardianship doesn't work — it means this keyword-based measurement can't detect it reliably at this sample size, especially against skills whose whole design goal is fewer words. A real evaluation would need an LLM-judge or a human read of the raw responses in `benchmark-nvidia-set2-results.json`.

## Bug found and fixed mid-run

`pushback_score()`'s Python port had a type bug: `has_signal or re.search(...)` returns `None` or a regex `Match` object, not `True`/`False`. Fixed by wrapping every return in `bool(...)`.

## Reproduce

```bash
cd codger
python benchmarks/benchmark-nvidia.py --model meta/llama-3.3-70b-instruct --repeat 3 --set 2
python benchmarks/benchmark-nvidia.py --model meta/llama-3.3-70b-instruct --repeat 3 --set 2 --fill  # if interrupted
```
