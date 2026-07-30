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

A fifth shape is accepted: TradingView's on-screen date spelling,
`Thu 30 Jul '26 07:55`.

**A timestamp with no zone is treated as UTC.** If your export is New York local
time without an offset, every session in it is misaligned by four or five hours
and the model finds nothing at the key open — the single most common way to get
an empty backtest. Pass `--tz America/New_York` and the loader converts it, DST
included. See "When a file has no offset" below.

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
3. **Right-click the chart → "Table view"**, then click **"Download data"** at
   the top left of the table. The export is not a top-level right-click item —
   it lives one level down inside Table view, which is why it looks missing.
   Table view is also useful on its own: it shows OHLC as text you can copy.
4. **The dialog is headed "Time format (UTC)"**, and offers ISO time or UNIX
   timestamp. Both are therefore UTC and both load correctly. Pick **UNIX** —
   nothing can misinterpret it.
5. Extra columns from indicators are harmless. The loader matches columns by
   name, so `SMMA`, `EMA` and a LuxAlgo `Plot` ride along unread.

### When a file has no offset

A stamp like `2026-07-08 09:30:00` carries no zone, and the loader reads it as
UTC — pinned by tests that run under a non-UTC machine timezone, because
`Date.parse` would otherwise resolve it against whatever clock the machine
happens to be on.

UTC is a guess on your behalf, not knowledge. If the file is really New York wall
clock, every session in it sits four or five hours out of place, which is the
single most common way to get an empty backtest from a perfectly good file. Say
so explicitly and the loader will do the conversion, DST included:

```bash
bun run src/cli.ts backtest data.csv --tz America/New_York
```

The table download also writes its dates the way the screen shows them —
`Thu 30 Jul '26 07:55`. That spelling is handled; `Date.parse` rejects the
apostrophe year, so without special handling every row in the file would come
back as an unparseable timestamp. Prices formatted for reading, `27,739.50` with
a Unicode minus in the change column, are handled too.

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

### Free sources — `scripts/fetch-data.ts`

If the TradingView download is not available on your plan, this fetches data
without an account and writes it in the format above:

```bash
# 60 days of 5-minute Nasdaq futures. No key, no signup.
bun run scripts/fetch-data.ts --source yahoo --symbol 'NQ=F' \
  --interval 5m --range 60d --out nq-5m.csv

# Years of 1-minute history, still free.
bun run scripts/fetch-data.ts --source dukascopy --symbol usa100idxusd \
  --from 2024-01-01 --to 2026-07-30 --out us100-1m.csv
```

**Yahoo** caps lookback by interval — 1m gives 7 days, 5m and 15m give 60, 1h
gives 730 — and truncates a longer request without saying so, which the script
warns about. 60 days of 5-minute data is the "first look" band in the table
below: enough to read days and to see whether a rule is directionally sane, not
enough to conclude anything.

**Dukascopy** has years of 1-minute history and needs no account either. The
script shells out to `npx dukascopy-node`, because the raw feed is LZMA-compressed
tick data. This is the option for a real backtest.

Symbols worth knowing:

| Symbol | Source | Notes |
|---|---|---|
| `NQ=F` | yahoo | E-mini front month. What the model is written for, and nearly 24h so the overnight levels work. |
| `usa100idxusd` | dukascopy | Nasdaq-100 CFD — closest to a broker cash CFD. |
| `QQQ` | yahoo | The ETF. RTH only, so no midnight open or NDOG, but 09:30–10:00 and the 10:00 open are inside RTH so the core still reads. |
| `^NDX` | yahoo | The index. RTH only, no volume. |

Prices differ across these — futures carry basis over cash — but the model reads
structure, not absolute level.

After a fetch the script reports how many dates actually have a 10:00 ET candle
and 09:30–10:00 coverage. Read that before running anything: a file covering the
wrong hours looks perfectly healthy and makes `explain` report nothing on every
day.

**The network calls in that script have never been executed.** Every market data
host is blocked by policy from the environment this project is developed in, so
the response parsing is covered by tests against recorded shapes while the fetch
itself is not. If a response shape has drifted, the error will say what to send.

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
