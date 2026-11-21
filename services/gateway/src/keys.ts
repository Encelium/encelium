// Invite keys. Only a hash of each key is stored, so the keys file is safe to back up:
// a leaked copy can't be used. A key is shown once, when it's made.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface InviteKey {
  /** sha256 of the key, hex. */
  hash: string;
  /** Who it's for (shown in logs instead of the key). */
  name: string;
  createdAt: string;
  disabled?: boolean;
  /** Per-key limits, if different from the tier's. */
  perMinute?: number;
  perDay?: number;
  /** The account this key is bound to, once the person has signed in. */
  email?: string;
  /** "signedIn" keys get the signed-in tier quota. */
  tier?: "anonymous" | "signedIn";
  /** Force this key to sign in before it can chat, even before any limit. */
  requireLogin?: boolean;
}

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** A new key, e.g. "enc_3fA9…" (URL-safe, 32 random bytes). */
export const newKey = () => `enc_${randomBytes(32).toString("base64url")}`;

export class KeyStore {
  private keys: InviteKey[] = [];
  private readonly file: string;
  private mtime = -1;
  constructor(file: string) { this.file = file; this.reload(); }

  reload() {
    try { this.keys = JSON.parse(readFileSync(this.file, "utf8")); } catch { this.keys = []; }
    if (!Array.isArray(this.keys)) this.keys = [];
    try { this.mtime = statSync(this.file).mtimeMs; } catch { this.mtime = -1; }
  }

  /** Keys added or disabled with the admin command (another process) count right away, without a restart. */
  private refresh() {
    let mtime = -1;
    try { mtime = statSync(this.file).mtimeMs; } catch { /* no keys file yet */ }
    if (mtime !== this.mtime) this.reload();
  }

  private save() {
    mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.keys, null, 2));
    renameSync(tmp, this.file);
  }

  /** The key's record, if the key is real and not disabled. Compares in constant time. */
  find(key: string): InviteKey | null {
    if (!key) return null;
    this.refresh();
    const h = Buffer.from(hashKey(key), "hex");
    for (const k of this.keys) {
      const kh = Buffer.from(k.hash, "hex");
      if (kh.length === h.length && timingSafeEqual(kh, h)) return k.disabled ? null : k;
    }
    return null;
  }

  add(name: string, fields: { perMinute?: number; perDay?: number; email?: string; tier?: "anonymous" | "signedIn"; requireLogin?: boolean } = {}): string {
    this.refresh();
    const key = newKey();
    this.keys.push({ hash: hashKey(key), name, createdAt: new Date().toISOString(), ...fields });
    this.save();
    return key;
  }

  /** Admin handle: change tier, email, forced login or limits of a named key. */
  set(name: string, patch: Partial<Omit<InviteKey, "hash" | "name" | "createdAt">>): boolean {
    this.refresh();
    const k = this.keys.find((x) => x.name === name);
    if (!k) return false;
    Object.assign(k, patch);
    this.save();
    return true;
  }

  setDisabled(name: string, disabled: boolean): boolean {
    return this.set(name, { disabled });
  }

  list(): Omit<InviteKey, "hash">[] {
    return this.keys.map(({ hash: _hash, ...rest }) => rest);
  }
}
