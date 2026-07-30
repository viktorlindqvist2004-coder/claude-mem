# 14 — The Mech Model: what is needed before it can be encoded

**Status: not encoded.** `src/models/mech.ts` is a declared model with no rules.
It returns `unavailable` on every date, and the scan reports that rather than
letting it look like a filter that found nothing.

---

## Why it is empty

I have no source material for PB Trading's Mech Model, and I cannot obtain any
from here. The build environment's network policy answers 403 to CONNECT for
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

## What to supply

Any of these work, and the pipelines exist:

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
