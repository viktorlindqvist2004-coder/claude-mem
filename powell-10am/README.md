# powell-10am

A learning system for the **10am Key Open** trading model: the strategy encoded
as executable rules, a detection engine, a backtester, and a parameter search
that is built to expose curve fitting rather than hide it.

> **Read [`docs/08-sources.md`](docs/08-sources.md) first.** The three YouTube
> videos that were meant to be the primary source could not be accessed — the
> build environment's network policy blocks YouTube. Everything here is
> reconstructed from secondary sources, and every rule is marked `sourced`,
> `inferred` or `tunable` so you can see which is which.

---

## The model in one paragraph

At 10:00 New York time a new 4-hour candle opens. In the half hour that follows,
price typically raids one side of the range built since the 09:30 cash open,
taking the stops resting there. It then reverses and displaces back through the
10:00 open price, leaving a fair value gap behind. The trade is the retracement
into that gap, in the direction *away* from the raid, with the stop beyond the
raid extreme and the target at the next meaningful pool of liquidity.

---

## Quick start

```bash
bun install
bun run scripts/make-fixture.ts        # generates fixtures/sample-1m.csv (synthetic)

bun run src/cli.ts spec                                    # the encoded rules
bun run src/cli.ts explain  fixtures/sample-1m.csv --date 2026-03-10
bun run src/cli.ts levels   fixtures/sample-1m.csv --date 2026-03-10
bun run src/cli.ts backtest fixtures/sample-1m.csv
bun run src/cli.ts ablate   fixtures/sample-1m.csv          # what each rule earns
bun run src/cli.ts learn    fixtures/sample-1m.csv          # search + walk-forward

bun run src/cli.ts verdict  --template > today.json         # judge a chart reading
bun run src/cli.ts verdict  today.json
```

That fixture is **synthetic** — it is generated with a fixed seed so the CLI
runs out of the box, and it describes the generator rather than any market.
Point the CLI at real 1-minute data before concluding anything — see
[`docs/09-data.md`](docs/09-data.md).

```bash
bun test          # 93 tests
bun run typecheck
```

---

## Layout

```
docs/            The model in prose, foundations → execution → curriculum
src/spec.ts      The same model as executable config, with provenance per rule
src/model.ts     The detector: accumulation → raid → displacement → entry → risk
src/verdict.ts   Judges a chart reading through the same gates, for screenshots
src/primitives/  fvg · swing · sweep · displacement · structure · liquidity · fib · smt · atr
src/levels.ts    Key opens, NDOG/NWOG, prior day, session ranges
src/trade.ts     Fill and exit simulation
src/backtest.ts  Statistics, with costs and rejection accounting
src/learn.ts     Grid search, walk-forward validation, rule ablation
skills/          Claude Code skills: model Q&A, and judging chart screenshots
```

**If `docs/` and `src/spec.ts` disagree, the spec is right and the docs are the
bug.** That rule exists because trading documentation drifts into folklore the
moment nothing forces it to stay executable.

---

## Documentation

| | |
|---|---|
| [00 — Overview](docs/00-overview.md) | What this is and how to read it |
| [01 — Foundations](docs/01-foundations.md) | Liquidity, structure, PO3, premium/discount |
| [02 — Key opens](docs/02-key-opens.md) | 18:00, 00:00, 10:00, NDOG, NWOG |
| [03 — The model](docs/03-the-10am-model.md) | The sequence, step by step |
| [04 — Manipulation](docs/04-manipulation.md) | Sweep vs expansion — the judgement call |
| [05 — Entries and Fibonacci](docs/05-entries-fib.md) | FVG, OTE, confluence |
| [06 — Targets and risk](docs/06-targets-risk.md) | Projections, stops, reading statistics |
| [07 — Invalidations](docs/07-invalidations.md) | The days to sit out |
| [08 — Sources](docs/08-sources.md) | **Provenance — read this** |
| [09 — Data](docs/09-data.md) | CSV format and where to get candles |
| [10 — Curriculum](docs/10-curriculum.md) | How to actually learn it |
| [11 — Glossary](docs/11-glossary.md) | Every term, defined once |
| [12 — Reading a screenshot](docs/12-chart-reading.md) | Judging a TradingView chart against the model |

---

## Design decisions that affect whether the numbers are true

Backtests are easy to flatter. These are the choices made against that:

- **Intrabar ambiguity resolves as a loss.** When one candle contains both stop
  and target, OHLC cannot say which came first. Assuming the target would
  flatter every result this project will ever produce.
- **Orders arm only after the signal candle closes.** No entry can be filled on
  the bar that created it.
- **Swings are used only after confirmation.** A fractal is not knowable until
  `strength` candles later, and using it earlier is reading the future.
- **Levels carry a timestamp** and cannot be used before they formed. Without
  this a backtest quietly uses the day's own high as a level.
- **Costs are deducted by default** (0.05R per filled trade), not opt-in.
- **No-fills are counted separately.** Great expectancy over eight fills out of
  forty setups is not what it appears to be.
- **The search objective shrinks thin samples toward zero**, so a 3-trade fluke
  cannot win a parameter search.
- **Walk-forward reports degradation** — in-sample minus out-of-sample — and
  warns explicitly when the out-of-sample pool is under 30 trades.

None of this makes the model good. It makes the measurement honest, which is a
precondition for finding out.

---

## Status

The engine is complete and tested. **No results are claimed** — nothing here has
been run against real market data. Whether the model has an edge on your
instrument is an open question this project is built to help you answer, and it
may answer it negatively.
