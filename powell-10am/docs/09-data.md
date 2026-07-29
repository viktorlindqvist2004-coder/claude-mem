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
depending on plan. Export in UTC if the option exists.

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
