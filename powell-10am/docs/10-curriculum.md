# 10 — Curriculum

A progression from "I have read the rules" to "I know what this model is worth
on my instrument". Each stage has a concrete exit condition, because the usual
failure is moving to the next stage on enthusiasm rather than competence.

---

## Stage 1 — Vocabulary

**Goal:** the words mean something specific to you.

Read [01 — Foundations](01-foundations.md) and [11 — Glossary](11-glossary.md).

**Drill.** Without looking, write down the difference between:
- a sweep and an expansion
- a CHoCH and an MSS
- a retracement fib and a projection fib
- premium and discount, and what they are measured *against*

**Exit condition:** you can explain why a sweep that closes through the level is
a warning in the *opposite* direction, not merely a failed setup.

---

## Stage 2 — Reading days

**Goal:** recognise the sequence without trading it.

```bash
bun run src/cli.ts explain data.csv --date 2026-03-10
```

Work through 30 days one at a time. For each, before reading the output, write
down your own answers to:

1. Where is the 10:00 open price?
2. What is the 09:30–10:00 range?
3. Which side got raided, if either?
4. Was it a sweep or an expansion?
5. Did price displace back through the open?

Then compare with the engine.

**Exit condition:** you agree with the engine on the raid side and the
sweep/expansion call on 25 of 30 days. Where you disagree, work out which of you
is right — the engine is not an oracle, and a disagreement is sometimes a bug
worth reporting.

---

## Stage 3 — The rejected days

**Goal:** internalise that not trading is the model working.

```bash
bun run src/cli.ts backtest data.csv
```

Look only at the rejection tally. Take the twenty most recent rejected days and
run `explain` on each. For every one, answer: *would I have taken a trade here?*

**Exit condition:** you can look at a day the model declined and feel nothing.
This is the stage most people skip and it is the one that decides whether the
model survives contact with a live account.

---

## Stage 4 — Statistics

**Goal:** know what the numbers can and cannot tell you.

Read [06 — Targets and risk](06-targets-risk.md), then run the backtest on at
least 250 sessions of real data.

**Drill.** Before looking, predict the win rate and expectancy. Then check. Then
answer:
- How many *filled* trades? (Not setups.)
- What is the longest losing streak, and can you sit through it?
- Is average MFE far above average win? (Exiting too early.)
- Is average MAE near 1R? (Stops barely surviving.)

**Exit condition:** you can state the sample size and say out loud whether it is
big enough. If you have fewer than 100 filled trades, the correct conclusion is
"I do not know yet".

---

## Stage 5 — What each rule earns

**Goal:** stop treating the rules as a package.

```bash
bun run src/cli.ts ablate data.csv
```

Every rule gets turned off in turn. Some will be carrying the model; some will
do nothing; some may be costing you.

**Drill.** Before running it, rank the eight rules by how much you think each
contributes. Compare with the output. Where you were badly wrong, work out why.

**Exit condition:** you can name the two rules doing most of the work on your
data, and you have a hypothesis for why.

---

## Stage 6 — Parameters, and the honesty problem

**Goal:** understand why the grid search's best result is mostly a lie.

```bash
bun run src/cli.ts learn data.csv
```

Two blocks of output. The grid search is in-sample and will look excellent. The
walk-forward optimises on one window and tests on the next, and will look
considerably worse. The gap between them — `degradation` — is the amount of the
grid's edge that was curve fit.

**Drill.** Note the grid's best expectancy. Note the pooled out-of-sample
expectancy. The difference is what you would have lost by believing the first
number.

**Exit condition:** you use out-of-sample figures when talking about the model
and treat in-sample ones as hypotheses. Also: if the out-of-sample pool is under
30 trades, you say "insufficient data" rather than quoting it.

---

## Stage 7 — Forward testing

**Goal:** find out whether any of this survives you.

Trade it in a simulator, in real time, for a month minimum. Record every day:
the read, whether you took it, whether the engine agreed, and the result.

The specific thing to measure is not the P&L — it is **the gap between what the
engine did and what you did**. That gap is your actual edge or your actual
problem, and no backtest can show it to you.

**Exit condition:** your decisions match the engine's on 90% of days. Until
then, any live result is measuring your discipline, not the model.

---

## A note on pace

Stages 2 and 3 take weeks, not evenings. The temptation is to run the backtest
on day one, see a positive expectancy, and skip to Stage 7. The engine will let
you. The reason the curriculum is ordered this way is that a model you cannot
read is a model you will abandon on the third consecutive loss — and
[07 — Invalidations](07-invalidations.md) will tell you that a five-loss streak
is entirely normal at this win rate.

---

## Next

→ **[11 — Glossary](11-glossary.md)**
