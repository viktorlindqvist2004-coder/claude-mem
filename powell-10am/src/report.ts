/**
 * Human-readable rendering.
 *
 * The `explainDay` output is the teaching surface of this project: it narrates
 * the model's reasoning step by step, including the steps that failed, so a
 * rejected day is as instructive as a traded one.
 */

import type { DayResult, Po3Read, Trade } from "./types.js";
import type { Setup } from "./model.js";
import type { Stats } from "./backtest.js";
import type { Ablation, Candidate, WalkForwardResult } from "./learn.js";
import type { ChartObservation, Verdict } from "./verdict.js";
import { RULE_NOTES, type ModelConfig } from "./spec.js";
import { toEt } from "./time.js";

export function explainDay(read: Po3Read, setup: Setup | null, trade: Trade | null): string {
  const lines: string[] = [];
  const price = (value: number) => value.toFixed(2);

  lines.push(`── ${read.date} ─ 10am Key Open model ${"─".repeat(30)}`);

  if (!Number.isFinite(read.keyOpen.price)) {
    lines.push(`  ✗ ${read.rejectedReason ?? "no data at the key open"}`);
    return lines.join("\n");
  }

  lines.push(`  Key open (10:00 ET)   ${price(read.keyOpen.price)}`);
  if (read.contextBias) {
    lines.push(`  Contextual bias       ${read.contextBias}`);
  }

  // ---- 1. Accumulation
  if (read.accumulation) {
    const { high, low } = read.accumulation;
    lines.push(
      `  1. Accumulation       ${price(low)} – ${price(high)}  (range ${price(high - low)})`,
    );
  } else {
    lines.push(`  1. Accumulation       —`);
  }

  // ---- 2. Manipulation
  if (read.manipulation) {
    const sweep = read.manipulation;
    lines.push(
      `  2. Manipulation       swept the ${sweep.side} at ${price(sweep.level)} ` +
        `(${sweep.source}) to ${price(sweep.extreme)} at ${etTime(sweep.time)}`,
    );
    lines.push(`     → bias            ${read.bias} (trade away from the raid)`);
  } else {
    lines.push(`  2. Manipulation       none`);
  }

  if (read.smt) {
    lines.push(`     SMT               ${read.smt.present ? "✓" : "✗"} ${read.smt.detail}`);
  }

  // ---- 3. Distribution
  if (read.distribution) {
    const displacement = read.distribution;
    lines.push(
      `  3. Distribution       ${displacement.direction} displacement ` +
        `${displacement.atrMultiple.toFixed(2)}× ATR at ${etTime(displacement.time)}` +
        (displacement.fvg ? `, FVG ${price(displacement.fvg.distal)}–${price(displacement.fvg.proximal)}` : ""),
    );
  } else {
    lines.push(`  3. Distribution       none`);
  }

  if (read.structure) {
    lines.push(
      `     Structure         ${read.structure.kind.toUpperCase()} ${read.structure.direction} ` +
        `through ${price(read.structure.level)}`,
    );
  }

  // ---- Fib framework
  if (read.dealingRange && read.ote) {
    lines.push(
      `  4. Dealing range      ${price(read.dealingRange.from)} → ${price(read.dealingRange.to)}`,
    );
    lines.push(
      `     OTE 62–79%        ${price(read.ote.start)} … ${price(read.ote.sweet)} (70.5%) … ${price(read.ote.end)}`,
    );
    const targets = read.projections
      .filter((projection) => projection.ratio <= -1)
      .map((projection) => `${projection.ratio}σ ${price(projection.price)}`)
      .join("   ");
    if (targets) lines.push(`     Projections       ${targets}`);
  }

  // ---- Outcome
  if (!setup) {
    lines.push(`  ✗ No trade            ${read.rejectedReason ?? "conditions not met"}`);
    return lines.join("\n");
  }

  lines.push(
    `  5. Entry              ${price(setup.entryPrice)}  (${setup.entryLabel})`,
  );
  lines.push(`  6. Stop               ${price(setup.stopPrice)}  beyond the raid extreme`);
  lines.push(
    `     Target            ${price(setup.targetPrice)}  (${setup.targetLabel}) — ${setup.plannedR.toFixed(2)}R planned`,
  );

  if (trade) {
    if (trade.outcome === "no-fill") {
      lines.push(`  → Result              no fill before the entry cutoff`);
    } else {
      lines.push(
        `  → Result              ${trade.outcome} ${trade.r >= 0 ? "+" : ""}${trade.r.toFixed(2)}R ` +
          `(MFE ${trade.maxFavourableR.toFixed(2)}R, MAE ${trade.maxAdverseR.toFixed(2)}R)`,
      );
    }
  }

  return lines.join("\n");
}

/**
 * The verdict card — what a user gets back after sending a screenshot.
 *
 * Ordered so the answer comes first and the justification follows: someone
 * looking at a live chart needs the call, then the reason, then the detail.
 */
export function renderVerdict(verdict: Verdict, observation?: ChartObservation): string {
  const lines: string[] = [];
  const badge = {
    valid: "✓ VALID",
    invalid: "✗ INVALID",
    forming: "◷ FORMING",
    uncertain: "? UNCERTAIN",
  }[verdict.status];

  const header = observation?.instrument
    ? `${observation.instrument}${observation.timeframe ? ` ${observation.timeframe}` : ""}${observation.date ? ` · ${observation.date}` : ""}`
    : "10am Key Open";
  lines.push(`── ${header} ${"─".repeat(Math.max(0, 44 - header.length))}`);
  lines.push(``);
  lines.push(`  ${badge}`);
  lines.push(`  ${verdict.action}`);

  if (verdict.reasoning.length > 0) {
    lines.push(``);
    lines.push(`  Why`);
    for (const reason of verdict.reasoning) {
      lines.push(wrap(reason, "    "));
    }
  }

  if (verdict.plan) {
    const plan = verdict.plan;
    lines.push(``);
    lines.push(`  Plan`);
    lines.push(`    Direction   ${plan.direction}`);
    lines.push(`    Entry       ${plan.entryPrice.toFixed(2)}  (${plan.entryLabel})`);
    lines.push(`    Stop        ${plan.stopPrice.toFixed(2)}  beyond the raid extreme`);
    lines.push(`    Target      ${plan.targetPrice.toFixed(2)}  (${plan.targetLabel})`);
    lines.push(`    Planned     ${plan.plannedR.toFixed(2)}R`);
    if (plan.stillAvailable !== null) {
      lines.push(`    Available   ${plan.stillAvailable ? "yes — price has not reached the entry" : "no — price has already passed it"}`);
    }
  }

  lines.push(``);
  lines.push(`  Gates`);
  const mark = { pass: "✓", fail: "✗", unknown: "?", pending: "◷" };
  for (const gate of verdict.gates) {
    lines.push(`    ${mark[gate.status]} ${gate.name}`);
    lines.push(`        ${gate.evidence}`);
  }

  if (verdict.missing.length > 0) {
    lines.push(``);
    lines.push(`  To decide this firmly, supply:`);
    for (const item of verdict.missing) {
      lines.push(`    · ${item}`);
    }
  }

  return lines.join("\n");
}

/** Soft-wrap a sentence to the terminal, preserving an indent. */
function wrap(text: string, indent: string, width = 76): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = indent;

  for (const word of words) {
    if (current.length + word.length + 1 > width && current.trim().length > 0) {
      lines.push(current);
      current = `${indent}${word}`;
    } else {
      current = current.trim().length === 0 ? `${indent}${word}` : `${current} ${word}`;
    }
  }
  if (current.trim().length > 0) lines.push(current);
  return lines.join("\n");
}

export function renderStats(stats: Stats, title = "Backtest"): string {
  const lines: string[] = [];
  lines.push(`── ${title} ${"─".repeat(Math.max(0, 46 - title.length))}`);
  lines.push(`  Trading days        ${stats.days}`);
  lines.push(`  Setups              ${stats.setups}  (${percent(stats.setupRate)} of days)`);
  lines.push(`  Filled              ${stats.fills}   no-fill ${stats.noFills}`);
  lines.push(`  Win rate            ${percent(stats.winRate)}  (${stats.wins}W / ${stats.losses}L / ${stats.scratches}S)`);
  lines.push(`  Expectancy          ${signed(stats.expectancy)}R per trade`);
  lines.push(`  Total               ${signed(stats.totalR)}R`);
  lines.push(`  Average win / loss  ${signed(stats.averageWin)}R / ${signed(stats.averageLoss)}R`);
  lines.push(`  Profit factor       ${Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"}`);
  lines.push(`  Max drawdown        ${stats.maxDrawdownR.toFixed(2)}R`);
  lines.push(`  Longest losing run  ${stats.maxLosingStreak}`);
  lines.push(`  Planned R (avg)     ${stats.averagePlannedR.toFixed(2)}`);
  lines.push(`  MFE / MAE (avg)     ${stats.averageMfe.toFixed(2)}R / ${stats.averageMae.toFixed(2)}R`);

  if (stats.rejections.length > 0) {
    lines.push(`\n  Why days were skipped:`);
    for (const rejection of stats.rejections.slice(0, 8)) {
      lines.push(`    ${String(rejection.count).padStart(4)}  ${rejection.reason}`);
    }
  }

  return lines.join("\n");
}

export function renderCandidates(candidates: Candidate[], limit = 10): string {
  const lines = [`── Grid search: top ${Math.min(limit, candidates.length)} ${"─".repeat(24)}`];
  lines.push(`  These are IN-SAMPLE results. Treat them as hypotheses, not edges.`);
  candidates.slice(0, limit).forEach((candidate, rank) => {
    const overrides = Object.entries(candidate.overrides)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(" ");
    lines.push(
      `  ${String(rank + 1).padStart(2)}. score ${candidate.score.toFixed(3)}  ` +
        `${signed(candidate.stats.expectancy)}R × ${candidate.stats.fills} trades  ${overrides}`,
    );
  });
  return lines.join("\n");
}

export function renderWalkForward(result: WalkForwardResult): string {
  const lines = [`── Walk-forward ${"─".repeat(35)}`];

  for (const fold of result.folds) {
    lines.push(
      `  train ${fold.trainFrom}→${fold.trainTo}  test ${fold.testFrom}→${fold.testTo}`,
    );
    lines.push(
      `    in-sample  ${signed(fold.inSample.expectancy)}R × ${fold.inSample.fills}` +
        `    out-of-sample ${signed(fold.outOfSample.expectancy)}R × ${fold.outOfSample.fills}`,
    );
    const chosen = Object.entries(fold.chosen)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(" ");
    if (chosen) lines.push(`    chose      ${chosen}`);
  }

  lines.push(``);
  lines.push(`  Pooled out-of-sample:`);
  lines.push(`    ${result.pooled.trades} trades   ${signed(result.pooled.expectancy)}R expectancy   ${signed(result.pooled.totalR)}R total   ${percent(result.pooled.winRate)} win rate`);
  lines.push(`  Degradation (in-sample − out-of-sample): ${signed(result.degradation)}R`);
  lines.push(
    result.degradation > 0.2
      ? `    ⚠ Large gap — the grid was fitting noise. Trust the out-of-sample column only.`
      : `    Gap is modest, which is the best evidence available that the parameters generalise.`,
  );

  // A degradation figure computed from a handful of trades is itself noise, and
  // saying so matters more than the number above it.
  if (result.pooled.trades < 30) {
    lines.push(
      `    ⚠ Only ${result.pooled.trades} out-of-sample trades. That is far too few to conclude` +
        ` anything;\n      treat every figure here as a placeholder until you have 100+.`,
    );
  }

  if (result.stability.length > 0) {
    lines.push(``);
    lines.push(`  Parameter stability (chosen in N folds):`);
    for (const entry of result.stability.slice(0, 8)) {
      lines.push(`    ${String(entry.folds).padStart(2)}/${result.folds.length}  ${entry.parameter}=${entry.value}`);
    }
  }

  return lines.join("\n");
}

export function renderAblation(baseline: Stats, ablations: Ablation[]): string {
  const lines = [`── Ablation ${"─".repeat(39)}`];
  lines.push(`  Baseline expectancy ${signed(baseline.expectancy)}R over ${baseline.fills} trades`);
  lines.push(``);
  lines.push(`  Removing each rule changes expectancy by:`);
  for (const ablation of ablations) {
    const verdict =
      ablation.delta < -0.05 ? "rule is earning its place" : ablation.delta > 0.05 ? "rule is COSTING you" : "no measurable effect";
    lines.push(
      `    ${signed(ablation.delta).padStart(7)}R  ${ablation.rule.padEnd(24)} ${ablation.description}`,
    );
    lines.push(`             ${" ".repeat(24)} → ${verdict} (${ablation.stats.fills} trades)`);
  }
  return lines.join("\n");
}

export function renderSpec(config: ModelConfig): string {
  const lines = [`── Rule spec ${"─".repeat(38)}`];
  const byConfidence = { sourced: "✓", inferred: "~", tunable: "?" } as const;

  for (const note of RULE_NOTES) {
    const value = (config as unknown as Record<string, unknown>)[note.id];
    lines.push(
      `  ${byConfidence[note.confidence]} ${note.id.padEnd(24)} ${JSON.stringify(value)}`,
    );
    lines.push(`      ${note.note}`);
  }

  lines.push(``);
  lines.push(`  ✓ sourced   corroborated by public descriptions of the model`);
  lines.push(`  ~ inferred  standard construction filled in to make the rules executable`);
  lines.push(`  ? tunable   free parameter — the default is a starting point, not a finding`);
  return lines.join("\n");
}

export function renderDays(results: DayResult[]): string {
  return results
    .map((result) => explainDay(result.read, null, result.trade))
    .join("\n\n");
}

// ---------------------------------------------------------------------

function etTime(epochMs: number): string {
  const et = toEt(epochMs);
  return `${String(et.hour).padStart(2, "0")}:${String(et.minute).padStart(2, "0")}`;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function signed(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}
