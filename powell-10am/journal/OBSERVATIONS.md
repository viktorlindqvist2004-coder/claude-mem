# Observations

The running list of candidate improvements. **Read this before reviewing any
chart, and append to it after.** Nothing carries over between sessions except
what is written here.

Each observation carries the **evidence** behind it and a **status**. An
observation is not a rule change — it becomes one only after it has been tested
against data, because adopting filters one loss at a time is curve fitting with
extra steps ([07 — Invalidations](../docs/07-invalidations.md)).

Status values:

| Status | Meaning |
|---|---|
| `open` | Noticed, not yet tested. Do not act on it. |
| `testing` | Being measured against data right now. |
| `adopted` | Tested, held up, and is in `src/spec.ts`. |
| `rejected` | Tested and did not hold up. Kept so it is not re-proposed. |
| `done` | A fix or process change, already applied. |

---

## 1 — The key open printing at the window's extreme predicts failure

**Status:** `open` · **Evidence:** 5 for, 1 against (see below)

On 27, 28 and 29 July the 10:00 open printed at or within a few points of the
09:30–10:00 **low**. All three failed — two as outright expansion, one as a raid
with no imbalance.

The mechanism is not subtle: if the key open sits on the window's extreme, there
is no liquidity left on that side to raid. The "range" the model needs on both
sides of its axis does not exist. Price simply continues.

**Candidate rule:** decline the day when the key open sits within *X%* of either
window extreme. A first guess at *X* is 10–15% of the range.

**How to test:**

```bash
bun run src/cli.ts backtest data.csv          # baseline
# then implement the filter and compare, and check it survives:
bun run src/cli.ts learn data.csv
```

### Confirmed in the mirror

The 5m-only day reviewed on 30 Jul had the key open print just below the window
**high**, and the day expanded **upward** through it. Same mechanism, opposite
side. That removes the obvious objection that the first three were an artefact
of one falling week.

### Counter-evidence — 15 Jul 2026

The key open printed at 29,637, mid-window in a 29,554–29,777 range. Liquidity
on both sides, the healthiest structure in the sample — and the day still failed,
as expansion through the low.

This matters for how the observation is stated. It claims **an extreme predicts
failure**. It does *not* follow that **the middle predicts success**, and 15 July
is the reminder. Whatever filter comes out of this can only ever remove bad days;
it cannot manufacture good ones.

**Do not adopt on a handful of days.** This is the single most promising idea in
the list and therefore the most dangerous one to accept early. It needs a full
backtest and a walk-forward before it goes near the spec.

---

## 2 — The sharp reversal keeps originating at 09:30, not 10:00

**Status:** `open` · **Evidence:** 3 of 5 days (23, 27, 29 Jul 2026)

On 23 July the textbook raid — a long lower wick to 28,495 followed by a hard
reversal — printed on the **09:30** candle. On 27 and 29 July the day's decisive
move also began within a few minutes of 09:30, well before the key open.

That is the 09:30 open's own Power of 3, not the 10:00 candle's. The model
correctly ignores it, because the manipulation window is defined as
10:00–10:30 — but it keeps being where the tradeable move was.

**Candidate:** the engine is already anchor-agnostic. Run the whole thing with
`keyOpen: "09:30"` and compare, rather than arguing about it:

```bash
bun run src/cli.ts backtest data.csv --keyOpen 09:30 --accumulationStart 09:00
```

**Caution:** this is a *different model*, not a tuning of this one. If it works
better it deserves its own spec and its own journal, not a quiet reinterpretation
of the 10am one.

---

## 3 — Entry levels must come from hovered gap edges, never estimated

**Status:** `done` (process) · **Evidence:** 24 Jul 2026

The 24 July entry at 28,215 was **invented** by the reviewer as a plausible FVG
proximal edge — the real edges were not readable at that zoom. It happened to
work, which is worse than if it had failed, because it makes an unfounded number
look validated.

**Applied:** the reading checklist now requires hovering the candle *before* the
displacement (`H`) and the one *after* (`L`). Those two values give the real
proximal edge. Anything else is an estimate and must be labelled as one in the
verdict's assumptions.

---

## 4 — Two things a screenshot cannot settle

**Status:** `done` (process) · **Evidence:** all 5 days

Every `UNCERTAIN` verdict this week turned on one of exactly two readings:

1. **Did the sweeping candle CLOSE back inside the level?** Decides raid versus
   expansion — the trade versus its opposite.
2. **Where are the gap's edges?** Decides the entry.

Neither survives a zoomed-out chart. **Applied:** both are now the first two
items on the hover checklist, and `closedBackInside` is never inferred from a
wick.

---

## 5 — A closed session is not a forming one

**Status:** `done` (fixed) · **Evidence:** 23 Jul 2026

Reviewing 23 July, the tool answered `FORMING` — "wait for price to take one of
them and reject" — on a session that had ended hours earlier. That is worse than
imprecise: it invites hunting the archive for a setup after the fact.

**Applied:** `windowClosed` on `ChartObservation`. Live, a missing phase stays
`pending`; on a closed day it becomes a rejection with the reason named.

---

## 6 — Regime context for reading this week's sample

**Status:** `open` (context, not a rule) · **Evidence:** 23–29 Jul 2026

NAS100 fell roughly **1,160 points** across the week (28,460 → 27,300). Three of
five days opened the 10:00 candle at the window low.

The model looks for mean-reverting liquidity raids. In a sustained one-way trend
where the cash open starts a fresh expansion leg every day, that structure is
mostly absent — and the model correctly declines. The lesson is not that the
model is broken; it is that **this regime produces very few setups**, so a week
like this says almost nothing about the model's edge either way.

**Still outstanding:** no economic calendar was obtained for any of the five
days. A week with this shape plausibly had a tier-one release in it, and
`newsPolicy: stand-aside` would have said so in advance rather than after.

---

## 7 — Four rejections, four different gates

**Status:** `open` (encouraging, unproven) · **Evidence:** 4 of 5 days

The four no-trade days failed on four *different* gates: no raid (23), expansion
(27, 29), and no imbalance (28).

That is mild evidence the gates do independent work rather than one condition
doing all the filtering — which is what `ablate` measures properly:

```bash
bun run src/cli.ts ablate data.csv
```

Five days cannot establish this. Worth revisiting at 50 entries.

---

## 8 — The spec encodes only the reversal half of the playbook

**Status:** `open` · **Evidence:** 29 Jul 2026, plus a Powell clip the user surfaced

The model as encoded is purely mean-reverting: it waits for a raid and trades
*away* from it. It has no mechanism for trading *with* an expansion.

On 29 July the verdict was `INVALID — expansion`, and the reasoning said in as
many words: *"treat this as a warning in the opposite direction rather than a
missed opportunity."* Price then travelled 370 points in exactly that direction.
The warning was correct and actionable, and the spec had no rule that turned it
into a trade.

The user then surfaced a Powell clip suggesting he took a trade on a day the
encoded model declined. That is consistent rather than contradictory **if he was
trading continuation** — which the spec simply does not cover.

**What is confirmed by the clip:** his chart shows fib levels 0.62 / 0.705 /
0.79 — exactly the OTE band in `src/primitives/fib.ts`. First direct sighting of
one of his own levels; it matches.

**What is not established:** the date, the instrument, the direction, or the
entry. The clip's prices top around 27,960 against a 27,870 window high in our
29 July read — roughly a 90-point offset, consistent with NQ futures versus a
US100 cash CFD. The clip also surfaced under a "MMSM" (Market Maker Sell Model)
search, which is a *different* ICT model.

**Candidate:** a continuation variant — enter in the direction of an expansion
that closes through the level, rather than declining the day.

**Do not bolt this onto the spec.** It is a different model with a different
premise, and it needs its own spec, its own backtest and its own journal. Adding
"…unless it's expansion, then trade the other way" to a reversal model is how a
tested edge becomes an untested guess.

**Highest-value next step for the whole project:** the user can reach Powell's
actual content. `docs/08-sources.md` records that every rule here is
reconstructed from secondary material because the source videos were
unreachable. Primary-source material — what he says, not what a chart implies —
is worth more than any further chart reading.

---

## 9 — Three candidate corrections from PO3 source material

**Status:** `open` · **Evidence:** secondary descriptions of the PO3 model,
surfaced while trying to reach a "10am PO3" document the user linked. The
document itself was unreachable (Scribd returns 403), so this is *still*
secondary material — but it is the first that describes the mechanics in enough
detail to contradict the spec.

### 9a — Accumulation may be defined by candle BODIES, not wicks

`extremesOf()` in `model.ts` uses candle highs and lows. Published PO3
descriptions define the accumulation zone by **bodies**, treating wicks as
noise rather than as the boundary.

This is not cosmetic. Concrete impact on days already reviewed:

- The 5m-only day: the window high was the 09:30 candle's *upper wick* at
  ~28,488. Body-defined it is ~28,401 — which would put the 10:00 open
  (~28,475) **above** the window high rather than just below it. The whole read
  changes.
- 23 Jul: the window low was the 09:30 candle's lower wick at 28,495. Body-
  defined it sits materially higher.

**Test:** add a `rangeBasis: "wick" | "body"` option and compare. This is a
one-line change to `extremesOf` and a genuine fork in how every day is read.

**Measured evidence, 30 Jul 2026 — this is now the most consequential open
question in the record.** Both days measured by pixel so far were rejected on
the manipulation gate: the 10:00–10:30 window shut without either side being
raided. Under a body-defined range, *both* become raids:

| | wick range | verdict | body range | verdict |
|---|---|---|---|---|
| 8 Jul | 28,981.5–29,167.3 | highs short by 12.7 | 28,982.2–29,139.4 | **raid by 15.2** |
| 10 Jul | 29,587.4–29,757.7 | highs short by 3.4 | 29,626.3–29,730.9 | **raid by 23.4** |

So the choice of basis is the difference between **zero setups and two** on the
only two days that have been measured rather than eyeballed. That is not a
detail to settle later; it is the largest single lever found so far.

**And it does not follow that bodies are right.** The two days behave very
differently once you look past the raid gate:

- **8 Jul is clean.** The 10:00 candle takes the 29,139.4 body high by 15.2 and
  closes at 29,085.5 — far back inside, and below the 29,139.2 key open in the
  same candle. Direction short, rejection unambiguous, the following three
  candles all close inside.
- **10 Jul is a mess.** The 10:00 candle "clears" the body high by 0.6 points,
  which is one pixel — not a raid, an artefact of where the boundary landed.
  Then 10:05 closes *through* at 29,751.4, which under the model's own rules is
  expansion and a warning the other way. 10:10 closes back inside. A reader
  following the rules literally would be flipped twice in ten minutes.

One clean signal and one whipsaw is not a result. It does say the wick basis is
not obviously the safer default, which is how it has been treated until now.

**Revised test, now that measured data exists:** implement `rangeBasis` and run
the full backtest both ways. Watch the *rejection mix* as much as expectancy — if
bodies mainly convert `manipulation` rejections into losses, the wick basis was
doing useful filtering rather than missing setups. Two 5-minute days measured
off screenshots cannot answer that, and adopting on this evidence would be
exactly the curve fitting these notes exist to prevent.

### 9b — MSS may be required, not optional

`requireMss` defaults to `false`. The descriptions place the entry *after* a
market structure shift — a break of the most recent swing high or low — rather
than after displacement alone.

**Test:** `bun run src/cli.ts backtest data.csv --requireMss true`

### 9c — The management scheme may be specified, not free

`partialAtR` and `breakEvenAtR` are both `null` (off) and marked `tunable`. The
descriptions suggest a concrete scheme: partial at the fib objective, move to
break even there, and close the remainder at the −4σ projection.

That is testable as-is: `--partialAtR`, `--breakEvenAtR`, `--stdDevTarget -4`.

### What is already confirmed

- Stops beyond the manipulation extreme or the prior swing. Matches the spec.
- Targets at 2–4 standard deviations of the manipulation leg. Matches
  `STD_DEV_PROJECTIONS` and the `-2.0` default.

**Caveat that keeps this honest:** these descriptions are of the **4-hour** PO3,
not specifically the 10am variant. Same family, different anchor. Do not promote
any of them from `inferred` to `sourced` on this basis — it would be exactly the
mistake `docs/08-sources.md` exists to prevent.

---

## 10 — The raid threshold has no floor, so a narrow window makes it meaningless

**Status:** `open` · **Evidence:** 14 Jul 2026, plus the arithmetic

`minSweepPenetration` is a *fraction of the accumulation range* — 2% by default.
That scaling is the right idea: it adapts to a quiet morning or a violent one
instead of hard-coding a number of points. But it has no lower bound, and the
arithmetic degrades badly:

| Window width | 2% threshold |
|---|---|
| 330 pts (24 Jul) | 6.6 pts |
| 223 pts (15 Jul) | 4.5 pts |
| **115 pts (14 Jul)** | **2.3 pts** |
| 40 pts (a quiet morning) | 0.8 pts |

At 2.3 points the test stops separating a genuine raid from a tick of noise. On
a 40-point range it separates nothing at all — every wiggle past the level
"clears" it.

14 July did not turn on this (price cleared the level by 117 points), so this is
a weakness spotted by inspection rather than one that cost anything yet. That is
the best time to record it.

`docs/07-invalidations.md` already flags narrow ranges as a soft warning and
suggests raising `minSweepPenetration` by hand on quiet mornings. Nothing in the
code enforces it.

**Candidate:** an absolute floor alongside the percentage — take the *greater* of
`range × minSweepPenetration` and some minimum. Expressing the minimum in ATR
units rather than points would keep it instrument-agnostic, which matters
because the same points figure means different things on NAS100 and ES.

**Test:** implement the floor, then compare across the full range of window
widths. Watch specifically whether it changes anything on wide-window days — it
should not, and if it does the floor is set too high.

---

## 11 — First evidence that `entryCutoff` earns its keep

**Status:** `open` · **Evidence:** 13 Jul 2026 (1 instance)

`entryCutoff` is `12:00` and marked `tunable` — a convention with no published
basis, whose stated purpose is to stop a stale setup filling into the lunch-hour
drift.

13 July is the first day where it would have changed the outcome, and it is a
clean illustration of *why* the rule exists rather than just *that* it does:

```
10:15         raid, rejected. 10:20-10:25 displacement. Setup valid.
11:10         price reaches 29,540 — ABOVE the 29,514 target
              …while the 29,347.5 entry has never been touched
12:16-12:20   entry finally touched — 20 minutes past the cutoff
12:30         price wicks to ~29,260, through the 29,282 stop
```

The move the model was positioned for **happened in full**. The entry was simply
too deep to participate. What eventually reached the entry was not a retracement
into the setup — it was the reversal out of it.

Under the spec: `no-fill`, 0R. As actually taken: −1R.

**Why this is only one data point:** a cutoff that helps once could hurt the next
time by abandoning an order 5 minutes before a good fill. The honest test is
whether expectancy improves across the whole sample, not whether it saved a
particular day:

```bash
bun run src/cli.ts backtest data.csv --entryCutoff 11:30
bun run src/cli.ts backtest data.csv --entryCutoff 12:00
bun run src/cli.ts backtest data.csv --entryCutoff 13:00
```

**Related, and more interesting:** this day suggests the deeper question is not
*when* the order expires but *how deep* the entry sits. A `fvg-proximal` entry
would have filled early and caught the move to 29,540; the `ote-sweet` fallback
sat 140 points below price and never filled. That is the fill-rate/risk trade-off
in `docs/05` playing out for real, and it is what the `entryMode` grid search
measures.

---

## 12 — Eyeballing a chart gets the ranges right and the candle margins wrong

**Status:** `open` · **Evidence:** 10 Jul 2026, measured against the axis read of
the same image

The first review of 10 July read the chart by eye and reported:

```
raid of the highs at 10:05-10:10 to ~29,763,
clearing the 29,758 window high by ~5 pts
```

Measured by pixel from the same screenshot, the highest post-10:00 wick was
**29,754.3** against a window high of **29,757.7**. The push fell **3.4 points
short**. The highs were never taken, there was no raid, and the day is a
rejection rather than the marginal short it was written up as.

What makes this worth recording is the *pattern* of the error, not its size:

| | axis read | measured | error |
|---|---|---|---|
| window high | 29,758 | 29,757.7 | 0.3 |
| window low | 29,585 | 29,587.4 | 2.4 |
| key open | 29,725 | 29,712.6 | **12.4** |
| raid extreme | 29,763 | 29,754.3 | **8.7** |
| displacement extreme | 29,679 | 29,635.4 | **43.6** |

The eye locates the *extremes of the whole formation* well — those are the
easiest things on a chart to see. It fails on everything that requires comparing
one candle to another. And the model consists almost entirely of comparisons
between individual candles: did this wick clear that wick, did this close cross
that open. So the axis read was accurate exactly where it did not matter and
wrong exactly where the verdict lived.

**Consequence, already acted on:** `scripts/chart-measure.ts` measures OHLC from
the image by pixel, calibrated from the axis labels, with a self-check — on a
continuous series each open equals the previous close, so the chaining residual
detects a bad reading instead of letting it through. On this chart the residual
was 0.57 points per candle, which is one pixel, the floor. Journal entries now
carry `source: "pixel"` to distinguish a measured reading from an eyeballed one.

**Still open, and not solved by the tool:** the verdict surface reports gates as
booleans without carrying any error bar. Even measured, a gate can pass by less
than the reading error — here the window high and the 10:10 high are six pixels
apart, which is 3.4 ± 1.2 points. The candidate remains an optional
`priceTolerance` on `ChartObservation`, with any numeric gate whose margin falls
inside the propagated tolerance returning `unknown` rather than `pass` or `fail`.
Measurement narrowed the error from ±10 points to ±0.6; it did not remove it.

**Test:** the tolerance change cannot be validated by backtest, because CSV data
has no reading error — it only ever affects the screenshot path. Apply it
retrospectively to the journal and check it flips only the genuinely thin
readings.

---

## 13 — The raid can arrive one candle after the window shuts, and the day is still a no-trade

**Status:** `open` · **Evidence:** 10 Jul 2026 (1 instance, measured)

`manipulationEnd` is `10:30` and marked `tunable`. 10 July is the first day in
the record where relaxing it can be tested against something rather than
argued about, because the manipulation arrived at **10:30–10:35** — the first
candle outside the window:

```
10:00-10:30   highs missed by 3.4, lows missed by 48.  No raid.
10:30-10:35   low 29,476.0 — 111.4 pts through the 29,587.4 window low
              close 29,634.3 — 46.9 pts back inside.  A clean sweep.
10:35-10:50   best high 29,699.4 — 13.2 pts SHORT of the 29,712.6 key open
```

So the tempting change — widen the window and catch the raid — does not produce a
trade anyway. The displacement never reclaimed the key open, so the day fails the
reclaim gate instead of the manipulation gate. Same answer, different reason.

**Why that is worth more than it looks.** The obvious reading of this day is
"the spec's window is too tight and cost me a setup". Measured, the spec and the
relaxation agree, and the relaxation gains nothing. That is the first piece of
evidence *for* `manipulationEnd` as it stands, and it arrived on the day that
looked like evidence against it.

**Not settled by one day.** A late raid that fails to reclaim proves nothing
about late raids that do. The test is a backtest across `--manipulationEnd 10:30`
/ `10:35` / `10:45`, watching fill rate and expectancy together — a wider window
admits more setups, and the question is whether the marginal ones pay.

**Related:** the key open sat at 73.5% of the window here — upper third, not at
the extreme. Under observation 1 that is neither a confirming nor a
contradicting instance, so 1 stays where it is at 5 for and 1 against.
