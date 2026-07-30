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
