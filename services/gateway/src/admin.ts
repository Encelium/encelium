// Invite keys from the command line:
//   node src/admin.ts add "Sara (beta)" [perDay] [--email s@x.com] [--signed-in] [--require-login]
//   node src/admin.ts list
//   node src/admin.ts set "Sara (beta)" --signed-in on|off --require-login on|off --email s@x.com --per-day N --per-minute N
//   node src/admin.ts disable "Sara (beta)"  /  enable "Sara (beta)"
//
// The handles the team asked for: quota amounts per key, who is signed in
// (tier), and forcing sign-in for a key even before its limit is reached.
// Tier quotas for everyone live in config.json → "tiers".
import { loadConfig } from "./config.ts";
import { KeyStore } from "./keys.ts";

const args = process.argv.slice(2);
const [command, name] = args;
const flags = new Map<string, string | true>();
for (let i = 2; i < args.length; i++) {
  if (args[i]!.startsWith("--")) {
    const next = args[i + 1];
    flags.set(args[i]!.slice(2), next && !next.startsWith("--") ? (i++, next) : true);
  }
}
const onOff = (v: string | true | undefined) => (v === "on" || v === true ? true : v === "off" ? false : undefined);
const num = (v: string | true | undefined) => (typeof v === "string" && v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

const keys = new KeyStore(loadConfig().keysFile);

switch (command) {
  case "add": {
    if (!name) { console.error('Give the key a name: node src/admin.ts add "Name"'); process.exit(1); }
    const key = keys.add(name, {
      ...(num(flags.get("per-day")) !== undefined ? { perDay: num(flags.get("per-day")) } : {}),
      ...(num(process.argv[4]) !== undefined && !process.argv[4]!.startsWith("--") && !flags.has("per-day") ? { perDay: Number(process.argv[4]) } : {}),
      ...(flags.get("email") && flags.get("email") !== true ? { email: String(flags.get("email")) } : {}),
      ...(flags.has("signed-in") ? { tier: "signedIn" as const } : {}),
      ...(onOff(flags.get("require-login")) !== undefined ? { requireLogin: onOff(flags.get("require-login")) } : {}),
    });
    console.log(`Invite key for ${name} (shown only now, keep it safe):\n\n  ${key}\n`);
    break;
  }
  case "set": {
    if (!name) { console.error('Which key? node src/admin.ts set "Name" --signed-in on'); process.exit(1); }
    const patch = {
      ...(onOff(flags.get("signed-in")) !== undefined ? { tier: onOff(flags.get("signed-in")) ? ("signedIn" as const) : ("anonymous" as const) } : {}),
      ...(onOff(flags.get("require-login")) !== undefined ? { requireLogin: onOff(flags.get("require-login")) } : {}),
      ...(flags.get("email") && flags.get("email") !== true ? { email: String(flags.get("email")) } : {}),
      ...(num(flags.get("per-day")) !== undefined ? { perDay: num(flags.get("per-day")) } : {}),
      ...(num(flags.get("per-minute")) !== undefined ? { perMinute: num(flags.get("per-minute")) } : {}),
    };
    if (!keys.set(name, patch)) { console.error(`No key named "${name}".`); process.exit(1); }
    console.log(`${name}: updated ${Object.keys(patch).join(", ")}.`);
    break;
  }
  case "list":
    for (const k of keys.list())
      console.log(`${k.disabled ? "[disabled] " : ""}${k.name}  (since ${k.createdAt.slice(0, 10)}${k.tier === "signedIn" ? ", signed-in" : ""}${k.requireLogin ? ", login required" : ""}${k.email ? `, ${k.email}` : ""}${k.perDay ? `, ${k.perDay}/day` : ""})`);
    break;
  case "disable":
  case "enable":
    if (!name || !keys.setDisabled(name, command === "disable")) { console.error(`No key named "${name}".`); process.exit(1); }
    console.log(`${name}: ${command}d.`);
    break;
  default:
    console.log('Usage: node src/admin.ts add "Name" [perDay] [--email x] [--signed-in] [--require-login on]\n       node src/admin.ts set "Name" --signed-in on|off --require-login on|off --email x --per-day N --per-minute N\n       node src/admin.ts list | disable "Name" | enable "Name"');
}
