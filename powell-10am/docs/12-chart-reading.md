# 12 — Reading a screenshot

You send a TradingView screenshot; you get back a verdict, a reason, and an
action. This document is how that works, what it can and cannot see, and how to
take a screenshot that produces a firm answer instead of a shrug.

---

## The split that makes it reliable

```
   screenshot ──▶ perception ──▶ ChartObservation ──▶ evaluate() ──▶ verdict
                  (the eye)       (structured facts)   (the encoded model)
```

**Perception and judgement are separate on purpose.** Reading a chart is
genuinely uncertain — a small candle's close, an exact price, whether a wick
cleared a level by enough. Judgement is not: the six gates are fixed, and they
are the same ones `src/model.ts` runs over historical data.

If the verdict were improvised in prose each time, the same chart would get
different answers on different days, and "Powell's model" would quietly become
"whatever seemed reasonable". Routing every reading through `evaluate()` means
the chart path and the data path cannot disagree — a test pins that
(`tests/verdict.test.ts`).

---

## What you get back

```
  ✓ VALID
  Valid long. Work a limit at 20094.00 (FVG proximal), stop 20070.00,
  target 20166.00 (prior day high) — 3.00R.

  Why
    Every gate passed: the lows were raided and rejected, and price displaced
    back through the 10:00 open leaving an imbalance to enter on.
    The stop sits beyond the raid extreme because that price is the premise…

  Gates
    ✓ 10:00 key open identified          key open at 20102.00
    ✓ 09:30–10:00 range established      range 20080.00 – 20124.00
    ✓ Raid cleared the level meaningfully  cleared by 8.50, threshold 0.88
    ✓ Raid was rejected, not continued   closed back inside
    ✓ Displacement runs away from the raid
    ✓ Closed back through the 10:00 open
    ✓ Displacement left a fair value gap  20088.50–20094.00
    ✓ Displacement was energetic          2.40× ATR against a 1.5× floor
    ✓ Reward:risk clears the 2R floor     3.00R planned
```

Four possible verdicts:

| Verdict | Meaning | What you are told |
|---|---|---|
| **VALID** | Every gate passed | Entry, stop, target, planned R, and whether the entry is still ahead of price |
| **INVALID** | A gate failed | Which one, what was observed, and why that gate exists |
| **FORMING** | Sequence incomplete | Exactly what to wait for, and the direction already fixed by the raid |
| **UNCERTAIN** | Something is unreadable | Precisely what to send so it can be decided |

`UNCERTAIN` is a feature. A confident wrong verdict is the one output this must
never produce, so anything unreadable is reported rather than assumed.

---

## Taking a usable screenshot

**The one that matters most: set the chart to New York time.** In TradingView,
click the clock at the bottom right and choose *New York*. The entire model is
defined in ET wall-clock; on a chart set to Stockholm or UTC, the candle labelled
10:00 is not the key open and every conclusion drawn from it is wrong.

Then:

| | |
|---|---|
| **Timeframe** | 1m or 5m. 15m is too coarse to see the gap. |
| **Visible span** | 09:15 → now. The 09:30–10:00 range **must** be on screen. |
| **Price scale** | Visible on the right. Without it no price can be read. |
| **Time axis** | Visible at the bottom, so 10:00 can be located. |
| **Zoom** | Enough that individual candle bodies and wicks are distinguishable around the raid. |

Helpful, not required:

- A horizontal ray at the **10:00 open price**. This removes the largest single
  source of reading error.
- Prior day high/low marked, so target candidates are visible.
- An ATR study, which turns the energy gate from a judgement into a number.
- A **second screenshot of ES** over the same window if you want the SMT check.

### The single most useful thing you can do

Draw the 09:30–10:00 range as a box and the 10:00 open as a ray, then screenshot
that. It converts three of the hardest things to read into two things that are
unambiguous, and the verdict goes from `UNCERTAIN` to a firm call far more often.

---

## What cannot be read from a picture

Stated plainly, because knowing the limits is what makes the rest trustworthy:

- **Exact prices.** Values are read off the axis and are approximate. The R
  calculation inherits that approximation — treat `3.00R` as "about 3R".
- **A small candle's close.** On a zoomed-out chart, whether the sweeping candle
  closed back inside the level is often genuinely indeterminate. This is the
  most important gate in the model, so it is never guessed. Zoom in on that one
  candle and re-send.
- **ATR**, unless the study is on the chart. Without it the energy gate reports
  `unknown` and the displacement is judged by eye, which is weaker.
- **SMT**, without a second instrument's chart over the same window.
- **What happened after the screenshot.** A verdict describes the moment
  captured, nothing later.

---

## Using it from the CLI

The same evaluation runs headless. Print a blank observation, fill it in, judge
it:

```bash
bun run src/cli.ts verdict --template > today.json
# … fill in what you can read; leave anything uncertain as null …
bun run src/cli.ts verdict today.json
```

Any spec field can be overridden, so you can ask what the same chart looks like
under a different entry model:

```bash
bun run src/cli.ts verdict today.json --entryMode confluence
bun run src/cli.ts verdict today.json --targetMode std-dev
bun run src/cli.ts verdict today.json --minPlannedR 3
```

### The observation format

`null` means *unknown* and is always safe. A wrong value is far worse than an
absent one.

```json
{
  "instrument": "NQ", "timeframe": "1m", "date": "2026-03-10",
  "keyOpenPrice": 20102.00,
  "accumulationHigh": 20124.00,
  "accumulationLow": 20080.00,
  "sweep": {
    "side": "low",
    "level": 20080.00,
    "levelSource": "opening range low",
    "extreme": 20071.50,
    "closedBackInside": true,
    "timeEt": "10:07"
  },
  "displacement": {
    "direction": "long",
    "closedThroughKeyOpen": true,
    "leftFvg": true,
    "fvgProximal": 20094.00,
    "fvgDistal": 20088.50,
    "extreme": 20131.00,
    "bodyToAtr": 2.4,
    "timeEt": "10:14"
  },
  "currentPrice": 20118.00,
  "targetCandidates": [
    { "price": 20124.00, "label": "opening range high" },
    { "price": 20166.00, "label": "prior day high" }
  ],
  "atr": 6.0,
  "uncertain": []
}
```

---

## A worked rejection

The observation above produces:

```
  ✗ INVALID
  No trade.

  Why
    Reward:risk clears the 2R floor failed: 1.25R planned — entry 20094.00,
    stop 20070.00, target 20124.00.
    This filter removes the deep-raid, close-draw days, which are
    systematically the poor instances.
```

Every structural gate passed. The raid was clean, the displacement was strong,
the gap was there. It still fails, because the raid ran 8.5 points past the level
and the nearest opposing pool sits only 30 points above the entry — a deep raid
with a close draw.

This is the model working, and it is the kind of day that is hardest to sit out
precisely because everything *looks* right. Switching the target to the
standard deviation projection (`--targetMode std-dev`) would find a further
objective and pass — which is a legitimate configuration choice, not a way to
argue with the answer. Decide that before the session, not while looking at a
setup you want to take.

---

## Honest scope

This reads charts and applies encoded rules. It does not know your account, your
size, or your risk tolerance, and it is not advice about what to do with money.
It also inherits every caveat in [08 — Sources](08-sources.md): the model itself
is reconstructed from secondary material, because the source videos could not be
accessed.

---

← **[00 — Overview](00-overview.md)**
