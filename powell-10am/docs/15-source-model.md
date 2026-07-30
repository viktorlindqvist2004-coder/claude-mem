# 15 — The model, from the source

**30 July 2026: primary source material finally arrived** — a field guide built
from official `.srt` transcripts of eight teaching sessions, cross-matched
frame-by-frame to the charts they were spoken over.

Every rule below is `sourced`. That word has not been usable anywhere in this
project until now.

It also shows that the engine in `src/` **is not this model**. The gap is not a
parameter or two. Read this document before touching anything else.

---

## The headline: the clock is wrong

The engine encodes an opening-range PO3 on a thirty-minute window:

```
ENGINE      09:30–10:00  accumulation
            10:00–10:30  manipulation
            →11:30       displacement back through the 10:00 open
```

The source describes a completely different cycle:

```
SOURCE      18:00–00:00  ACCUMULATION   futures reopen, tight range builds
            00:00–10:00  MANIPULATION   Asia, London, NY pre-market — the sweep
            10:00→       DISTRIBUTION   "the true day open"
```

> "The key opens that I like to use is the 1800 opening, the midnight open, and
> the 10am hourly candle open."

Three reference lines, not one anchor. **10:00 is where distribution begins —
not where manipulation happens.** The engine spends its entire manipulation
window inside the source's distribution phase, hunting for a sweep in the half
hour where the source expects the move to already be underway.

This single error explains the measured behaviour. On 50 real sessions the raid
gate only started passing once prior-day, London and Asia levels were added as
pools — and those are exactly the levels the source says get swept, during
00:00–10:00, which the engine never looks at.

**A key open is not a trade.** The source is explicit twice over:

> "Everything we use with these levels has to be in context first of all."
>
> "In this scenario you wouldn't enter on the line — you would enter on the
> closest PD array."

The line says *where to look*. The entry is the nearest reactive zone to it.

---

## The five-step checklist

Captured from the on-screen checklist used at the start of every session, in
order. **Order matters — it is a funnel, not a shopping list.** Steps 1–4 say
where to expect the trigger; step 5 *is* the trigger.

| # | Step | What it establishes |
|---|---|---|
| 1 | **Daily PxH / PxL** | Prior period high and low — the two largest magnets, checked first |
| 2 | **Key opens** | 18:00, 00:00, 10:00 ET as rays. Premium/discount reference |
| 3 | **EQH / EQL, without SMT** | Equal highs/lows *confirmed by the correlated pair*. SMT at the pool **downgrades** it |
| 4 | **MMXM** | Which market maker model is running — buy or sell |
| 5 | **4H and 1H CISD** | The confirmation, and the actual trigger |

Step 3 inverts what this project assumed. SMT divergence *at the pool you are
targeting* makes it worse, not better:

> "equal highs, equal lows, without SMT — because if there's equal lows but
> there's SMT at that low, then that's kind of mid."

SMT still confirms the **sweep** (see Wick Theory below). It disqualifies the
**target**. Two different roles for the same tool, and the engine has neither.

---

## CISD is the trigger — not "displacement through the key open"

> CISD is confirmed the moment a candle **closes** beyond the open of the most
> recent opposing delivery leg.

Marking method: draw the open of each impulse leg as a ray; CISD fires when a
candle closes through that ray in the new direction. Wicks do not count.

The engine's `requireKeyOpenReclaim` — displacement must close back through the
10:00 open — appears nowhere in the source. It was `inferred`, and it is the
gate that rejected 26 of 50 measured sessions. It is not a stricter version of
CISD; it is a different rule.

The source is dismissive of the formal alternative, which is worth knowing
because this project has an `requireMss` option built on it:

> "We have a market structure shift, for those of you that care about that — I
> personally don't give a flying fuck."

CISD is used fractally: 4H/1H as the top-down pair, 30m/15m when that is what
the session offers, 1m/5m for the entry trigger itself.

---

## MMXM — the bias

Two mirrored sequences. **Sell model:** sweep a buy-side pool (equal highs) →
bearish CISD closes below the prior bullish leg's open → shallow retracement
into the bearish FVG/order block left behind → distribution to the next
sell-side pool. **Buy model** is the exact mirror.

Spotting one starts with the base:

> "Almost every market maker model has an original consolidation… and then a
> buy-side curve and a sell-side curve."

**5-minute is his stated preferred timeframe for reading MMXM structure.**

### Breakers are the entry trigger

> "A market maker model is essentially your bias. Breakers is going to be the
> essential entry trigger."

Definition: a low, then a higher high, then **a candle closes back through that
original low**. That zone flips from support to resistance. The retrace into it
is the entry.

> "You want a candle closure above this breaker… it didn't close above, it just
> kind of swept it."

A breaker overlapping an FVG is what he calls a **unicorn**. And the entry is
not taken at the zone's edge:

> "I like to use the 50% mark of every imbalance, just so that my risk is better."

A swing above/below the midnight open on top of that is "plus-plus".

---

## Entry: the fib set

His posted retracement levels are **0.5 · 0.62 · 0.705 · 0.79**.

| Level | Role |
|---|---|
| **0.5** | The CE — his default, most-used precision entry. Tightest risk |
| 0.62 | More entries than 0.705, but needs a bigger stop standalone |
| **0.705** | His stated favourite for fib entries |
| 0.79 | **Stop-loss reference**, not usually an entry |

> "What I always do if I use the fib is I enter at 0.705 and I always put my stop
> like below the 0.79."

The engine's default `entryMode` is `fvg-proximal` — the near edge. That is not
in the source, and it is why both measured setups were **no-fills**: an entry at
the zone edge sits shallower than price retraces, or deeper than price reaches,
depending on side. The source's default is the **CE (0.5)**.

Where not to use it: *"choppy, range-bound, still-accumulating price"* — the fib
is a precision tool laid on a move already happening.

---

## Wick Theory — the five-point sweep filter

A pass/fail checklist applied to the **sweep candle itself**:

1. **Liquidity sweep** — takes real resting liquidity, not any wiggle
2. **Imbalance** — that candle or the next leaves an FVG
3. **Rejection block** — small real body relative to the wick
4. **Engineered liquidity** — a level retail obviously rests orders at
5. **SMT divergence** — the correlated pair fails to make the same extreme

All five are meant to stack on the same candle or cluster.

### The five forms of engineered liquidity

Order block CE liquidity · low-resistance (trendline) liquidity · equal
highs/lows · **day high / day low** (especially news-shaped: *"they're like news
wicks, bro"*) · clear single swing points.

**The 2-point rule**, stated numerically:

> "My rule of thumb is if it's like 2 points or less away from the CE, I'll just
> not take it — because at that point I count the CE as already mitigated."

The sweet spot is liquidity sitting *inside* the rejection block. There is no
outer distance limit: *"it would have to be like stupid far away."*

---

## Risk — where the engine is most wrong

| | Engine | Source |
|---|---|---|
| Stop | Beyond raid extreme + ATR buffer | **Just beyond the sweep wick.** 5–20 points on NQ |
| Min R:R | 2.0 | **3.0, preferably 4.0** |
| Entry | FVG near edge | CE (0.5), or 0.705 |
| Trades/day | unlimited | **2, hard** |
| Management | off by default | 10pt → trail to 5 → trail to break-even |

Observed R-multiples, read off the platform on camera: **3.75R, 7.0R, 15.7R,
17.7R**, plus narrated 1:8 and 1:10 trades.

The engine's floor of 2R is *lower* than the source's 3R — and yet the engine
finds almost nothing, because its **stops are far too wide**. The source gets
1:17 from a 5-point stop, not from a distant target. When the structural stop is
too big, the fix is explicit and is not a wider target:

> "That's a little bit too big… " → drop to a lower timeframe and find a smaller
> rejection block inside the same zone.

### The daily trade limit

> "If the first trade is a win, then get off. If the first trade is a loss,
> de-risk 50%. If that's a loss, get off. If that's a win, get off."

Two trades maximum. This has no equivalent in the engine at all, and it changes
what a backtest even means — a per-day cap with size adjustment is a session
rule, not a per-setup rule.

---

## What the source says about frequency

This matters, because the project has been chasing a setup rate:

> "on most days, the honest, correct execution of this playbook is deciding that
> nothing here lined up, and taking no trade at all."
>
> "Treat a session with zero qualifying setups as a successful day, not a missed
> one."
>
> "Price action lately has been kind of wonky… there's no clear setup here — we
> manipulate above, but we also manipulate below."

Combined with the two-trade ceiling, the source describes a **low-frequency**
model. It does not describe a setup every day.

And it does not claim a high win rate:

> "If you do five-point stops and big TPs, your win rate is going to take a hit
> no matter what you do… I'm not going to sit here and pretend like it's 100%
> win rate — it's definitely not."

The arithmetic is built to survive being wrong most of the time: at 1:8 the
breakeven win rate is 11%.

### A regime warning, in his own words

> "From April to maybe mid-July you could sweep these levels without too much
> context. However, it's kind of stopped working… because you don't have the
> proper context."

---

## What has to change in the engine

Roughly in order of how much each is wrong:

1. **The session clock.** Accumulation 18:00–00:00, manipulation 00:00–10:00,
   distribution from 10:00. This is a structural rewrite, not a config change,
   and it requires overnight data — which means Dukascopy, not a Yahoo RTH pull.
2. **Replace `requireKeyOpenReclaim` with CISD** — a close through the prior
   opposing leg's open, evaluated fractally.
3. **Stops to structure, not ATR.** Beyond the sweep wick, with a
   drop-a-timeframe rule when the result is too wide.
4. **`entryMode` default to CE (0.5)**, with 0.705 as the fib alternative and
   0.79 as the stop reference.
5. **`minPlannedR` to 3.0** — the source's stated floor, and higher than the
   current 2.0. It only becomes reachable once stops are structural.
6. **Add the two-trade daily limit** with the 50% de-risk rule.
7. **Add breakers** as a first-class PD array alongside FVG and order block.
8. **Split SMT into two roles** — confirms a sweep, disqualifies a target.
9. **Add the 2-point CE mitigation rule.**
10. **Add Wick Theory** as a five-point score on the sweep candle.

Until at least 1–4 are done, every number this project has produced describes a
model nobody trades.

---

## Sourcing caveat

The guide is an independent third-party breakdown, not an official publication,
and states so. It is built from supplied `.srt` transcripts plus frame analysis,
with standard ICT definitions used only to fill named-but-undefined terms. That
is far stronger than anything this project had before — but it is one
compilation, and quotes are cleaned for readability.

Rules taken from it are marked `sourced` with that meaning: sourced *to this
guide's reading of the transcripts*, not to a primary recording this project has
verified itself.
