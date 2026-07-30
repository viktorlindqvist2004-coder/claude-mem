/**
 * The 10am Key Open model, wrapped as a registrable model.
 *
 * A thin adapter over `readDay` on purpose. The scan must not become a second
 * place where the model's rules live — `src/spec.ts` is the single source of
 * truth and this file only translates the result into the registry's shape.
 */

import type { Candle } from "../types.js";
import type { ModelConfig } from "../spec.js";
import { readDay, type ReadOptions } from "../model.js";
import type { ModelRead, TradingModel } from "./registry.js";

export const tenAmModel: TradingModel = {
  id: "10am-key-open",
  name: "10am Key Open",
  provenance: {
    status: "reconstructed",
    note:
      "Reconstructed from secondary sources — the three source videos could not " +
      "be accessed. Every rule is marked sourced/inferred/tunable in src/spec.ts. " +
      "See docs/08-sources.md.",
  },
  read(candles: Candle[], date: string, config: ModelConfig, options: ReadOptions = {}): ModelRead {
    const { read, setup } = readDay(candles, date, config, options);
    if (setup) {
      return {
        modelId: this.id,
        modelName: this.name,
        status: "setup",
        direction: setup.direction,
        setup,
      };
    }
    return {
      modelId: this.id,
      modelName: this.name,
      status: "rejected",
      reason: read.rejectedReason ?? "no setup",
    };
  },
};
