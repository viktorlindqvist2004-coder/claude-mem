# 09 — Data

## Format

A CSV with a header row. Column order does not matter; several common names are
accepted for each field.

| Field | Accepted names | Required |
|---|---|---|
| Timestamp | `time`, `timestamp`, `date`, `datetime`, `ts`, `open_time` | yes |
| Open | `open`, `o` | yes |
| High | `high`, `h` | yes |
| Low | `low`, `l` | yes |
| Close | `close`, `c`, `last` | yes |
| Volume | `volume`, `v`, `vol` | no |

```csv
time,open,high,low,close,volume
2026-01-06T14:30:00Z,20100.25,20104.50,20098.75,20103.00,1841
2026-01-06T14:31:00Z,20103.00,20106.25,20102.50,20105.75,1502
```

### Timestamps

Four forms are accepted, disambiguated by magnitude:

| Form | Example |
|---|---|
| ISO 8601 with zone | `2026-01-06T14:30:00Z` |
| Epoch seconds | `1767709800` |
| Epoch milliseconds | `1767709800000` |
| Epoch microseconds | `1767709800000000` |

The timestamp marks the candle's **open**.

**A timestamp with no zone is treated as UTC.** If your export is in New York
local time without an offset, every session in it will be misaligned by four or
five hours and the model will find nothing at the key open. Convert it or add
the offset — this is the single most common way to get an empty backtest.

### Resolution

1-minute is the intended input. The model executes on 1–15 minute charts, and
1-minute data lets the engine judge intrabar sequence as carefully as OHLC
allows. Coarser data works but degrades the fill logic: a 5-minute candle that
spans both stop and target is resolved as a loss, and that happens far more
often at 5 minutes than at 1.

### Coverage

The engine needs the **prior session** to build its level map. Load a
contiguous range rather than a set of isolated days, or `prior day high/low`,
NDOG and NWOG will simply be absent — the level builder omits what it cannot
compute rather than guessing.

For the overnight levels (midnight open, Asia range, London range, NDOG) you
need **overnight data**, not just RTH. An RTH-only export produces a working
model with a thinner level map.

---

## Bad rows are reported, not skipped

```
$ bun run src/cli.ts backtest data.csv
⚠ 3 row(s) could not be parsed:
    line 4412: unparseable timestamp: 2026-13-45
    line 8801: non-numeric OHLC value
    line 9002: high (20098) below low (20104)
```

A silently truncated dataset produces a confident and wrong backtest, so the
loader is deliberately loud. Investigate these rather than ignoring them — a
run of unparseable rows usually means a mid-file format change.

---

## Where to get data

The engine is data-source agnostic and needs no network access.

**Futures (NQ, ES) — the instruments this model is written for.** Databento,
CQG, Rithmic, or your broker's historical export. Continuous contracts with
back-adjustment are fine; the model is intraday, so roll artefacts affect only
the days around a roll.

**TradingView.** The chart export gives 1-minute data over a limited lookback
depending on plan. See the step-by-step below.

### Exporting from TradingView, in detail

This is written out because it is the step that has blocked this project
repeatedly, and none of it is discoverable from the mobile app.

1. **Use a computer.** The export lives in the web chart at tradingview.com and
   in the desktop app. **The iOS and Android apps cannot export**, on any plan.
   There is no workaround; a screenshot is the mobile path, and
   `scripts/chart-measure.ts` exists for exactly that reason.
2. **Load the history first.** The export writes out only the bars currently
   loaded in the chart, so scroll left until it stops loading more before you
   export. How far back that goes is a function of timeframe and plan — 1-minute
   history is the shallowest.
3. **Right-click the chart → "Export chart data…"**, or find the same item under
   the chart's `⋯` menu.
4. **In the dialog, pick UNIX timestamps** if offered. This is the one setting
   worth caring about: it is unambiguous, whereas the formatted option writes
   the chart's *local* wall clock with no offset attached. If you must use the
   formatted option, set the chart's timezone to UTC first (bottom-right clock
   → UTC) so what comes out actually means what it says.
5. Extra columns from indicators are harmless — the loader matches columns by
   name and ignores the rest.

A zone-less stamp like `2026-07-08 09:30:00` is read as UTC, and there is a test
pinning that under a non-UTC machine timezone. That is a guess on your behalf,
not knowledge: if the file is really New York wall clock, every session in it is
four or five hours out of place. Prefer UNIX, or an explicit offset.

### Getting the file into a review session

Attach the `.csv` to the conversation the same way you would a screenshot. If the
client refuses the extension, rename it to `.txt` — the loader looks at the
content, not the name — or paste the rows inline. One session of 5-minute candles
is under 200 rows and pastes comfortably; 1-minute is nearer a thousand and is
better attached.

### One day of CSV is barely worth the trip

For reviewing a single day, a screenshot and `chart-measure.ts` land within about
a pixel, which on a 5-minute chart is a fraction of a point. Exporting one day
gains precision that changes no verdict.

What CSV unlocks is the thing screenshots can never do: `backtest`, `ablate` and
`learn` across hundreds of sessions. Several questions in
`journal/OBSERVATIONS.md` — whether the accumulation range should use bodies or
wicks, whether `manipulationEnd` should move, whether the raid threshold needs an
absolute floor — are all stuck waiting on that and cannot be settled one day at a
time. So when you do get to a computer, export **as much history as the plan
gives you in one go**, not the day you happen to be looking at.

**Free sources** generally do not offer 1-minute futures history at usable
depth. This is the real constraint on running this project properly.

### How much

| Trading days | What it supports |
|---|---|
| < 60 | Reading individual days with `explain`. No statistics. |
| 60–120 | A first look. Far too few trades to conclude anything. |
| 250 (~1 year) | Meaningful backtest, marginal for parameter search |
| 500+ (2 years) | Walk-forward with fold sizes worth believing |

The model trades roughly one day in three, and not every setup fills. A year of
data might produce 40–60 filled trades — which is still a small sample. Plan
accordingly and resist the urge to conclude early.

---

## Correlated data for SMT

The SMT filter needs a second instrument, aligned by timestamp:

```bash
bun run src/cli.ts backtest nq-1m.csv --correlated es-1m.csv --requireSmt true
```

Both files need the same period and resolution. The engine aligns by timestamp
rather than by row index, so a gap in one feed will not silently shift the
comparison — but a file covering a different date range will simply produce no
divergences.

---

## The synthetic fixture

`scripts/make-fixture.ts` writes `fixtures/sample-1m.csv` — 120 synthetic
sessions from a fixed seed. It is not committed, because it is deterministic and
3 MB:

```bash
bun run scripts/make-fixture.ts        # 120 sessions
bun run scripts/make-fixture.ts 250    # or as many as you want
```

It exists so the CLI runs out of the box and so the pipeline has something to
chew on. **Every statistic it produces describes the generator, not the
market.**

---

## Next

→ **[10 — Curriculum](10-curriculum.md)**
