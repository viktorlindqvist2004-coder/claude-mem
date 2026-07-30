# 14 — The Mech Model: what is needed before it can be encoded

**Status: not encoded.** `src/models/mech.ts` is a declared model with no rules.
It returns `unavailable` on every date, and the scan reports that rather than
letting it look like a filter that found nothing.

---

## What has been supplied so far

Three pages of a pattern glossary (Scribd, 30 Jul 2026). Not a model — a
taxonomy — but it establishes the vocabulary and the lineage, and one entry in
it changes how the two models should be combined.

| Pattern | As described |
|---|---|
| **Simple Pullback (PB)** | Entering a trending market on a counter-trend leg. Enter either as the market turns back into the trend (breakout of the pattern) or near the bottom (on a failure test). |
| **Complex Pullback** | Two or more counter-trend legs. The first attempt to resume the trend fails, the market rolls into another leg, a later attempt succeeds. Noted as a common way trend traders get stopped out. |
| **Failure Test (SFP)** | Bull/bear trap, spring/upthrust, 2B. Price moves past a previous pivot, trades beyond it, and quickly reverses. Explicitly framed as the market seeking volume and *attempting to trigger stop orders*. |
| **Anti** (Linda Raschke) | The first pullback after a trend change: established trend shows failure, a sharp counter-trend shock follows, the Anti is the first pullback after that shock. |
| **Breakouts** | Entry beyond a previously defined support or resistance point, before, at, or after the break. |

The lineage is Adam Grimes / Linda Raschke price action, not ICT. That matters
because the 10am model is ICT-descended — liquidity pools, fair value gaps, PO3,
key opens — and the two describe overlapping phenomena in different words.

### The finding that matters: SFP *is* the 10am model's sweep

> "a market attempts to move past a previous pivot point, trades beyond that
> point, but quickly reverses … capitalizes on the tendency of markets to seek
> volume, and to attempt to trigger stop orders"

That is the manipulation gate, restated. `docs/04-manipulation.md` says price
raids a pool and closes back inside; this says price tests a pivot and quickly
reverses. Same price action, two vocabularies, and the stated *reason* — running
stops — is identical.

So a Mech Model built on failure tests would fire on the **same bars** as the
10am model's sweep gate. That is not confluence, it is one signal counted twice,
and it is exactly the correlation `src/models/registry.ts` warns about. Encoding
it would add setups without adding information.

### The finding that could be worth a lot: PB is the missing half

The pullback is **trend continuation**. The 10am model encodes only the reversal
half of the playbook — that is [observation 8](../journal/OBSERVATIONS.md), open
since the beginning and never resolved.

On a day like 30 July 2026 — a violent one-way trend, price expanding straight
through the opening range — the 10am model correctly refuses to fade it and
stands aside. A pullback model would look at the same chart and see a with-trend
entry. Those two do **not** overlap: one trades the reversal, the other the
continuation, and they are mutually exclusive on any given day.

**That is where combining them is worth something**, and it is a different claim
from "two models agreeing is stronger". They would rarely agree. They would
cover different days.

---

## Why it is still empty

The glossary above is the only material supplied, and it describes shapes rather
than rules. Nothing further can be obtained from here. The build environment's network policy answers 403 to CONNECT for
every search engine, YouTube and X — the same wall recorded in
[`08-sources.md`](08-sources.md) that stopped the three 10am videos.

Rules could be invented from the name. They must not be. Everything in this
repository carries a `sourced` / `inferred` / `tunable` marker so that nobody
later has to guess which parts rest on evidence. A model written from
imagination would pass every test, produce confident verdicts, and be
indistinguishable from a real one right up to the point where it lost money.

That is not caution for its own sake. The 10am model is *already* a
reconstruction, and this project spends real effort marking exactly how far each
rule is from a primary source. Adding a second model with no source at all, and
letting it vote on live trades, would undo that.

---

## What is still missing

The glossary is a taxonomy of shapes, not a set of rules. None of these can be
read off it, and all are needed before a single line is encoded:

**The six questions below remain unanswered.** Pattern names do not constitute a
model: "enter on a breakout of the pattern" does not say what arms the order,
where the stop goes, or when to give up on it.

Any of these formats work for supplying them, and the pipelines exist:

| Material | How to send it |
|---|---|
| Video | `bun run scripts/video-frames.ts clip.mp4 --every 2` turns it into stills. **Audio is not captured** — paste the captions or transcript separately. |
| PDF or course text | Paste it, or attach the file. |
| Chart screenshots of the setup | Attach them; `scripts/chart-measure.ts` reads prices off them by pixel. |
| Your own written description | Perfectly good, and often better than a video — you know which parts you actually trade. |

---

## The six questions the engine needs answered

The order matters: each one is a gate, and a gate that cannot be evaluated makes
every later one meaningless. This mirrors how the 10am model is encoded in
`src/spec.ts`, so answers map straight onto config keys.

**1. When does it look?**
Is it tied to a session, a clock time, a session open, or does it scan
continuously? The 10am model is anchored to a specific 4-hour candle open; if
the Mech Model has no time anchor, the two cannot share a session filter and the
scan has to treat them as genuinely independent passes.

**2. What has to be true before an entry is even considered?**
The context or bias filter — a higher timeframe direction, a level, a prior
day's range, a trend condition. Name what makes a day eligible.

**3. What is the trigger?**
The precise event that arms an order. Not "when structure shifts" but what
counts as the shift, on which timeframe, and whether it must close.

**4. What invalidates it before entry?**
The conditions that cancel a pending setup. This is the half most descriptions
omit and the half that decides whether a backtest means anything.

**5. Where does the stop go, and where does the target go?**
Stated as a rule, not a number of points: "beyond the swing that produced the
trigger", "at the opposing liquidity pool", "2R". If it is a fixed R, say so —
that is a legitimate rule and it changes how the model is measured.

**6. How is the trade managed?**
Partials, break-even moves, time stops, a hard flatten. If there is no
management scheme, say that too — "hold to stop or target" is an answer.

Two more that are worth having but are not blocking: what the model claims for
its win rate and average R (so measurement has something to contradict), and
which instruments and timeframes it is meant for.

---

## How the two will run together

`bun run src/cli.ts scan <csv>` runs every registered model over each date and
compares them. The semantics are in `src/models/registry.ts`, and one of them is
worth stating here because it is counter-intuitive:

**Two models agreeing is not two pieces of evidence.** Both would read the same
candles through overlapping primitives — liquidity, displacement, structure — so
agreement mostly means the inputs lined up. It is a consistency check, not
confirmation. On a direction conflict the default is `stand-aside`, because
"take the one with the better R" is how a filter stops filtering.

And the arithmetic that matters most: two models produce roughly twice the
setups. If neither has a demonstrated edge, that is twice the chances to be
wrong. The 10am model currently stands at **one valid setup in eleven reviewed
days**, with no backtest behind it. Running a second model alongside it does not
make the system smarter until both have been measured — which is what `scan`
plus real data is for.

---

## Next

→ **[08 — Sources](08-sources.md)** for how provenance is tracked
→ **[09 — Data](09-data.md)** for getting the history that would measure either model
