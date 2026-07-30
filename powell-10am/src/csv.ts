/**
 * OHLC loading.
 *
 * Deliberately dependency-free and forgiving about column naming, because the
 * exports you get from TradingView, Databento, a broker and a scraped CSV all
 * disagree with each other. What it is NOT forgiving about is silence: a row it
 * cannot parse is reported, not skipped, so a half-loaded dataset can never
 * masquerade as a complete one.
 */

import type { Candle } from "./types.js";
import { fromZonedWallClock } from "./time.js";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export interface ParseOptions {
  /**
   * IANA zone that a timestamp *without* an offset should be read in.
   *
   * Defaults to UTC, which is the safe reading when nothing is known. Set it
   * when the export writes a local wall clock — TradingView's table download
   * writes whatever the chart's clock was set to, so a New York chart yields
   * `America/New_York` stamps that carry no offset and land four or five hours
   * early if taken at face value. This is the single most common way to get an
   * empty backtest out of a perfectly good file.
   */
  assumeTimezone?: string;
}

/** Resolve wall-clock components, honouring an assumed zone if one was given. */
function wallClock(
  year: number, month: number, day: number,
  hour: number, minute: number, second: number,
  zone: string | undefined,
): number | null {
  if (zone) return fromZonedWallClock(year, month, day, hour, minute, second, zone);
  const utc = Date.UTC(year, month - 1, day, hour, minute, second);
  return Number.isNaN(utc) ? null : utc;
}

export interface ParseResult {
  candles: Candle[];
  /** Rows that could not be parsed, with 1-based line numbers. */
  errors: { line: number; reason: string }[];
}

const TIME_KEYS = ["time", "timestamp", "date", "datetime", "ts", "open_time"];
const OPEN_KEYS = ["open", "o"];
const HIGH_KEYS = ["high", "h"];
const LOW_KEYS = ["low", "l"];
const CLOSE_KEYS = ["close", "c", "last"];
const VOLUME_KEYS = ["volume", "v", "vol"];

/**
 * Parse CSV text into candles, sorted by time ascending.
 *
 * Accepts a header row naming the columns in any order. Timestamps may be
 * ISO 8601, epoch seconds, epoch milliseconds, or epoch microseconds — the
 * magnitude decides, which is unambiguous for any date this century.
 */
export function parseCsv(text: string, options: ParseOptions = {}): ParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const errors: ParseResult["errors"] = [];
  if (lines.length === 0) return { candles: [], errors };

  const header = splitRow(lines[0] as string).map((cell) => cell.trim().toLowerCase());
  const columns = {
    time: findColumn(header, TIME_KEYS),
    open: findColumn(header, OPEN_KEYS),
    high: findColumn(header, HIGH_KEYS),
    low: findColumn(header, LOW_KEYS),
    close: findColumn(header, CLOSE_KEYS),
    volume: findColumn(header, VOLUME_KEYS),
  };

  const missing = (["time", "open", "high", "low", "close"] as const).filter(
    (key) => columns[key] === -1,
  );
  if (missing.length > 0) {
    throw new Error(
      `CSV is missing required column(s): ${missing.join(", ")}. Header was: ${header.join(", ")}`,
    );
  }

  const candles: Candle[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitRow(lines[i] as string);
    const time = parseTime(cells[columns.time], options.assumeTimezone);
    if (time === null) {
      errors.push({ line: i + 1, reason: `unparseable timestamp: ${cells[columns.time] ?? "<empty>"}` });
      continue;
    }

    const open = parseNumber(cells[columns.open]);
    const high = parseNumber(cells[columns.high]);
    const low = parseNumber(cells[columns.low]);
    const close = parseNumber(cells[columns.close]);
    if (open === null || high === null || low === null || close === null) {
      errors.push({ line: i + 1, reason: "non-numeric OHLC value" });
      continue;
    }
    if (high < low) {
      errors.push({ line: i + 1, reason: `high (${high}) below low (${low})` });
      continue;
    }

    const volume = columns.volume === -1 ? undefined : parseNumber(cells[columns.volume]) ?? undefined;
    candles.push({ time, open, high, low, close, ...(volume === undefined ? {} : { volume }) });
  }

  candles.sort((a, b) => a.time - b.time);
  return { candles, errors };
}

export async function loadCsvFile(path: string, options: ParseOptions = {}): Promise<ParseResult> {
  const text = await Bun.file(path).text();
  return parseCsv(text, options);
}

/** Serialise candles back to CSV — used for fixtures and for exporting slices. */
export function toCsv(candles: Candle[]): string {
  const rows = ["time,open,high,low,close,volume"];
  for (const candle of candles) {
    rows.push(
      [
        new Date(candle.time).toISOString(),
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume ?? "",
      ].join(","),
    );
  }
  return rows.join("\n");
}

// ---------------------------------------------------------------------

function splitRow(line: string): string[] {
  // Handles quoted fields containing commas, which some exporters emit for
  // timestamps like "2026-01-05 09:30:00, EST".
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function findColumn(header: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const index = header.indexOf(candidate);
    if (index !== -1) return index;
  }
  return -1;
}

function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let trimmed = raw.trim().replace(/"/g, "");
  if (trimmed === "") return null;

  // Exports written for human eyes rather than for parsers: TradingView's table
  // download shows `27,739.50` and a Unicode minus sign. Thousands separators
  // are only stripped when they form proper three-digit groups, so a genuine
  // decimal comma is not silently deleted.
  trimmed = trimmed.replace(/[−–—]/g, "-");
  if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(trimmed)) trimmed = trimmed.replace(/,/g, "");
  if (trimmed.startsWith("+")) trimmed = trimmed.slice(1);

  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

/**
 * Timestamps arrive in four shapes. Epoch magnitude disambiguates:
 * seconds ~1e9, milliseconds ~1e12, microseconds ~1e15.
 */
function parseTime(raw: string | undefined, zone?: string): number | null {
  if (raw === undefined) return null;
  const trimmed = raw.trim().replace(/"/g, "");
  if (trimmed === "") return null;

  if (/^\d+$/.test(trimmed)) {
    const value = Number(trimmed);
    if (value > 1e14) return Math.floor(value / 1000);
    if (value > 1e11) return value;
    if (value > 1e8) return value * 1000;
    return null;
  }

  // TradingView's table download writes the row label as it appears on screen:
  // `Thu 30 Jul '26 07:55`. Date.parse rejects the apostrophe year outright, so
  // the whole file would otherwise come back as unparseable timestamps.
  const tableView =
    /^(?:\w{3},?\s+)?(\d{1,2})\s+(\w{3})\s+'?(\d{2}|\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(
      trimmed,
    );
  if (tableView) {
    const month = MONTHS.indexOf(tableView[2]!.toLowerCase().slice(0, 3));
    if (month !== -1) {
      const rawYear = Number(tableView[3]);
      return wallClock(
        rawYear < 100 ? 2000 + rawYear : rawYear,
        month + 1,
        Number(tableView[1]),
        Number(tableView[4]),
        Number(tableView[5]),
        Number(tableView[6] ?? 0),
        zone,
      );
    }
  }

  // "2026-01-05 09:30:00" or "2026-01-05T09:30:00" with no zone.
  //
  // This has to be caught BEFORE Date.parse, not after it. Date.parse accepts
  // both spellings and resolves them against the *machine's* timezone, so the
  // fallback that used to sit below this was unreachable and the documented
  // promise — that a zone-less stamp means UTC — held only on a machine already
  // set to UTC. Everywhere else a TradingView export without an offset was
  // silently shifted by the local offset, which moves the 10:00 key open to
  // some other hour and produces either nothing or, worse, a plausible day.
  const zoneless =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(trimmed);
  if (zoneless) {
    return wallClock(
      Number(zoneless[1]), Number(zoneless[2]), Number(zoneless[3]),
      Number(zoneless[4]), Number(zoneless[5]), Number(zoneless[6] ?? 0),
      zone,
    );
  }

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}
