# 04 — Manipulation

The step that decides whether you are early or simply wrong. Everything else in
the model is mechanical; this is the judgement.

---

## The definition, precisely

A sweep is **not** "price went past a level". A sweep is:

> Price trades beyond a known pool of resting orders, fills them, and is
> rejected — closing back on the original side of the level.

Three components, all required:

| Component | Test | Why it matters |
|---|---|---|
| A known pool | The level must have been visible *before* the raid | Raiding an unknown level fills no stops |
| Penetration | Clears the level by ≥2% of the accumulation range | A one-tick graze fills almost nothing |
| Rejection | Closes back inside the range | Without this it is expansion, not a raid |

The engine enforces all three (`src/primitives/sweep.ts`), including the first —
a pool's timestamp must predate the candle testing it, so the detector cannot
"discover" a level using the very move that broke it.

---

## Sweep versus expansion

This is the distinction the entire model rests on.

```
   SWEEP (tradeable)                    EXPANSION (do not touch)

        ┌─┐                                      ┌─┐
        │ │  ← closes back inside                │ │
   ─────┼─┼──── level ────              ─────────┼─┼──── level ────
        │ │                                      │ │
        └─┘  ← wick through                      │ │  ← closes through
                                                 └─┘
   Orders filled, price rejected.       Orders filled, price kept going.
   The premise holds.                   Whoever faded this is wrong.
```

They look identical for the first thirty seconds. They are opposite trades.

The only reliable separator available in real time is **the close of the candle
that did the sweeping**, which is why `requireCloseBackInside` defaults to true
and why the ablation study is worth running on your own data — it measures
exactly what that rule is worth:

```bash
bun run src/cli.ts ablate data.csv
```

On the bundled synthetic set, removing it costs about 0.3R per trade. On real
data the number will differ; the point is that you can find out.

---

## Which pool was raided?

When one candle takes several levels at once, the engine resolves it by:

1. **Weight** — the most significant pool wins. Raiding equal lows is a
   different event from clipping a minor swing.
2. **Penetration** — on a tie, the deepest sweep wins.

This matters because the pool's identity is recorded on the trade
(`Sweep.source`) and shows up in the log. Over a hundred trades you learn which
pools actually produce the reversal and which are noise — that is one of the
most useful things this project can tell you, and it is only possible because
the raid is attributed rather than merely detected.

---

## The raid extreme is not the sweeping candle's extreme

A subtle and expensive detail. Price often probes a little further after the
sweeping candle closes, before the reversal takes hold. The stop belongs beyond
**the furthest price printed between the sweep and the displacement**, not
beyond the one candle that triggered the detection.

`sweepExtreme()` computes this, and it is why the stop in a real trade sits
slightly wider than a naive reading of the chart suggests.

---

## SMT divergence: the best available filter

Two correlated instruments — classically NQ and ES — should raid the same pools
together. When one makes a lower low and the other refuses to, the raid is not
confirmed by the complex.

```
   NQ:  makes a lower low        ┐
                                 ├─  divergence → the raid is failing
   ES:  holds above its low      ┘
```

This distinguishes *"swept the low and reversing"* from *"swept the low and
going"* better than anything else available in real time, because it uses
information from outside the chart you are trading.

```bash
bun run src/cli.ts backtest nq.csv --correlated es.csv --requireSmt true
```

The engine aligns the two series **by timestamp, not by index**, so a gap in one
feed cannot silently shift the comparison. It is off by default only because it
requires a second dataset.

---

## Timing: why the window is bounded

The manipulation window defaults to 10:00–10:30. A raid at 11:47 is not this
model — it may be a perfectly good trade, but it is not the 10am PO3, and
letting the window drift is how a specific model dissolves into "I trade
reversals".

That said, **30 minutes is a convention, not a published number**. It is marked
`tunable` in the spec for exactly this reason. Test it:

```bash
bun run src/cli.ts backtest data.csv --manipulationEnd 10:15
bun run src/cli.ts backtest data.csv --manipulationEnd 11:00
```

---

## What a good raid looks like

In descending order of quality:

1. **Raids equal highs/lows or the prior day extreme**, closes back inside on
   the same candle, with SMT divergence against the correlated market.
2. **Raids the opening range extreme**, closes back inside within two candles.
3. Raids a minor intraday swing, closes back inside.
4. Grazes a level by a tick and stalls — *not a setup*.
5. Closes through the level — *actively a warning, in the opposite direction*.

Cases 4 and 5 are the ones that feel like setups. They are the reason the rules
are written as hard gates rather than guidelines.

---

## Next

→ **[05 — Entries and Fibonacci](05-entries-fib.md)**
