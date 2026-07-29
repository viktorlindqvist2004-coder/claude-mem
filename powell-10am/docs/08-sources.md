# 08 — Sources and provenance

**Read this before trusting anything else in this project.**

---

## The videos could not be accessed

This project was commissioned with three YouTube links as the intended primary
source:

- `youtube.com/watch?v=Y-oqSZmNo4U`
- `youtube.com/watch?v=5pL41Pl7GM4` — *"Powell — 10am key opening (E7 course)"*
- `youtube.com/watch?v=tNyT7tHOmGI`

**None of them were read.** The build environment's network policy refuses
connections to `www.youtube.com` (the proxy returns 403 to the CONNECT), and no
transcript tooling could reach them either. This is a hard environmental block,
not an oversight, and it was not worked around.

Everything in `docs/` and `src/spec.ts` is therefore reconstructed from
**secondary sources**: public descriptions of Powell's key-open model, published
indicator documentation, and the well-documented ICT concepts the model is
built out of.

### What this means concretely

- The **shape** of the model — 10:00 anchor, raid, displacement, retracement
  entry — is corroborated across independent secondary descriptions and is very
  unlikely to be wrong.
- The **specific numbers** — window lengths, thresholds, which entry Powell
  actually takes — are conventions and inferences. They are marked `tunable` in
  the spec and should be treated as starting points, not teachings.
- Anything **unique to the E7 course** is simply absent. If those videos contain
  a filter, a session nuance, or a management rule not present in public
  material, this project does not have it.

**If you can watch the videos, do — then diff them against `src/spec.ts` and fix
the spec.** The provenance markers exist precisely so that is a tractable job
rather than an archaeology project.

---

## Confidence markers

Every rule in `src/spec.ts` carries one:

| Marker | Meaning |
|---|---|
| `sourced` | Corroborated by public descriptions of the model, or of the ICT concept it implements |
| `inferred` | A standard construction the model is meaningless without, filled in to make the rules executable |
| `tunable` | A free parameter with no canonical value; the default is a starting point, not a finding |

```bash
bun run src/cli.ts spec
```

A test asserts that **every** config key has a note and every note names a real
key (`tests/spec.test.ts`), so the markers cannot silently rot as the spec
changes.

### What is marked `sourced`

The 10:00 anchor as a 4-hour candle open; the three key opens at 18:00/00:00/
10:00; sweep-then-displace as the sequence; the requirement that a sweep rejects
rather than closes through; displacement leaving a fair value gap; the reclaim
of the key open; structural liquidity as the target; the 2R floor; SMT
divergence as confirmation; premium/discount discipline; the OTE band and the
standard deviation projections.

### What is marked `inferred`

The 09:30 start of the accumulation range; inverse FVG as a fallback entry;
weekday-only trading; the 16:00 flatten.

### What is marked `tunable`

Every window length and every threshold: `manipulationEnd`, `displacementEnd`,
`entryCutoff`, `minSweepPenetration`, `atrPeriod`, `stopBufferAtr`, `entryMode`,
`swingStrength`, `equalLevelTolerance`, `minPoolWeight`, `partialAtR`,
`breakEvenAtR`, and others.

---

## Secondary sources consulted

On Powell's key opens and the 10am model specifically:

- [powell's key opens — TradingView indicator by TheQuantMechanic](https://www.tradingview.com/script/Nr98KOoI-powell-s-key-opens/)
- [10:00am Open - Powell — TradingView indicator by stormcrypto14](https://www.tradingview.com/script/ped83KXl-10-00am-Open-Powell/)
- [Pro 10:00 Powell Strategy [NQ ES] — TradingView by Ash_TheTrader](https://es.tradingview.com/script/GEx8hDsM-Pro-10-00-Powell-Strategy-NQ-ES-by-Ash-TheTrader/)
- [ICT PO3 - 10AM 4H AMD Model — TradingView strategy by crapanick](https://www.tradingview.com/script/tMYQY7yx-ICT-PO3-10AM-4H-AMD-Model/)

On the ICT concepts the model is composed of:

- [ICT Power of 3 explained — FXOpen](https://fxopen.com/blog/en/what-is-ict-po3-and-how-do-traders-use-it/)
- [ICT Fibonacci levels, OTE 70.5% and standard deviations — innercircletrader.net](https://innercircletrader.net/tutorials/ict-fibonacci-levels/)
- [Optimal Trade Entry (OTE), the 62–79% zone — Liquidity Hunters glossary](https://liquidityhunters.cl/en/glossary/optimal-trade-entry/)
- [Market Structure Shift (MSS) — FXOpen](https://fxopen.com/blog/en/market-structure-shift-meaning-and-use-in-ict-trading/)
- [ICT Market Structure: BOS, CHoCH, MSS — Alpha Metrix](https://alphametrixx.com/blog/ict-market-structure-bos-choch-mss)
- [ICT New Day Opening Gap (NDOG) — innercircletrader.net](https://innercircletrader.net/tutorials/ict-new-day-opening-gap-ndog/)
- [ICT session opens and midnight open — anthonyjohnson.dev](https://anthonyjohnson.dev/ict-edge-indicators/blog/ict-session-opens-guide.html)
- [Advanced analysis of key ICT time levels — TradingFinder](https://tradingfinder.com/education/forex/ict-important-time-levels-for-trading/)

Secondary sources about a trading model are a weak evidence base. They are
consistent with each other here, which is mildly reassuring and not proof.

---

## No results are claimed

Nothing in this project has been run against real market data. The bundled
`fixtures/sample-1m.csv` is generated by `scripts/make-fixture.ts` and describes
that generator. Any statistic produced from it is a test of the plumbing.

The engine is a measuring instrument. It has been built to make an unfavourable
measurement visible — pessimistic intrabar assumptions, mandatory costs,
walk-forward validation, sample-size shrinkage, explicit no-fill accounting —
rather than easy to avoid. Whether the model has an edge on your instrument is
an open question that this project is designed to help you answer, and it may
well answer it negatively.

---

## Next

→ **[09 — Data](09-data.md)**
