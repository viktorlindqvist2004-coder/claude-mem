---
name: powell-10am-chart
description: Judge a TradingView screenshot against the Powell 10am Key Open model, with the economic calendar factored in — is the setup valid, why or why not, and what to do. Use whenever the user sends a chart image and asks about a 10am setup, the 10:00 key level, whether a setup is valid, whether to take a trade, or what to do at the New York AM open. Also use for screenshots showing a liquidity sweep, displacement, FVG, or PO3 at 10:00 ET on NQ/ES, or a ForexFactory calendar alongside a chart. Produces a gate-by-gate verdict with entry, stop, target, news context and reasoning drawn from the encoded model rather than improvised.
---

# Judging a 10am chart screenshot

Your job is **perception**. The verdict comes from `powell-10am/src/verdict.ts`,
which runs the same gates as the backtest engine. Do not improvise a judgement —
extract what you can see, then let the rules decide. That separation is what
stops the same chart getting different answers on different days.

Read `powell-10am/docs/12-chart-reading.md` for the full protocol.

## Procedure

### 1. Check the chart is usable before reading anything

- **Is the chart in New York time?** TradingView shows the timezone at the
  bottom right. If it is not ET — or you cannot tell — say so first and ask.
  On a Stockholm or UTC chart the candle labelled 10:00 is not the key open and
  every conclusion drawn from it is wrong. This is the most common fatal
  problem and it is invisible unless you look for it.
- Is the 09:30–10:00 range on screen? If it is cropped, ask them to scroll left.
- Is the price scale visible? Without it no price can be read.
- Is the timeframe 1m or 5m? 15m is too coarse to resolve the gap.

### 2. Extract a `ChartObservation`

Fill in the structure from `src/verdict.ts`, working through the chart in the
model's own order:

1. **Key open** — the open price of the 10:00 ET candle.
2. **Accumulation** — the 09:30–10:00 high and low.
3. **Sweep** — which side was taken, which level (name it: opening range low,
   prior day low, equal lows), the extreme reached, and **whether the sweeping
   candle closed back inside**.
4. **Displacement** — direction, whether it closed back through the key open,
   whether it left a gap and where that gap's edges are, and the extreme.
5. **Context** — current price, visible target candidates above/below, ATR if a
   study is on the chart.

**Use `null` for anything you cannot determine with confidence.** `null` is
always safe; a wrong value produces a confident wrong verdict, which is the one
output this must never produce. Put anything ambiguous into `uncertain` as a
plain sentence.

Be especially careful with **`closedBackInside`**. It decides sweep versus
expansion, which is the difference between the trade and its opposite. On a
zoomed-out chart it is frequently indeterminate — set it to `null` and ask the
user to zoom in on that one candle rather than inferring it from the wick.

### 3. Get the calendar in

10:00 ET is one of the busiest US release slots — ISM, JOLTS and consumer
confidence all land on it. Always establish the calendar, in this order:

1. A calendar screenshot or pasted rows, if the user sent them → save as text
   and pass `--paste`.
2. `bun run src/cli.ts news --fetch`, if the network allows.
3. Neither → proceed, but the verdict will carry "Calendar not checked" and you
   should say so rather than let it pass unnoticed.

**News never supplies direction.** A release is the vehicle that delivers the
manipulation leg, not a signal. Never say "the number was strong, so go long".
See `docs/13-news.md`.

The one distinction that changes the answer: a **tier-one** release (FOMC, CPI,
NFP, Fed chair speaking) on the raid window replaces the model's premise rather
than fuelling it — the market is discovering a price, not filling orders.
Ordinary high-impact releases (ISM, JOLTS) deliver raids and the model still
applies, with the caveat that the rejection test is unreliable until the release
candle closes.

### 4. Run the evaluation

```bash
cd powell-10am
bun run src/cli.ts verdict observation.json --paste calendar.txt
```

Write the observation to a temp file. Pass any config the user has asked for as
flags (`--entryMode confluence`, `--targetMode std-dev`, `--minPlannedR 3`,
`--newsPolicy stand-aside`).

If running it is not practical, apply `evaluate()`'s gates by hand **in order**
and in full — never a subset, and never with a gate softened because the setup
otherwise looks good.

### 5. Report

Lead with the verdict and the action, then the reasoning, then the gate table.
Keep the engine's wording for the gates; it is precise on purpose.

Always state the reading uncertainty: prices read off an axis are approximate,
so an R figure is "about 3R", not 3.00R. If the verdict is `UNCERTAIN`, the
answer is the list of what to send — not a hedged guess.

## The four verdicts

| Verdict | What to tell them |
|---|---|
| **VALID** | The plan: entry, stop, target, planned R. Whether price has already reached the entry. |
| **INVALID** | Which gate failed, what you observed, and why that gate exists. |
| **FORMING** | Exactly what to wait for — and, if the raid is already in, the direction that is now fixed. |
| **UNCERTAIN** | What to send. Usually: zoom in on the sweeping candle, or scroll left to show 09:30. |

## Things to get right

**Direction is set by the raid and never revisited.** Swept the lows → long.
There is no version of this model where you sweep the lows and sell. If the
user proposes otherwise, say plainly that it is a different trade.

**A sweep that closed *through* the level is not a weak setup — it is a warning
in the opposite direction.** Say so explicitly; fading expansion is the most
expensive mistake available here.

**The stop goes beyond the raid extreme**, because that price is the premise.
Not beyond the entry candle, not a fixed number of points. If asked to widen it,
explain that this abandons the model while staying in the trade.

**A failed reward:risk gate is a real rejection.** When every structural gate
passes but the geometry only pays 1.3R, the answer is no. Do not suggest
switching `targetMode` to make it pass — mention that different target modes
exist as a configuration decision to make *before* the session, not while
looking at a setup they want to take.

**Never invent prices.** If the axis is unreadable, say so.

**Never trade the number.** A beat or a miss powers the move through the level;
it does not tell you which way the day resolves. The model still waits for the
rejection and the displacement.

## Scope

Analysis and education. Explain the model, judge the chart, be straight about
what you can and cannot see. Do not give personalised trading advice, size
positions, or predict where the market will go. Carry the caveat from
`docs/08-sources.md`: the model is reconstructed from secondary sources because
the original videos could not be accessed, and rules are marked `sourced`,
`inferred` or `tunable` accordingly.
