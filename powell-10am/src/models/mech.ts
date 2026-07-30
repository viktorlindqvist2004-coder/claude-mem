/**
 * PB Trading "Mech Model" — declared, deliberately not implemented.
 *
 * ## Why this file contains no rules
 *
 * I have no source material for this model and no way to obtain any. The build
 * environment's network policy answers 403 to CONNECT for every search engine,
 * YouTube, and X, so it cannot be researched from here — the same wall that
 * stopped the three 10am videos and is recorded in `docs/08-sources.md`.
 *
 * Writing plausible rules from the name would be the single most damaging thing
 * this project could do. Every other rule in the repository carries a
 * `sourced` / `inferred` / `tunable` marker precisely so that nobody has to
 * wonder later which parts were evidence and which were invention. A model
 * fabricated wholesale would pass every test, produce confident verdicts, and be
 * indistinguishable from the real thing right up until it cost money.
 *
 * So this returns `unavailable` and says why. It does NOT return "no setup":
 * a model that silently declines on every date looks like a working filter and
 * would quietly halve the scan's output while appearing to add rigour.
 *
 * ## What has been supplied
 *
 * A three-page pattern glossary: simple and complex pullbacks, failure tests
 * (SFP), the Anti, and breakouts. Grimes/Raschke price action rather than ICT.
 * It is a taxonomy of shapes, not a set of rules — no trigger, no stop, no
 * target, no time filter — so it still cannot be encoded.
 *
 * Two things it did settle, both recorded in docs/14-mech-model.md:
 *
 *   - A failure test IS the 10am model's liquidity sweep, down to the stated
 *     reason (running stops). A Mech Model built on failure tests would fire on
 *     the same bars, which is one signal counted twice rather than confluence.
 *   - The pullback is trend *continuation*, which is the half the 10am model
 *     does not encode at all (observation 8). That is where combining the two
 *     would actually cover new ground — they would rarely agree, because they
 *     would be trading different days.
 *
 * ## What would make it implementable
 *
 * `docs/14-mech-model.md` lists what has to be supplied, in the order the engine
 * needs it. In short: the session and time filter, the entry trigger, the
 * invalidation, the stop rule, the target rule, and the management scheme. The
 * pipelines for getting material in already exist and are proven —
 * `scripts/video-frames.ts` turns a clip into readable stills, and pasted text
 * or screenshots work directly.
 *
 * Fill in `read()` only when there is something real to encode, and mark every
 * config key with its provenance in `src/spec.ts` as the tests require.
 */

import type { Candle } from "../types.js";
import type { ModelConfig } from "../spec.js";
import type { ReadOptions } from "../model.js";
import type { ModelRead, TradingModel } from "./registry.js";

export const mechModel: TradingModel = {
  id: "mech",
  name: "Mech Model (PB Trading)",
  provenance: {
    status: "unavailable",
    note:
      "No source material. The environment cannot reach any search engine, " +
      "YouTube or X to research it, and inventing rules from the name would " +
      "produce a model indistinguishable from a real one until it lost money. " +
      "See docs/14-mech-model.md for what to supply.",
  },
  read(_candles: Candle[], _date: string, _config: ModelConfig, _options?: ReadOptions): ModelRead {
    return {
      modelId: this.id,
      modelName: this.name,
      status: "unavailable",
      reason:
        "not encoded — no source material has been supplied. See docs/14-mech-model.md.",
    };
  },
};
