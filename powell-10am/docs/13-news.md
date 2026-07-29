# 13 — News

## Why this exists

10:00 ET is not only the key open. It is also one of the busiest US release
slots on the calendar — ISM, JOLTS, consumer confidence and revised UMich all
land exactly on it. So the model's central question, *was that a liquidity raid
or is the market genuinely repricing?*, is hardest to answer at precisely the
moment the model is asking it.

[07 — Invalidations](07-invalidations.md) originally listed this as an
unsolved limitation. This layer is the attempt to solve it.

---

## The philosophy, stated plainly

**News does not supply direction, and it never inverts the model.**

The framing this sits inside treats a high-impact release as the *delivery
mechanism* for the manipulation leg. A raid needs a reason for price to move
violently through a level; the release is that reason. So a clean 10am sequence
that happens to be delivered by an ISM print is still a clean 10am sequence.

What changes is **how much you can trust the rejection test, and when you should
not be in the market at all**:

| Situation | What it changes |
|---|---|
| High-impact release **on** the raid window | The rejection test is unreliable inside the release candle — the first minute prints both sides before settling |
| Tier-one release (FOMC, CPI, NFP, Fed chair) on the window | The premise is *replaced*, not fuelled. The market is discovering a price, not filling orders |
| High-impact release **before** 09:30 | The accumulation range is inflated; wider raid extreme, wider stop, fewer setups clear 2R |
| High-impact release **during** the holding period | The target may never be reached; the outcome gets decided by the release |
| Holiday | Thin book — the levels this model raids only matter if enough people are watching them |

> **Provenance.** This layer is an addition. No reachable description of
> Powell's own material covers news handling, so nothing here is attributed to
> him. The rules are marked `inferred` and `tunable` in `src/spec.ts` and the
> reasoning above is the ICT treatment of releases, not a quoted teaching.
> See [08 — Sources](08-sources.md).

---

## Getting the calendar in

Three paths, in order of exactness.

### 1. The JSON feed — exact

ForexFactory publishes a weekly JSON feed. Save it and pass it:

```bash
curl -s https://nfs.faireconomy.media/ff_calendar_thisweek.json > week.json
bun run src/cli.ts news --calendar week.json --date 2026-03-10
```

Or let the CLI fetch it directly:

```bash
bun run src/cli.ts news --fetch
```

Impact levels come from the source rather than being inferred, and the
Actual/Forecast/Previous columns are unambiguous. **This path needs outbound
network access**, which many sandboxes deny — including the one this project was
built in. When it fails the error says so rather than silently reporting a quiet
calendar.

### 2. Pasted text — convenient

Copy the day's rows from [forexfactory.com/calendar](https://www.forexfactory.com/)
into a file:

```
Tue Mar 10
8:30am  USD  Core CPI m/m              0.4%   0.2%   0.2%
10:00am USD  ISM Manufacturing PMI     52.1   48.3   48.4
2:00pm  USD  FOMC Statement
```

```bash
bun run src/cli.ts news --paste calendar.txt
```

Two things do not survive a copy-paste, and both are handled explicitly:

- **Impact colour.** Recovered from the title against a list of releases that
  move index futures. The row is flagged `impact inferred` and the verdict says
  when it is relying on that guess. Override it inline if you prefer:
  `10:00am USD high Some Obscure Release`, or with `!!!` / `!!` markers.
- **Column boundaries.** Trailing values are split positionally: three values
  read as actual/forecast/previous, two as forecast/previous, since
  ForexFactory leaves Actual blank until a release happens. Right for the common
  cases, wrong for an event reporting an actual with no forecast.

### 3. A screenshot

Send a screenshot of the calendar alongside the chart. It gets read into the
same structure as the pasted path, with the same caveats.

---

## What it produces

```bash
$ bun run src/cli.ts news --paste calendar.txt

── Calendar · blackout ──────────────────────────────

  08:30   USD  Core CPI m/m                pre-open
          actual 0.4%   forecast 0.2%   previous 0.2%
  10:00   USD  ISM Manufacturing PMI       at-key-open
          actual 52.1   forecast 48.3   previous 48.4
  14:00   USD  FOMC Statement              holding

  What it means for the 10am model
    ⚠ High-impact news lands on the raid window…
    ⚠ Do not judge the sweep until the release candle and the one after it
      have closed…
    · The 09:30–10:00 range was built after 08:30 Core CPI m/m. Expect it
      wider than usual…
    ⚠ 14:00 FOMC Statement lands while a position would still be open…
```

Every event is placed in a **phase** — `pre-open`, `opening-range`,
`at-key-open`, `manipulation`, `distribution`, `holding`, `outside` — and the
day gets a **regime**:

| Regime | Meaning |
|---|---|
| `clear` | Nothing high-impact touches the model's windows |
| `elevated` | News shaped the range, or threatens an open position later |
| `blackout` | High-impact news lands on the raid window itself |

Only releases in the instrument's own currency count. A German CPI print does
not move NQ enough to matter, and treating it as if it did would fill the output
with noise. Change it with `--newsCurrencies USD,EUR` if you trade something
else.

---

## Policy

`newsPolicy` decides what a blackout actually does:

| Policy | Behaviour |
|---|---|
| `ignore` | The calendar is not consulted at all. The news gate disappears. |
| `caution` *(default)* | Advisories are raised; a structurally valid setup stays valid, with the qualifier in the headline. |
| `stand-aside` | A **tier-one** release (FOMC, CPI, NFP, Fed chair speaking) on the raid window makes the day a no-trade. |

```bash
bun run src/cli.ts verdict today.json --paste calendar.txt --newsPolicy stand-aside
```

Tier-one is separated from merely high-impact deliberately. An ISM print
delivering a raid is the model working as intended. An FOMC statement is the
market repricing, and a "liquidity sweep" during it is a category error — you
are reading order-filling behaviour into a move that has nothing to do with
order filling.

**Decide your policy before the session**, not while looking at a setup you want
to take.

---

## What it does to a verdict

An unchecked calendar **qualifies** the answer rather than blocking it:

```
  ✓ VALID
  Valid long. Work a limit at 20094.00 … — 3.00R. Calendar not checked —
  confirm before acting.
```

The structural read is complete either way, so downgrading every chart-only
verdict to `UNCERTAIN` would make the common case useless. But the caveat is
always there, and the calendar is always in the `missing` list.

When a calendar *is* supplied and the raid window is a news window, the headline
carries it:

```
  ✓ VALID
  Valid long. Work a limit at 20094.00 … — 3.00R. Structurally valid, but it
  is a news-driven raid — size accordingly and wait for the release candle to
  close before acting.
```

And under `stand-aside` with a tier-one event, the day simply closes:

```
  ✗ INVALID
  No trade.
  Why
    Calendar clear enough to trade failed: blackout: 10:00 FOMC Statement.
    FOMC Statement is a repricing event, not a liquidity event…
```

---

## What this layer will not do

- **It will not trade the number.** A beat or a miss is noted, never acted on.
  The advisory says a deviation *powers* the move through the level and does not
  tell you which way the day resolves — the model still waits for the rejection.
- **It will not quantify a surprise.** Units differ across releases and a
  generic "surprise magnitude" would be false precision.
- **It will not tell you the news is priced in.** Nobody knows that.

---

← **[00 — Overview](00-overview.md)** · **[12 — Reading a screenshot](12-chart-reading.md)**
