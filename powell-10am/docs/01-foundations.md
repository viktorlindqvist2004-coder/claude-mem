# 01 — Foundations

Nothing in this document is specific to 10am. It is the vocabulary the model is
written in. Skipping it and going straight to the setup is the single most
common way people end up trading a pattern they cannot evaluate.

---

## 1. Liquidity: the model's only real subject

A large order cannot be filled at one price. To buy 5,000 contracts you need
5,000 contracts of resting sell interest, and the deepest concentration of
resting sell interest sits **just above obvious highs**, because that is where
two groups have placed orders:

- Traders who are short, whose protective stops are buy orders.
- Traders waiting for a breakout, whose entry orders are also buy orders.

Both groups are, mechanically, providing the fuel for someone larger to get
filled. The mirror is true below obvious lows.

This is why the model does not ask "is the market going up?" It asks **"where
are the orders, and have they been taken yet?"** Direction is a consequence of
that question, never an input to it.

### The pools, ranked

Not all obvious levels hold the same weight. In rough order:

| Pool | Why it holds orders | Weight |
|---|---|---|
| Equal highs / equal lows | Two touches at the same price advertise the level to everyone | ★★★★★ |
| Prior day high / low | The most-watched reference on any intraday chart | ★★★★★ |
| Opening range high / low (09:30–10:00) | Every opening-range breakout system keys off these | ★★★★★ |
| Session extremes (Asia, London) | Overnight ranges frame the day for a large audience | ★★★★ |
| Intraday swing highs / lows | Real but shallow — fewer participants see them | ★★ |

The engine encodes this ranking in `src/primitives/liquidity.ts` as a `weight`
field, and `minPoolWeight` in the spec lets you demand raids on significant
pools only.

### Liquidity is *taken*, not *touched*

Price reaching a level does nothing. Price **trading through it and reversing**
means the orders resting there were filled and are now gone. That distinction is
the entire subject of [04 — Manipulation](04-manipulation.md), and getting it
wrong is the most expensive error in the model.

---

## 2. Market structure: BOS, CHoCH, MSS

Three terms that are constantly conflated and mean genuinely different things.

**Swing points.** A swing high is a candle whose high exceeds its neighbours on
both sides. Note the consequence: *a swing point is only knowable some candles
after it printed*. The engine enforces this (`confirmedAt` in
`src/primitives/swing.ts`) because a backtest that uses swings the moment they
form is reading the future and will show an edge that does not exist.

**BOS — Break of Structure.** Price breaks a swing *in the direction it was
already going*. Continuation. Tells you the existing leg is intact.

**CHoCH — Change of Character.** Price breaks the first swing *against* the
prevailing direction. A warning. On its own it is weak: ranges produce CHoCHs
constantly.

**MSS — Market Structure Shift.** A CHoCH that is carried by **displacement** —
a fast, bodied move that covers ground in one or two candles and leaves a fair
value gap behind. This is the one that matters. The difference between a CHoCH
and an MSS is the difference between "price wandered back over a level" and
"something with size just moved this market".

The 10am model's confirmation is an MSS, not a CHoCH. `requireMss` in the spec
makes this a hard condition; by default the model requires displacement plus a
key-open reclaim, which is nearly the same test expressed differently.

---

## 3. Fair value gaps

Three candles. If candle 3's low sits above candle 1's high, the band between
them was never traded through in both directions — price moved too fast for
two-sided trade to occur. That band is a **fair value gap**, and the premise is
that price tends to return to it before continuing.

```
        │                         candle 3 low  ─┐
        │  ┌─┐                                   │  ← the gap
        │  │ │  candle 2 (displacement)          │
     ┌─┐│  │ │                 candle 1 high  ───┘
     │ ││  └─┘
     └─┘└
```

Three prices matter on every gap:

- **Proximal** — the edge price meets first on the way back. Fills most often.
- **CE (consequent encroachment)** — the 50% midpoint. Frequently the actual
  reaction point.
- **Distal** — the far edge. Best price, least likely to fill.

**Inversion.** When price closes decisively *through* a gap rather than
respecting it, the gap flips polarity: a bullish gap that fails becomes
resistance. This is an **inverse FVG**, and it is the model's fallback entry
when the displacement leg leaves no fresh imbalance.

Implementation: `src/primitives/fvg.ts`.

---

## 4. Power of 3 — accumulation, manipulation, distribution

Every timeframe's candle, ICT argues, is built the same way:

1. **Accumulation** — price ranges. Positions are built. Stops pile up on both
   sides of the range.
2. **Manipulation** — price drives through one side, filling those stops. This
   is the leg that makes the candle's high or low.
3. **Distribution** — price reverses and expands the other way. This is the leg
   that makes the candle's close.

Read on a bullish candle: open and low are made during accumulation and
manipulation, and the close is made during distribution. The candle's *shape*
encodes the story — a long lower wick is a manipulation leg you are looking at
after the fact.

The 10am model is simply **PO3 applied to the 4-hour candle that opens at 10:00
ET**, executed on a 1–15 minute chart. That is the entire conceptual content of
the model, and the rest is precision about each phase.

---

## 5. Premium, discount, and the dealing range

Take any leg of price. Its midpoint is **equilibrium**. Above it is **premium**;
below it is **discount**.

The discipline: **buy in discount, sell in premium** — relative to the range you
are dealing in. Not relative to the day, not relative to your feelings about the
trend. Which range you anchor to is the whole question, and picking the wrong
anchor produces confident nonsense.

For this model the anchor is fixed and non-negotiable: **the manipulation leg**,
from the raid extreme to the extreme of the displacement that reclaimed the key
open. See [05 — Entries and Fibonacci](05-entries-fib.md).

---

## 6. Why time is a variable at all

Volume and volatility in index futures are not evenly distributed. They cluster
around session opens, scheduled data, and the boundaries where large
participants rebalance. A model that ignores time treats 03:00 and 10:00 as the
same event; they are not remotely the same event.

The specific claim behind this model is narrower: **certain wall-clock times
open new higher-timeframe candles, and those candles run their own PO3 cycle.**
10:00 ET opens a 4-hour candle. That is the claim [02 — Key opens](02-key-opens.md)
takes apart.

---

## Next

→ **[02 — Key opens](02-key-opens.md)**
