// Fair use per invite key: requests per minute (sliding window) and per day (UTC day).
// Daily counts are saved now and then, so restarting the gateway doesn't hand out a fresh day.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

export type LimitResult = { ok: true; usedToday: number } | { ok: false; reason: "per-minute" | "per-day"; retryAfterSec: number };

const today = () => new Date().toISOString().slice(0, 10);
const nextUtcMidnight = () => { const d = new Date(); d.setUTCHours(24, 0, 0, 0); return d; };

export class Limiter {
  private recent = new Map<string, number[]>(); // key name → request times (ms) in the last minute
  private day = today();
  private counts: Record<string, number> = {};
  private tokens: Record<string, number> = {};
  private dirty = false;

  private readonly file: string;

  constructor(file: string) {
    this.file = file;
    try {
      const saved = JSON.parse(readFileSync(file, "utf8"));
      if (saved.day === this.day) { this.counts = saved.counts ?? {}; this.tokens = saved.tokens ?? {}; }
    } catch { /* first start */ }
    setInterval(() => this.flush(), 15_000).unref();
  }

  private rollDay() {
    if (this.day !== today()) { this.day = today(); this.counts = {}; this.tokens = {}; this.dirty = true; }
  }

  /** Count one request for `name` if it's within its limits. */
  take(name: string, perMinute: number, perDay: number, now = Date.now()): LimitResult {
    this.rollDay();
    const used = this.counts[name] ?? 0;
    if (used >= perDay) return { ok: false, reason: "per-day", retryAfterSec: Math.ceil((nextUtcMidnight().getTime() - now) / 1000) };
    const times = (this.recent.get(name) ?? []).filter((t) => now - t < 60_000);
    if (times.length >= perMinute) return { ok: false, reason: "per-minute", retryAfterSec: Math.max(1, Math.ceil((times[0]! + 60_000 - now) / 1000)) };
    times.push(now);
    this.recent.set(name, times);
    this.counts[name] = used + 1;
    this.dirty = true;
    return { ok: true, usedToday: used + 1 };
  }

  addTokens(name: string, n: number) {
    this.rollDay();
    this.tokens[name] = (this.tokens[name] ?? 0) + n;
    this.dirty = true;
  }

  usage(name: string, perDay: number) {
    this.rollDay();
    return { requestsToday: this.counts[name] ?? 0, requestLimit: perDay, tokensToday: this.tokens[name] ?? 0, resetsAt: nextUtcMidnight().toISOString() };
  }

  flush() {
    if (!this.dirty) return;
    this.dirty = false;
    try {
      mkdirSync(path.dirname(this.file), { recursive: true });
      writeFileSync(`${this.file}.tmp`, JSON.stringify({ day: this.day, counts: this.counts, tokens: this.tokens }));
      renameSync(`${this.file}.tmp`, this.file);
    } catch { this.dirty = true; }
  }
}
