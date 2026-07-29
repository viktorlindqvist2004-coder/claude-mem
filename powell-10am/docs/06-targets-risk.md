# 06 — Targets and risk

## The stop

Beyond the **raid extreme**, plus a buffer.

That is the whole rule, and its logic is that the raid extreme *is* the premise.
The trade says "that low was a liquidity grab, not a real low". If price trades
back beyond it, the statement is false and there is nothing left to be in the
trade for.

Three things the stop is **not**:

- Not beyond the entry candle. That is an arbitrary price with no relationship
  to the idea.
- Not a fixed number of points. That makes risk a function of your account
  rather than of the market.
- Not moved wider. Widening a stop is not risk management; it is abandoning the
  model while remaining in the position.

The buffer defaults to 0.25× ATR so the stop does not sit on the exact tick
everyone else's does. Marked `tunable` — test it.

**The extreme is measured across the whole manipulation leg**, not just the
sweeping candle, because price often probes further before reversing. See
[04 — Manipulation](04-manipulation.md).

---

## The target

Targets go where the orders are. Never at round numbers, never at a fixed R
because it feels comfortable.

### Mode 1 — Opposing liquidity *(default)*

The next pool on the far side of the trade. Swept the lows and going long? The
draw is the liquidity resting above: the opening range high, equal highs, the
prior day high.

This is the most defensible mode conceptually — it targets a real reason for
price to travel — and it has an awkward practical consequence worth
understanding: **the nearest pool is often too close to clear the 2R floor**, so
the day is declined. That is not a bug. It is the filter working. A raid deep
into the range with the opposite side sitting just overhead is a genuinely poor
setup.

`strongest-liquidity` is the variant that prefers the *most significant* pool
over the nearest one, accepting a further target for a better reason.

### Mode 2 — Standard deviation projections

Project the manipulation leg beyond itself. The ICT set:

| Projection | Meaning |
|---|---|
| −0.27, −0.62 | Shallow — partials |
| **−1.0** | One full leg beyond the displacement extreme |
| −1.5, **−2.0** | The common working objectives |
| −2.5, −4.0 | Expansion days |

```
                                             ┌── -2.0σ  ← target
                                             │
                                    ┌── 1.0 ─┤ (displacement extreme)
                                   ╱         │
                     ─────────────╱──────────┘
                                 ╱
              0.0 ──────────────┘  (raid extreme)
```

Mechanically clean, always available, and independent of whether a pool happens
to sit nearby. Use `projectionBeyond()` to pick the first projection that
actually clears your minimum R rather than the nearest one.

### Mode 3 — Key level

The nearest standing level on the far side — midnight open, NDOG CE, prior day
high. Useful when a major level sits between price and the liquidity pool,
because that level will be defended.

### Mode 4 — Fixed R

A flat multiple. Included as a **baseline to beat**, not a recommendation. If
your structural targeting cannot outperform a flat 2R, the structure is not
doing any work and you should know that.

---

## The 2R floor

`minPlannedR: 2` — setups planning less than 2:1 are declined.

This filter does far more than it appears to. It removes the days where the raid
was deep, the entry is poor, and the next draw is close — which are
systematically the low-quality instances. On the bundled synthetic data,
removing it nearly triples trade count and *raises* raw expectancy, which is
exactly the kind of result that needs interrogating rather than adopting: more
trades at lower quality can flatter a small sample while being worse in
practice.

Run the ablation on your own data:

```bash
bun run src/cli.ts ablate data.csv
```

---

## Trade management

Both off by default, both measurable:

**Partials** (`partialAtR`). Bank half at a given R. Raises hit rate, lowers
expectancy per trade. Whether that is worth it is a question about your
psychology as much as your statistics — but measure it before assuming.

**Break-even stops** (`breakEvenAtR`). Move the stop to entry once a given R is
reached. Converts losers into scratches — and, reliably, a number of eventual
winners into scratches too. Test it; the result is frequently unwelcome.

---

## Reading the statistics honestly

```
$ bun run src/cli.ts backtest data.csv

  Trading days        120
  Setups              38  (31.7% of days)
  Filled              8   no-fill 30
  Win rate            37.5%  (3W / 5L / 0S)
  Expectancy          +0.13R per trade
  Max drawdown        5.25R
  Longest losing run  5
  MFE / MAE (avg)     1.51R / 1.03R
```

What to look at, in order:

1. **Fills, not setups.** Eight trades tells you nothing. You need 100+ before
   any of these numbers mean anything at all.
2. **The no-fill count.** 30 of 38 setups never filled — the entry is too deep
   for this configuration and instrument.
3. **Expectancy, not win rate.** A 37% win rate at +2R average is a good
   business. An 80% win rate at −0.3R expectancy is not.
4. **Max drawdown and losing streak.** These are what you actually have to sit
   through. Five consecutive losses is normal for a 37% model and will not feel
   normal.
5. **MFE vs MAE.** Average MFE well above your average win means you are exiting
   too early. Average MAE near 1R means your stops are barely surviving.

### Costs are not optional

The backtester deducts a fixed cost per filled trade, defaulting to **0.05R**.
Ignoring commission and slippage is the standard way a marginal model is made to
look viable. Set it to your real cost:

```bash
bun run src/cli.ts backtest data.csv --cost 0.08
```

At 0.05R per trade and a 2R average win, costs eat roughly 2.5% of gross. At
0.2R — plausible for a small account trading a wide-spread instrument — they eat
10%, and a marginal edge disappears entirely.

---

## Next

→ **[07 — Invalidations](07-invalidations.md)**
