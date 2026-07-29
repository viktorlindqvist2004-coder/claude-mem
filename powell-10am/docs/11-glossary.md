# 11 — Glossary

Every term used in this project, defined once. Where a term maps to code, the
file is named.

---

**Accumulation** — The first phase of Power of 3. Price ranges, positions are
built, stops collect on both sides. In this model, 09:30–10:00 ET.

**AMD** — Accumulation, Manipulation, Distribution. Another name for Power of 3.

**ATR — Average True Range** — Mean candle range over a lookback, used here to
express "energetic" as a testable multiple rather than a feeling.
`src/primitives/atr.ts`

**Bias** — The direction the model will trade. In this model it is *derived from
the raid*, never chosen in advance. Sweep the lows → long.

**BOS — Break of Structure** — A swing broken in the direction of the prevailing
leg. Continuation. Weaker than an MSS. `src/primitives/structure.ts`

**CE — Consequent Encroachment** — The 50% midpoint of a gap. Often the most
reactive single price in it, and emitted as its own level for NDOG and NWOG.

**CHoCH — Change of Character** — The first counter-trend swing broken. A
warning, not a signal. Becomes an MSS only when carried by displacement.

**Dealing range** — The leg fibs are anchored to. In this model, fixed: from the
raid extreme to the extreme of the displacement that reclaimed the key open.
`Po3Read.dealingRange`

**Discount** — Below the equilibrium of the dealing range. Where longs belong.

**Displacement** — A fast, bodied move that covers ground quickly and leaves a
fair value gap. The model's confirmation.
`src/primitives/displacement.ts`

**Distribution** — The third phase of Power of 3. The directional expansion that
follows manipulation, and the leg the model trades.

**Distal** — The far edge of a fair value gap. Best price, least likely to fill.

**Equilibrium** — The 50% midpoint of a range. Premium above, discount below.

**Expansion** — Price trading through a level *and closing through it*. The
opposite of a sweep, and the one condition this model must never be traded
into.

**FVG — Fair Value Gap** — A three-candle imbalance where candle 1 and candle 3
do not overlap. Price tends to return to it. `src/primitives/fvg.ts`

**iFVG — Inverse Fair Value Gap** — A gap price has closed through, which then
acts with opposite polarity. The model's fallback entry.

**Key open** — One of the three anchoring opens: 18:00, 00:00, 10:00 ET. Used
bare, it means the 10:00 open.

**Liquidity** — Resting orders. Concentrated just beyond obvious highs and lows,
because that is where stops and breakout entries sit.
`src/primitives/liquidity.ts`

**Liquidity pool** — A specific price holding resting orders: equal highs, prior
day low, opening range high, and so on. Ranked by weight in this project.

**Manipulation** — The second phase of Power of 3. The raid that takes one
side's stops. → [04](04-manipulation.md)

**MAE — Maximum Adverse Excursion** — How far a trade ran against you before
resolving. Near 1R on average means stops are barely surviving.

**MFE — Maximum Favourable Excursion** — How far a trade ran in your favour.
Well above your average win means you are exiting too early.

**Midnight open** — 00:00 ET. The **true day open**. Price above it reads as
premium for the day, below as discount.

**MSS — Market Structure Shift** — A CHoCH carried by displacement. The strong
form of a structure break, and the one this model wants.

**NDOG — New Day Opening Gap** — The gap between the 17:00 ET close and the
18:00 re-open. Treated as a genuine FVG and a magnet.

**NWOG — New Week Opening Gap** — The gap between Friday's 17:00 close and
Sunday's 18:00 open. Heavier than an NDOG.

**No-fill** — A valid setup whose entry price was never reached before the
cutoff. Counted separately, because a configuration with wonderful expectancy
over eight fills out of forty setups is not what it appears to be.

**OTE — Optimal Trade Entry** — The 62%–79% retracement band of the dealing
range, with 70.5% singled out as the sweet spot. Structurally, always in
discount for a long and premium for a short. `src/primitives/fib.ts`

**PO3 — Power of 3** — Accumulation → Manipulation → Distribution. The frame the
entire model is an instance of.

**Premium** — Above the equilibrium of the dealing range. Where shorts belong.

**Proximal** — The near edge of a fair value gap; the first price met on a
retracement. Fills most often, risks most.

**R** — One unit of initial risk. All results in this project are in R, never
currency, so they are comparable across instruments and position sizes.

**Raid** — Synonym for sweep, emphasising intent.

**Raid extreme** — The furthest price printed during the manipulation leg —
across the whole leg, not just the sweeping candle. The stop goes beyond it.

**RTH — Regular Trading Hours** — The cash session, 09:30–16:00 ET.

**SMT — Smart Money Technique / divergence** — Two correlated instruments
disagreeing at a raid: one makes a new extreme, the other does not. The model's
strongest optional filter. `src/primitives/smt.ts`

**Standard deviation projection** — Fibonacci *projections* beyond the dealing
range, used as targets: −1, −2, −2.5, −4 and the shallower −0.27 and −0.62.

**Sweep** — Price trading beyond a pool, filling the orders there, **and being
rejected**. All three parts are required. → [04](04-manipulation.md)

**Swing high / low** — A candle whose extreme exceeds its neighbours on both
sides. Only knowable some candles after it prints — which is why the engine
tracks confirmation indexes. `src/primitives/swing.ts`

**True day open** — See *midnight open*.

**Walk-forward** — Optimising on one window and testing on the next, with
parameters frozen. The only parameter search result in this project worth
believing. `src/learn.ts`

---

← **[00 — Overview](00-overview.md)**
