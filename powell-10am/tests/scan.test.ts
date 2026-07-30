/**
 * Multi-model scanning.
 *
 * The behaviour worth pinning is not that the scan runs — it is what it does
 * when models disagree, and that a model with no rules cannot masquerade as a
 * filter that found nothing.
 */
import { describe, expect, test } from "bun:test";
import { scanDay, type ModelRead, type TradingModel } from "../src/models/index.js";
import { mechModel } from "../src/models/mech.js";
import { DEFAULT_CONFIG } from "../src/spec.js";

const stub = (id: string, read: Partial<ModelRead>): TradingModel => ({
  id,
  name: id,
  provenance: { status: "reconstructed", note: "test stub" },
  read: () => ({ modelId: id, modelName: id, status: "rejected", ...read }) as ModelRead,
});

const long = (id: string) => stub(id, { status: "setup", direction: "long" });
const short = (id: string) => stub(id, { status: "setup", direction: "short" });
const quiet = (id: string) => stub(id, { status: "rejected", reason: "no raid" });

const run = (models: TradingModel[], onConflict?: "stand-aside" | "report-both") =>
  scanDay([], "2026-07-30", models, DEFAULT_CONFIG, onConflict ? { onConflict } : {});

describe("scanning several models", () => {
  test("nothing firing is a no-trade, and every rejection reason is carried", () => {
    const result = run([quiet("a"), quiet("b")]);
    expect(result.outcome).toBe("none");
    expect(result.action).toBe("no-trade");
    expect(result.summary).toContain("no raid");
  });

  test("one firing is 'single', and the summary refuses to treat silence as support", () => {
    const result = run([long("a"), quiet("b")]);
    expect(result.outcome).toBe("single");
    expect(result.action).toBe("take");
    expect(result.summary).toContain("adds nothing");
  });

  test("agreement is flagged as correlated, not as two independent votes", () => {
    const result = run([long("a"), long("b")]);
    expect(result.outcome).toBe("agreement");
    expect(result.action).toBe("take");
    expect(result.summary).toContain("consistency check");
  });

  test("a direction conflict stands aside by default", () => {
    const result = run([long("a"), short("b")]);
    expect(result.outcome).toBe("conflict");
    // Not "pick the better R" — that is how a filter stops filtering.
    expect(result.action).toBe("stand-aside");
  });

  test("report-both surfaces the conflict without suppressing it", () => {
    const result = run([long("a"), short("b")], "report-both");
    expect(result.outcome).toBe("conflict");
    expect(result.action).toBe("take");
    expect(result.firing).toHaveLength(2);
  });
});

describe("a model with no source material", () => {
  test("reports unavailable rather than 'no setup'", () => {
    // Returning "rejected" would make an unwritten model look like a working
    // filter, and it would silently veto half the scan.
    const read = mechModel.read([], "2026-07-30", DEFAULT_CONFIG);
    expect(read.status).toBe("unavailable");
    expect(mechModel.provenance.status).toBe("unavailable");
  });

  test("an unavailable model is separated out and never counted as firing", () => {
    const result = run([long("a"), mechModel]);
    expect(result.unavailable.map((r) => r.modelId)).toEqual(["mech"]);
    expect(result.firing).toHaveLength(1);
    expect(result.outcome).toBe("single");
  });
});
