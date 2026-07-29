# 05 — Entries and Fibonacci

## Two jobs, one tool, constant confusion

Fibonacci does two unrelated things in this model, and conflating them is the
classic error:

1. **Retracement** — where to *enter*. The OTE band.
2. **Projection** — where to *exit*. Standard deviations. Covered in
   [06 — Targets and risk](06-targets-risk.md).

Same tool, opposite ends of the trade.

---

## The anchor is the whole question

Fibonacci levels are meaningless without an anchor, and almost all bad fib usage
is bad anchoring rather than bad numbers. For this model the anchor is **fixed
and non-negotiable**:

> **The dealing range is the manipulation leg: from the raid extreme to the
> extreme of the displacement that reclaimed the key open.**

```
                                    ┌── displacement extreme  = 1.0
                                   ╱
              key open ───────────╱──────────────
                                 ╱
                                ╱
        raid extreme ──────────┘                 = 0.0
```

Anchor anywhere else — the day's high, the accumulation range, the swing before
the open — and you get levels that look meaningful and are not. The engine
computes this anchor for you (`Po3Read.dealingRange`) precisely so it cannot
drift.

---

## The OTE band

| Level | Ratio | Role |
|---|---|---|
| Equilibrium | 0.50 | Midpoint. Premium above, discount below. |
| OTE start | 0.62 | Shallow edge of the entry window |
| **OTE sweet spot** | **0.705** | The level ICT singles out |
| OTE end | 0.79 | Deep edge — beyond this the leg is failing |
| Invalidation | 1.00 | A full retracement kills the premise |

The band is 62%–79% of the manipulation leg. Its logic is structural rather than
mystical: **a retracement into this zone is, by construction, in discount for a
long and premium for a short.** The test suite asserts exactly that
(`tests/fib.test.ts`), because it is the reason the band is where it is rather
than somewhere else.

```bash
bun run src/cli.ts explain data.csv --date 2026-01-06
#   4. Dealing range      99.80 → 102.40
#      OTE 62–79%        100.79 … 100.57 (70.5%) … 100.35
```

---

## The gap and the band

Two independent entry candidates, from two different legs:

- The **fair value gap** left by the displacement.
- The **OTE band** of the manipulation leg.

They frequently overlap, and where they do is the model's highest-conviction
entry: an imbalance to fill *and* a structurally cheap price. That is
`entryMode: "confluence"`.

```
      ┌──────────────┐  FVG band
      │      ┌───────┼───────┐
      │      │ ██████│       │  ← confluence: enter here
      │      └───────┼───────┘
      └──────────────┘  OTE band
```

When the two do not overlap, `confluence` declines the trade. That is the
intended behaviour — it is a filter, and its cost is missed trades.

---

## Choosing an entry mode

| Mode | Price | Fill rate | Planned R | Use when |
|---|---|---|---|---|
| `fvg-proximal` | Near gap edge | Highest | Lowest | You want participation |
| `fvg-ce` | Gap midpoint | High | Medium | Balanced default |
| `fvg-distal` | Far gap edge | Medium | High | Gap is wide |
| `ote-start` | 62% | Medium | Medium | Gap is absent or tiny |
| `ote-sweet` | 70.5% | Lower | High | You can wait |
| `confluence` | Overlap | Lowest | Highest | Selectivity over frequency |

There is no free lunch here and the table is not a ranking. A deeper entry
means less risk and more R **on the trades that fill**, and fewer trades. The
only way to know which wins on your instrument is to measure:

```bash
bun run src/cli.ts learn data.csv
```

The engine's `no-fill` count exists specifically to make this trade-off visible.
A configuration showing wonderful expectancy over eight fills out of forty
setups is not better than one showing modest expectancy over thirty-five.

---

## Inverse FVG entries

When the displacement leaves no usable gap, the fallback is an **inverted** one:
a gap in the opposite direction that price has already closed through, which now
acts in the model's favour.

Enabled by `allowInverseFvg` (default true). It is marked `inferred` in the
spec — a standard construction, but not one specifically attributed to this
model. Worth ablating.

---

## Premium/discount as a hard filter

`requirePremiumDiscount: true` rejects any entry that is not in discount (for a
long) or premium (for a short) of the dealing range.

With `ote-*` modes this is automatically satisfied and the filter does nothing.
With `fvg-proximal` on a shallow gap it can reject trades — which is the point:
it stops you buying in the top half of the leg you are trading.

---

## Order mechanics

Two rules the engine enforces, both of which flatter results if you get them
wrong:

1. **The order is only working after the displacement candle closes.** You could
   not have known the setup existed before then. `armedFromIndex` enforces it.
2. **A limit fills when price *trades to* it**, not when a candle closes past
   it. Requiring a close means missing fills that really happened.

There is also an **entry cutoff** (default 12:00). A setup that has not filled
by then is abandoned rather than left working into the lunch drift.

---

## Next

→ **[06 — Targets and risk](06-targets-risk.md)**
