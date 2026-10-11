// Invite keys from the command line:
//   node src/admin.ts add "Sara (beta)" [perDay]   → prints the new key once
//   node src/admin.ts list
//   node src/admin.ts disable "Sara (beta)"  /  enable "Sara (beta)"
import { loadConfig } from "./config.ts";
import { KeyStore } from "./keys.ts";

const [command, name, perDay] = process.argv.slice(2);
const keys = new KeyStore(loadConfig().keysFile);

switch (command) {
  case "add": {
    if (!name) { console.error('Give the key a name: node src/admin.ts add "Name"'); process.exit(1); }
    const key = keys.add(name, perDay ? { perDay: Number(perDay) } : {});
    console.log(`Invite key for ${name} (shown only now, keep it safe):\n\n  ${key}\n`);
    break;
  }
  case "list":
    for (const k of keys.list()) console.log(`${k.disabled ? "[disabled] " : ""}${k.name}  (since ${k.createdAt.slice(0, 10)}${k.perDay ? `, ${k.perDay}/day` : ""})`);
    break;
  case "disable":
  case "enable":
    if (!name || !keys.setDisabled(name, command === "disable")) { console.error(`No key named "${name}".`); process.exit(1); }
    console.log(`${name}: ${command}d.`);
    break;
  default:
    console.log('Usage: node src/admin.ts add "Name" [perDay] | list | disable "Name" | enable "Name"');
}
