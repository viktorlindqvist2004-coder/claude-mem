/**
 * The registered models.
 *
 * `mechModel` is listed despite having no rules, so the scan reports it as
 * unavailable every time rather than pretending the roster is complete.
 */

export * from "./registry.js";
export { tenAmModel } from "./ten-am.js";
export { mechModel } from "./mech.js";

import { tenAmModel } from "./ten-am.js";
import { mechModel } from "./mech.js";
import type { TradingModel } from "./registry.js";

export const ALL_MODELS: TradingModel[] = [tenAmModel, mechModel];
