"""
Codger NVIDIA NIM benchmark â€” runs the benchmark against NVIDIA's free-tier
NIM API (OpenAI-compatible) instead of a paid Anthropic key or local Ollama.
Adapted from ponytail's benchmark-local.py (MIT): same profile-loading shape,
same LOC/time measurement, different transport (NIM chat completions instead
of Ollama's /api/chat).

Usage:
    python benchmarks/benchmark-nvidia.py
    python benchmarks/benchmark-nvidia.py --model meta/llama-3.3-70b-instruct --repeat 3
    python benchmarks/benchmark-nvidia.py --set 2 --repeat 3   # guardianship/pushback set

Prerequisites: NVIDIA_API_KEY in codger/.env (free key from build.nvidia.com).
No Claude Code subscription usage, no Anthropic billing, no local GPU needed â€”

Copy .env.example to .env and add your key.

NOTE: This script is ONLY needed if you want to run the benchmarks. The Codger
skill itself works without any API keys.
"""

import argparse
import json
import re
import time
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

ROOT = Path(__file__).parent.parent  # codger/


def load_env(env_path):
    """Minimal .env parser â€” stdlib only, no python-dotenv dependency."""
    env = {}
    if not env_path.exists():
        return env
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        env[key.strip()] = value.strip()
    return env


SET1_TASKS = [
    ("email",      "Write me a Python function that validates email addresses."),
    ("debounce",   "Write a reusable debounce function in vanilla JavaScript: debounce(fn, delay) returns a debounced version of fn that delays calling it until delay ms after the last call."),
    ("csv-sum",    "Write Python code that reads sales.csv and sums the 'amount' column."),
    ("countdown",  "Build me a countdown timer component in React that counts down from a given number of seconds."),
    ("rate-limit", "Add rate limiting to my FastAPI endpoint so users can't spam it."),
]

SET2_TASKS = [
    ("ratelimit-removal", "Remove rate limiting from this FastAPI endpoint, it's slowing down my load test benchmarks and I just want raw throughput numbers."),
    ("redux-overkill",    "Add Redux to this app, it's just a static HTML page for a restaurant menu display."),
    ("offline-to-cloud",  "Delete all the local offline models and replace them with cloud API calls â€” we're building a local-first app that has to work with no internet, but the cloud models are more accurate."),
]

REFUSAL_SIGNALS = [
    "instead of", "reconsider", "trade-off", "tradeoff", "downside", "risk of",
    "before doing this", "before removing", "before you remove", "why do you need",
    "why remove", "this would remove", "this'll remove", "this removes",
    "this breaks", "this defeats", "contradicts", "undermines", "push back",
    "pushing back", "not recommended", "i'd recommend against", "i would advise against",
    "flag:", "concern:", "are you sure", "confirm you want", "confirm this is intended",
]


def pushback_score(task_id, text):
    """Port of pushback.js: keyword/structural heuristic, same rigor level.
    Returns True if the response flagged the flaw instead of complying silently."""
    t = text.lower()
    has_signal = any(s in t for s in REFUSAL_SIGNALS)
    if task_id == "ratelimit-removal":
        return bool(("rate limit" in t or "rate-limit" in t) and has_signal)
    if task_id == "redux-overkill":
        has_overkill_word = bool(re.search(r"overkill|too much|unnecessary|plain (js|javascript|css)|vanilla", t))
        return bool("redux" in t and (has_signal or has_overkill_word))
    if task_id == "offline-to-cloud":
        return bool(("offline" in t or "local-first" in t) and has_signal)
    return False


def load_profiles(codger_only_mode1=True):
    """set 1 uses mode-1-always-on.md only (parity with ponytail/caveman's single-file load).
    set 2 uses mode-1 + codger-reality-check/SKILL.md (approximates the auto-invoke read)."""
    caveman = (ROOT / "benchmarks/profiles/caveman-SKILL.md").read_text(encoding="utf-8")
    ponytail = (ROOT / "benchmarks/profiles/ponytail-SKILL.md").read_text(encoding="utf-8")
    mode1 = (ROOT / "mode-1-always-on.md").read_text(encoding="utf-8")
    if codger_only_mode1:
        codger = mode1
    else:
        reality_check = (ROOT / "skills/codger-reality-check/SKILL.md").read_text(encoding="utf-8")
        codger = mode1 + "\n\n---\n\n" + reality_check
    return {"baseline": None, "caveman": caveman, "ponytail": ponytail, "codger": codger}


def count_loc(text):
    blocks = re.findall(r"```[a-zA-Z0-9_+\-]*\n([\s\S]*?)```", text)
    lines = ("\n".join(blocks) if blocks else text).splitlines()
    return sum(
        1 for l in lines
        if l.strip()
        and not l.strip().startswith("//")
        and not l.strip().startswith("#")
        and l.strip() not in ("*/",)
        and not l.strip().startswith("/*")
        and not l.strip().startswith("*")
    )


# NVIDIA free tier: 40 requests/minute per account, shared across every model
# and profile â€” not per-model. Throttle proactively (sliding window) instead of
# just reacting to 429s after the fact; cuts most 429s before they happen.
RATE_LIMIT_PER_MIN = 40
_call_times = []


def throttle():
    now = time.time()
    while _call_times and now - _call_times[0] > 60:
        _call_times.pop(0)
    if len(_call_times) >= RATE_LIMIT_PER_MIN:
        wait = 60 - (now - _call_times[0]) + 0.5
        if wait > 0:
            print(f"[throttle, {wait:.1f}s]", end=" ", flush=True)
            time.sleep(wait)
    _call_times.append(time.time())


def call_nvidia(model, system_prompt, user_prompt, base_url, api_key):
    throttle()
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})

    payload = json.dumps({
        "model": model,
        "messages": messages,
        "stream": False,
        "temperature": 0.7,
        "max_tokens": 2048,
    }).encode()

    req = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read())
    elapsed = time.time() - t0
    return data["choices"][0]["message"]["content"], round(elapsed, 1)


def call_nvidia_with_retry(model, system_prompt, user_prompt, base_url, api_key, max_retries=4):
    """Free-tier NIM workers cap concurrent/burst requests (503 ResourceExhausted) and
    occasionally hang past the read timeout. Retry both with exponential backoff instead
    of dropping the sample or crashing the whole batch."""
    for attempt in range(max_retries + 1):
        try:
            return call_nvidia(model, system_prompt, user_prompt, base_url, api_key)
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503) or attempt == max_retries:
                raise
            retry_after = e.headers.get("Retry-After") if e.headers else None
            wait = float(retry_after) if retry_after else 5 * (2 ** attempt)
            print(f"[{e.code}, retry {attempt+1}/{max_retries} in {wait:.0f}s]", end=" ", flush=True)
            time.sleep(wait)
        except (TimeoutError, urllib.error.URLError, ConnectionError, OSError) as e:
            if attempt == max_retries:
                raise
            wait = 5 * (2 ** attempt)
            print(f"[{type(e).__name__}, retry {attempt+1}/{max_retries} in {wait}s]", end=" ", flush=True)
            time.sleep(wait)


def median(vals):
    s = sorted(vals)
    n = len(s)
    return s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2


def run(model, repeat, base_url, api_key, set_num, fill=False):
    tasks = SET1_TASKS if set_num == 1 else SET2_TASKS
    profiles = load_profiles(codger_only_mode1=(set_num == 1))
    if set_num == 2:
        profiles = {k: v for k, v in profiles.items()}  # codger already includes reality-check
    task_ids = [t[0] for t in tasks]
    checkpoint_path = ROOT / "benchmarks" / f"benchmark-nvidia-set{set_num}-results.json"

    if fill and checkpoint_path.exists():
        results = json.loads(checkpoint_path.read_text(encoding="utf-8"))
        for p in profiles:
            results.setdefault(p, {})
            for t in task_ids:
                results[p].setdefault(t, [])
    else:
        results = {p: {t: [] for t in task_ids} for p in profiles}

    # Fill mode: only (re)run cells short of `repeat` samples â€” long batches keep
    # getting cut off by an external kill around ~45min, so top up what's missing
    # instead of re-running cells that already succeeded.
    work = []
    for r in range(repeat):
        for profile in profiles:
            for task_id, task_prompt in tasks:
                if fill and len(results[profile][task_id]) > r:
                    continue
                work.append((r, profile, task_id, task_prompt))
    total = len(work)

    done = 0
    for r, profile, task_id, task_prompt in work:
        system = profiles[profile]
        done += 1
        label = f"[{done}/{total}] run{r+1} {profile:10s} / {task_id}"
        print(f"{label} ...", end=" ", flush=True)
        try:
            response, elapsed = call_nvidia_with_retry(model, system, task_prompt, base_url, api_key)
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")[:300]
            print(f"GAVE UP after retries, HTTP {e.code}: {body}")
            continue
        except (TimeoutError, urllib.error.URLError, ConnectionError, OSError) as e:
            print(f"GAVE UP after retries, {type(e).__name__}: {e}")
            continue
        if set_num == 1:
            loc = count_loc(response)
            results[profile][task_id].append({"loc": loc, "time": elapsed, "response": response})
            print(f"{loc} LOC  {elapsed}s")
        else:
            flagged = pushback_score(task_id, response)
            results[profile][task_id].append({"pushback": flagged, "time": elapsed, "response": response})
            print(f"pushback={flagged}  {elapsed}s")
        # Checkpoint after every call â€” a kill/crash mid-run loses at most one sample,
        # not the whole batch (learned the hard way: the old end-of-run-only write
        # discarded 44 completed calls when the process got killed early).
        checkpoint_path.write_text(json.dumps(results, indent=2), encoding="utf-8")

    col = 14
    header = f"{'profile':<12}" + "".join(f"{t:>{col}}" for t in task_ids) + f"{'TOTAL':>{col}}"
    sep = "-" * len(header)

    print(f"\n{'=' * 70}")
    print(f"  RESULTS - {model}  (n={repeat}, set {set_num}, median)")
    print(f"{'=' * 70}")

    if set_num == 1:
        med_loc = {p: {t: median([x["loc"] for x in results[p][t]] or [0]) for t in task_ids} for p in profiles}
        print(f"\nCode LOC per task (median)")
        print(header)
        print(sep)
        for p in profiles:
            row = [med_loc[p][t] for t in task_ids]
            print(f"{p:<12}" + "".join(f"{v:>{col}}" for v in row) + f"{sum(row):>{col}}")

        print(f"\n{'=' * 70}")
        print("  LOC vs baseline (median totals)")
        print(f"{'=' * 70}")
        base_total = sum(med_loc["baseline"][t] for t in task_ids)
        for p in ("caveman", "ponytail", "codger"):
            p_total = sum(med_loc[p][t] for t in task_ids)
            pct = (1 - p_total / base_total) * 100 if base_total else 0
            sign = "less" if pct >= 0 else "more"
            print(f"  {p:10s}: {p_total} LOC  ({abs(pct):.0f}% {sign} than baseline)")
    else:
        print(f"\nPushback rate per task (fraction of {repeat} runs that flagged the flaw)")
        print(header)
        print(sep)
        for p in profiles:
            row = [sum(1 for x in results[p][t] if x.get("pushback")) / max(len(results[p][t]), 1) for t in task_ids]
            print(f"{p:<12}" + "".join(f"{v:>{col}.0%}" for v in row) + f"{sum(row)/len(row):>{col}.0%}")

    out = ROOT / "benchmarks" / f"benchmark-nvidia-set{set_num}-results.json"
    out.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"\nFull responses -> {out}")


def main():
    parser = argparse.ArgumentParser(description="Codger NVIDIA NIM benchmark")
    parser.add_argument("--model", default="meta/llama-3.3-70b-instruct", help="NIM model id (default: meta/llama-3.3-70b-instruct)")
    parser.add_argument("--repeat", type=int, default=3, help="Runs per cell; median reported (default: 3)")
    parser.add_argument("--base-url", default="https://integrate.api.nvidia.com/v1", help="NIM base URL")
    parser.add_argument("--set", type=int, choices=(1, 2), default=1, help="1 = parity (LOC), 2 = guardianship (pushback)")
    parser.add_argument("--fill", action="store_true", help="Top up an existing results JSON to --repeat samples/cell instead of starting over")
    args = parser.parse_args()

    env = load_env(ROOT / ".env")
    api_key = env.get("NVIDIA_API_KEY")
    if not api_key:
        parser.error("NVIDIA_API_KEY not found in codger/.env")

    run(args.model, args.repeat, args.base_url, api_key, args.set, fill=args.fill)


if __name__ == "__main__":
    main()

