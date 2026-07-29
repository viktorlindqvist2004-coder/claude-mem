# 02 — Key opens

## The three opens

Powell's framework anchors the day to three New York wall-clock times:

| Time (ET) | Name | What it opens |
|---|---|---|
| 18:00 | Asia open / new day | The futures session re-opens after the 17:00 close |
| 00:00 | Midnight open | The **true day open** in ICT terms |
| 10:00 | NY AM | A new 4-hour candle, and the model's axis |

All three are *opening prices* — single values, not ranges. Their power is
claimed to come from being reference points that a large audience measures
against, which makes them natural places for reactions to cluster.

The engine treats 10:00 as the executable anchor and the other two as context
and target sources (`contextOpens` in `src/spec.ts`).

---

## Why 10:00 specifically

Standard 4-hour candles on an ET-aligned chart open at 02:00, 06:00, **10:00**,
14:00, 18:00 and 22:00. The 10:00 candle is the only one that:

- opens 30 minutes into the New York cash session, once the opening auction's
  first imbalance has resolved;
- covers the highest-participation block of the US day, 10:00–14:00;
- opens *after* the 09:30 cash open has already built a small, extremely
  well-watched range — which is precisely the pool of stops the manipulation leg
  goes after.

That last point is the mechanism. The 09:30–10:00 range is visible to every
opening-range breakout trader alive. By 10:00 there is a dense band of stops
above its high and below its low. The 4-hour candle that opens at 10:00 begins
its PO3 cycle with an obvious, pre-built target sitting on both sides of it.

**This reasoning is reconstructed, not quoted.** See
[08 — Sources](08-sources.md).

---

## The true day open (00:00 ET)

ICT treats midnight New York, not the 18:00 session re-open, as the day's
reference price. The usage is a premium/discount filter:

- Price **above** the midnight open → the day is trading in **premium** → look
  to sell.
- Price **below** it → **discount** → look to buy.

Note this is a *mean-reversion* reading, not momentum. It says "price is
expensive today", not "price is strong today". Newcomers reliably invert it.

In the engine this is `biasSource: "midnight-open"`. It is **off by default**
(`sweep-only`), because a contextual bias that contradicts the raid forces a
choice the public material does not resolve — and guessing at that resolution
and then hard-coding it would be inventing the model rather than encoding it.
Turn it on with `enforceBias: true` and measure whether it helps:

```bash
bun run src/cli.ts backtest data.csv --biasSource midnight-open --enforceBias true
```

---

## The 18:00 open and the opening gaps

The futures session closes at 17:00 ET and re-opens at 18:00. That one-hour
break leaves a gap between Friday's — or yesterday's — close and the new open.

**NDOG — New Day Opening Gap.** Between the 17:00 close and the 18:00 open. ICT
treats these as genuine fair value gaps that act as magnets, frequently filled
within the first hours of the new session.

**NWOG — New Week Opening Gap.** Between Friday's 17:00 close and Sunday's 18:00
open. Carries more weight than an NDOG because it spans a weekend of accumulated
news and positioning.

For both, the **consequent encroachment** — the 50% midpoint — is treated as the
most reactive single price in the gap, which is why the engine emits it as its
own level (`ndog-ce`, `nwog-ce`) with a higher weight than the gap edges.

---

## The full level map

`src/levels.ts` builds this for any date, and refuses to fabricate a level the
data cannot support:

```
Opens          18:00 Asia open · 00:00 midnight open · 10:00 key open
Opening gaps   NDOG high/low/CE · NWOG high/low/CE
Prior day      high · low · close
Sessions       Asia high/low · London high/low · 09:30–10:00 opening range
Weekly         weekly open (Sunday 18:00)
```

Inspect them for any date:

```bash
bun run src/cli.ts levels data.csv --date 2026-03-10
```

### The one rule that keeps this honest

Every level carries the timestamp at which it **became knowable**, and the model
refuses to use a level whose timestamp is at or after the candle being
evaluated. Without that guard, a backtest quietly uses the day's own high as a
level and reports a spectacular, entirely fictional edge. `levelsAsOf()` is the
enforcement point, and it is the reason the level map is built as data with
timestamps rather than as a set of numbers.

---

## What the opens are for

Two distinct jobs, worth separating:

1. **The 10:00 open is a trigger.** It defines the axis the sweep and the
   displacement must sit on opposite sides of.
2. **Every other level is a draw.** They are where price is going, and therefore
   where targets belong. See [06 — Targets and risk](06-targets-risk.md).

Using a draw as a trigger, or a trigger as a draw, produces a model that trades
constantly and targets nothing.

---

## Next

→ **[03 — The 10am model](03-the-10am-model.md)**
