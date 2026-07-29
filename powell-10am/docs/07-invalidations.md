# 07 — Invalidations

The days you do not trade are part of the model, not an absence of it. The
engine declines roughly two days in three on the bundled data, and every
rejection is recorded with a reason.

```bash
bun run src/cli.ts backtest data.csv
#   Why days were skipped:
#       56  no liquidity sweep inside the manipulation window
#       10  no qualifying displacement back through the key open
#        6  planned R below the 2R floor
```

---

## Hard invalidations

Each maps to a gate in `src/model.ts` and to a `rejectedReason` string.

### 1. No raid in the window
Price never took a pool between 10:00 and 10:30. There is no manipulation leg,
so there is no PO3 to trade. The most common rejection by a wide margin.

### 2. The sweep closed through the level
Expansion, not manipulation. Not merely "no trade" — an active warning that
momentum is running the other way. Fading this is the single most expensive
mistake available in this model.

### 3. No displacement back through the key open
Price raided and then drifted. Without an energetic reclaim there is no evidence
anything changed. A slow crawl back over the line is not a reclaim.

### 4. No fair value gap
The reversal happened but left no imbalance. There is nothing to retrace into,
so there is no entry with a defined risk.

### 5. Planned R below the floor
The geometry does not pay. Deep raid, poor entry, close draw. Declining these is
the filter doing its job.

### 6. No fill before the cutoff
The setup was valid and price never came back. This is a *good* outcome — the
alternative is chasing.

### 7. Direction fights the contextual bias
Only when `enforceBias: true`. The raid says long, the midnight open says the
day is in premium. Off by default; see [02 — Key opens](02-key-opens.md).

---

## Soft warnings — judgement, not gates

The engine does not encode these. They are the difference between running the
rules and understanding them.

**A very narrow accumulation range.** Penetration is measured as a fraction of
that range, so a 3-point range makes the raid threshold trivially small and
noise will trip it. Consider raising `minSweepPenetration` on quiet mornings.

**Scheduled news inside the window.** 10:00 ET is exactly when a large block of
US data releases. This is now handled explicitly rather than left as a warning —
see [13 — News](13-news.md). The short version: an ordinary high-impact release
*delivers* the raid and the model still applies, but the rejection test is
unreliable until the release candle closes; a tier-one event (FOMC, CPI, NFP)
replaces the model's premise rather than fuelling it.

**Both sides swept.** Price took the highs *and* the lows before displacing.
Direction is genuinely ambiguous; the engine picks the larger excursion, which
is a reasonable convention and not a truth.

**The prior day was a large trend day.** The 09:30–10:00 range on the day after
a strong trend often sits inside the previous range, and its "pools" are not
where the real orders are.

**A holiday or half-session.** Thin books, meaningless levels. The `tradingDays`
filter handles weekends but knows nothing about market holidays.

---

## Failure modes of the trader, not the model

Worth naming because they do not show up in any backtest:

**Widening the stop.** Covered in [06](06-targets-risk.md). It is not risk
management.

**Trading the second setup.** The model is one trade per day. The 11:45
"re-entry" after a stop-out is a different model that has never been tested.

**Moving the window.** "It swept at 10:47, close enough." Then 11:20. Then it is
not this model any more and the statistics you built confidence on do not apply.

**Adding conditions after a loss.** Every loss suggests a filter that would have
avoided it. Adding filters one loss at a time is curve fitting with extra steps,
and it is what `walkForward` exists to catch:

```bash
bun run src/cli.ts learn data.csv
#   Degradation (in-sample − out-of-sample): +0.42R
#     ⚠ Large gap — the grid was fitting noise.
```

**Believing a small sample.** Eight trades is not evidence. Thirty is not
evidence. The `defaultObjective` function deliberately shrinks the score of thin
samples toward zero for this reason, and the walk-forward report warns
explicitly when the out-of-sample pool is under thirty trades.

---

## Next

→ **[08 — Sources](08-sources.md)** — read this before trusting any of the above.
