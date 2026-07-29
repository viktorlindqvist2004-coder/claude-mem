---
name: powell-10am
description: Read, explain, or backtest the Powell 10am Key Open trading model (10:00 ET 4-hour candle PO3 — accumulation, liquidity raid, displacement, FVG/OTE entry). Use when the user asks about the 10am key open model, a 10am setup on NQ/ES, PO3/AMD at the New York AM open, or wants a day read, a backtest, a rule explained, or the parameter search run. Also use for the underlying concepts when they come up in this model's context — liquidity sweeps, displacement, MSS, fair value gaps, inverse FVG, OTE 62–79%, standard deviation projections, NDOG/NWOG, midnight open, SMT divergence.
---

# The 10am Key Open model

A working knowledge base and engine for the 10am Key Open model, in
`powell-10am/`. Use it to read days, explain rules, and measure the model —
not to give trading advice or predict markets.

## Before anything else

Read `powell-10am/docs/08-sources.md` and carry its caveat into every answer:
the three source videos **could not be accessed** (the build environment blocks
YouTube), so everything here is reconstructed from secondary sources. Rules are
marked `sourced`, `inferred` or `tunable`. When a user asks "does Powell
actually say X?", the honest answer is usually "this is marked `inferred` —
here is what it is based on", not a confident yes.

Never present backtest numbers from `fixtures/sample-1m.csv` as market results.
It is synthetic and describes its generator.

## The model, compressed

```
09:30–10:00  ACCUMULATION   range builds, stops collect both sides
10:00        KEY OPEN       new 4H candle — the axis
10:00–10:30  MANIPULATION   raid one side, close back inside
                            → direction is now fixed: trade AWAY from the raid
→11:30       DISTRIBUTION   displace back THROUGH the key open, leaving an FVG
→12:00       ENTRY          retrace into the FVG and/or OTE 62–79% of the raid leg
             RISK           stop beyond the raid extreme; target opposing liquidity; ≥2R
16:00        FLAT
```

The two distinctions that matter most, and that users most often have wrong:

- **Sweep vs expansion.** A sweep closes back *inside* the level. Closing
  *through* it is expansion — not a failed setup but a warning in the opposite
  direction. `docs/04-manipulation.md`
- **Retracement fib vs projection fib.** OTE (62/70.5/79%) is for entries;
  standard deviations (−1, −2, −2.5, −4) are for targets. The anchor for both is
  the manipulation leg — raid extreme to displacement extreme — and nothing
  else. `docs/05-entries-fib.md`

## Commands

Run from `powell-10am/`:

```bash
bun run src/cli.ts spec                                 # rules + provenance markers
bun run src/cli.ts explain  <csv> [--date YYYY-MM-DD]   # narrate the model's read
bun run src/cli.ts levels   <csv> --date YYYY-MM-DD     # key levels in force
bun run src/cli.ts backtest <csv> [--cost 0.05]         # statistics
bun run src/cli.ts ablate   <csv>                       # what each rule earns
bun run src/cli.ts learn    <csv> [--folds 4]           # grid search + walk-forward
```

Any config field can be overridden inline: `--entryMode confluence`,
`--targetMode std-dev`, `--minPlannedR 3`, `--requireSmt true`,
`--manipulationEnd 10:15`.

`explain` is the teaching surface — it narrates each phase and, on a day with no
trade, prints which gate failed. Rejected days are usually more instructive than
traded ones.

## Answering questions

**"Why was there no trade on <date>?"** → `explain` with that date. The
`rejectedReason` names the gate. Explain what that gate is for, and link the doc.

**"Is this a valid setup?"** → Walk the six gates in order against what the user
describes. Say which gate fails. Do not soften a failed gate into a maybe.

**"What should the <parameter> be?"** → Check its marker with `spec`. If
`tunable`, say so plainly and show how to measure it (`ablate`, or `backtest`
with an override) rather than asserting a number.

**"Does it work?"** → Nothing here has been run on real data. Point at
`docs/09-data.md` and `docs/10-curriculum.md`. Insist on the distinction between
in-sample and out-of-sample results; the walk-forward `degradation` figure is
the honest one, and under 30 out-of-sample trades the answer is "insufficient
data", not a number.

**"Teach me this."** → `docs/10-curriculum.md` has a seven-stage progression
with exit conditions. Do not skip to the backtest.

## Editing the model

`src/spec.ts` is the single source of truth for behaviour; `docs/` describes it.
If they disagree, the spec wins and the docs are the bug. Every config key needs
a `RULE_NOTES` entry with a confidence marker — a test enforces this, so adding
a parameter without documenting its provenance fails the suite.

Run `bun test` and `bun run typecheck` after any change.

## Scope

This is analysis tooling and educational material. Explain the model, read days,
run measurements, and be straight about what the evidence does and does not
support. Do not give personalised trading advice, size positions, or forecast
where a market is going.
