# The 10am Key Open model — overview

## The model in one paragraph

At 10:00 New York time a new 4-hour candle opens. That open price is an axis.
In the half hour that follows, price typically drives through one side of the
range built since the 09:30 cash open, taking the stops resting there — the
**manipulation** leg. It then reverses and displaces back through the 10:00 open
price, leaving a fair value gap behind — the **distribution** leg. The trade is
the retracement into that gap, in the direction *away* from the raid, with the
stop beyond the raid extreme and the target at the next meaningful pool of
liquidity. That is the whole model. Everything else in these documents is either
a definition of one of those words or a way of telling a real instance from a
false one.

## What this project is

Three things, deliberately kept separate so each can be checked against the
others:

| Layer | Where | What it is |
|---|---|---|
| Knowledge | `docs/` | The model in prose, from first principles to execution |
| Rules | `src/spec.ts` | The same model as executable configuration, with provenance on every rule |
| Engine | `src/` | Detection, simulation, backtesting and parameter search |

If the prose and the spec disagree, **the spec is right and the prose is a bug**.
That rule exists because trading documentation drifts into folklore the moment
nothing forces it to stay executable.

## Read in this order

1. **[01 — Foundations](01-foundations.md)** — liquidity, structure, and the
   Power of 3. Nothing about 10am yet, because none of it makes sense first.
2. **[02 — Key opens](02-key-opens.md)** — why 18:00, 00:00 and 10:00, and what
   a 4-hour candle open actually represents.
3. **[03 — The model](03-the-10am-model.md)** — the sequence, step by step.
4. **[04 — Manipulation](04-manipulation.md)** — the hardest part to judge, and
   the one that decides whether you are early or wrong.
5. **[05 — Entries and Fibonacci](05-entries-fib.md)** — FVG, OTE, premium and
   discount, and where they overlap.
6. **[06 — Targets and risk](06-targets-risk.md)** — standard deviations,
   liquidity draws, stop placement, R.
7. **[07 — Invalidations](07-invalidations.md)** — the days to sit out.
8. **[08 — Sources](08-sources.md)** — what is corroborated, what is inferred,
   and what could not be verified. **Read this before trusting any of it.**
9. **[09 — Data](09-data.md)** — getting real candles into the engine.
10. **[10 — Curriculum](10-curriculum.md)** — how to actually learn this, with
    drills and a progression.
11. **[11 — Glossary](11-glossary.md)** — every term, defined once.

## Running it

```bash
bun install
bun run scripts/make-fixture.ts     # generates the synthetic sample dataset

bun run src/cli.ts spec                                   # the encoded rules
bun run src/cli.ts explain  data.csv --date 2026-03-10     # narrate one day
bun run src/cli.ts levels   data.csv --date 2026-03-10     # key levels in force
bun run src/cli.ts backtest data.csv                       # statistics
bun run src/cli.ts ablate   data.csv                       # what each rule earns
bun run src/cli.ts learn    data.csv                       # search + walk-forward
```

`scripts/make-fixture.ts` writes a synthetic dataset to `fixtures/sample-1m.csv`
with a fixed seed, so the commands run out of the box. It describes that
generator, not the market. Point the CLI at a real export before you conclude
anything — see [09 — Data](09-data.md).

## What this project will not do for you

It will not tell you the model is profitable. Nothing here has been run against
real market data, because none was available in the environment it was built in.
The engine is a measuring instrument; the measurement is yours to take. The
`ablate` and `learn` commands exist specifically to let you find out whether the
edge is real, and they are built to make a negative answer visible rather than
easy to hide.
