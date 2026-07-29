# 03 — The 10am model

The sequence, in order. Every step is a gate: fail one and the day is over.
There is no partial credit and no "close enough" — the engine encodes each gate
as a hard condition and records which one failed
(`Po3Read.rejectedReason`).

---

## The sequence

```
09:30 ─────────────────────────────────────────────────────────────
  1. ACCUMULATION   The cash open builds a range. Stops collect on both sides.

10:00 ─────────────────────────────────────────────────────────────
  2. KEY OPEN       A new 4-hour candle opens. This price is the axis.

10:00–10:30 ───────────────────────────────────────────────────────
  3. MANIPULATION   Price raids one side of the range and rejects.
                    → Direction is now fixed: trade AWAY from the raid.

…–11:30 ───────────────────────────────────────────────────────────
  4. DISTRIBUTION   Price displaces back THROUGH the key open, leaving a gap.
                    → This is the confirmation. No displacement, no trade.

…–12:00 ───────────────────────────────────────────────────────────
  5. ENTRY          Retrace into the gap and/or the OTE band of the raid leg.

  6. RISK           Stop beyond the raid extreme. Target at opposing liquidity.
                    Minimum 2R or the setup is declined.

16:00 ─────────────────────────────────────────────────────────────
                    Flat. Nothing is carried overnight.
```

---

## Step 1 — Accumulation (09:30 → 10:00)

Measure the high and low of the 30 minutes between the cash open and the key
open. That range is the model's reference. Two things come from it:

- The **pools** the manipulation leg is allowed to raid.
- The **scale** used to judge whether a raid was meaningful — penetration is
  measured as a fraction of this range, so the test adapts to a quiet morning
  or a violent one instead of using a fixed number of points.

A very narrow range is a warning, not an opportunity: it means the raid
threshold is tiny and noise will trip it.

---

## Step 2 — The key open (10:00)

Record the **open price** of the 10:00 candle. Not the high, not the close, not
the range — a single number. Draw it across the chart.

Everything that follows is defined relative to this line. The sweep happens on
one side of it; the trade is taken on the other. If you cannot state which side
of the key open your entry is on, you are not trading this model.

---

## Step 3 — Manipulation (10:00 → 10:30)

Price drives through one side of the accumulation range and **rejects**.

Two conditions, both mandatory:

- **Penetration.** It must clear the level by a meaningful amount — the default
  is 2% of the accumulation range. A one-tick graze is not a raid.
- **Rejection.** The candle must close back inside the range. Trading through
  and *closing* through is expansion, and expansion is the one thing this model
  must never be traded into.

**Direction is decided here and cannot be revisited.** Sweep the lows → the
model is a buyer. Sweep the highs → a seller. There is no version of this model
where you sweep the lows and sell.

This step is where the money is lost. → **[04 — Manipulation](04-manipulation.md)**

---

## Step 4 — Distribution (→ 11:30)

The reversal must prove itself. Three tests:

- **Energy.** The move must be large relative to recent range — the default
  floor is 1.5× ATR of the body. "Fast and aggressive" made measurable.
- **Imbalance.** It must leave a fair value gap. Without a gap there is nothing
  to retrace into and therefore no entry.
- **Reclaim.** It must **close back through the key open price**. This is what
  makes it the 10am model rather than a generic reversal: the raid is on one
  side of the axis, the trade on the other.

A move may span up to three consecutive candles (`maxDisplacementCandles`), since
a real expansion leg is often two or three bars rather than one outsized one.

Optionally require a full **MSS** (`requireMss: true`) — a counter-trend
structure break carried by that displacement.

---

## Step 5 — Entry

The displacement leg's gap and the OTE band of the manipulation leg are both
candidates. The engine supports six entry modes; they are a genuine trade-off
between fill rate and risk, not a matter of preference:

| Mode | Where | Fills | Risk |
|---|---|---|---|
| `fvg-proximal` | Near edge of the gap | Most often | Largest |
| `fvg-ce` | Gap midpoint | Often | Medium |
| `fvg-distal` | Far edge of the gap | Less often | Small |
| `ote-start` | 62% of the raid leg | Varies | Medium |
| `ote-sweet` | 70.5% of the raid leg | Less often | Small |
| `confluence` | Where the gap and OTE overlap | Least often | Smallest |

`confluence` is the model's highest-conviction entry and also the one that
misses the most trades. Which is correct is an empirical question — that is what
`bun run src/cli.ts learn` is for.

→ **[05 — Entries and Fibonacci](05-entries-fib.md)**

---

## Step 6 — Risk

**Stop** goes beyond the *raid extreme* — the furthest price printed during the
manipulation leg — plus a small buffer so it does not sit on the exact tick.
Not beyond the entry candle. Not a fixed number of points. If the raid extreme
is broken, the premise is dead and the reason to be in the trade has gone.

**Target** goes at structural liquidity: the next opposing pool, or a standard
deviation projection of the manipulation leg. Never a round number.

**Minimum 2R or no trade.** This filter does more work than it looks like — it
declines the days where the sweep was deep and the next pool is close, which
are exactly the low-quality setups.

→ **[06 — Targets and risk](06-targets-risk.md)**

---

## Worked example

```
$ bun run src/cli.ts explain data.csv --date 2026-01-06

── 2026-01-06 ─ 10am Key Open model ──────────────────────────────
  Key open (10:00 ET)   102.00
  1. Accumulation       99.95 – 104.05  (range 4.10)
  2. Manipulation       swept the low at 99.95 (opening range low) to 99.80 at 10:03
     → bias            long (trade away from the raid)
  3. Distribution       long displacement 2.31× ATR at 10:05, FVG 100.35–100.80
     Structure         MSS long through 100.55
  4. Dealing range      99.80 → 102.40
     OTE 62–79%        100.79 … 100.57 (70.5%) … 100.35
     Projections       -1σ 105.00   -2σ 107.60   -2.5σ 108.90   -4σ 112.80
  5. Entry              100.80  (FVG proximal)
  6. Stop               99.71  beyond the raid extreme
     Target            107.60  (-2 std dev projection) — 6.24R planned
  → Result              target +6.24R (MFE 7.10R, MAE 0.09R)
```

Every line is produced by the engine, including the rejections. A day that does
not set up prints the reason it did not, which is where most of the learning is.

---

## The three failure modes

1. **Trading the raid instead of the reversal.** You see price break the range
   low and you sell. The model does the opposite. This is the error the whole
   `requireCloseBackInside` rule exists to prevent.
2. **Accepting a weak reversal.** Price ticks back over the key open on a small
   candle with no gap. Without displacement there is no evidence anything
   changed, and the "setup" is just noise.
3. **Moving the stop.** The stop is beyond the raid extreme because that price
   is the premise. Widening it is not risk management; it is abandoning the
   model while remaining in the trade.

---

## Next

→ **[04 — Manipulation](04-manipulation.md)**
