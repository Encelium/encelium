# Quota and login handles — how to test everything

Two servers share the same knobs: the **local simulator** (for testing on your
PC) and the **real gateway** (on the VM). Same rules on both.

---

## 1 · The simulator (your PC, nothing to install)

**Easiest:** double-click **`Start auth simulator.cmd`** in the repo root — it starts the
simulator and opens the **admin panel** at http://127.0.0.1:8790/admin in your
browser. The panel manages every handle with buttons: tier quotas, require-login
(global or per key), creating keys, disabling keys, per-key day limits, and
resetting today’s usage. Everything applies instantly.

Or from a terminal (Python 3.12 is installed):

```bash
cd services/auth-sim
python -u server.py
```

It prints a **starter anonymous key** and listens on `http://127.0.0.1:8790/v1`.

### Handles (environment variables)

| Knob | What it does | Example |
|---|---|---|
| `ANON_PER_DAY` | Anonymous daily runs | `ANON_PER_DAY=2 python -u server.py` → the wall after 2 runs |
| `SIGNED_PER_DAY` | Signed-in daily runs | `SIGNED_PER_DAY=50 …` |
| `REQUIRE_LOGIN` | `on` = chat needs sign-in even before the limit | `REQUIRE_LOGIN=on …` |
| `DEV_CODES` | `on` = email codes shown in the response (dev only) | default on |

Windows PowerShell: `$env:ANON_PER_DAY="2"; python -u server.py`

### What to test, in order

1. **The wall + sign-in (in the app):** start with `ANON_PER_DAY=2`, connect the
   app (Settings → Encelium, address `http://127.0.0.1:8790/v1`, starter key),
   run 3 tasks → the third shows the offer card → sign in with Google → limit
   jumps to `SIGNED_PER_DAY`.
2. **The site card:** on the site, the **Account** section's Google button signs
   in and shows an app key — paste it into the app the same way.
3. **Forced login:** restart with `REQUIRE_LOGIN=on` and the *anonymous* starter
   key → the app is asked to sign in before any run.

Everything resets when you restart the simulator.

---

## 2 · The real gateway (the VM)

Quotas live in `config.json` → `tiers`:

```json
"tiers": {
  "anonymous": { "perMinute": 30, "perDay": 500 },
  "signedIn":  { "perMinute": 30, "perDay": 1000 }
},
"requireLogin": false
```

- Change the numbers → restart: `sudo docker restart enceladus-gateway`.
- `requireLogin: true` = everyone must sign in before chatting.

### Per-person handles (admin commands, on the VM)

```bash
# who exists, their tier, email and limits
sudo docker exec enceladus-gateway node src/admin.ts list

# grant the signed-in tier (the bonus)
sudo docker exec enceladus-gateway node src/admin.ts set "Sara (beta)" --signed-in on

# force one person to sign in before their limit is reached
sudo docker exec enceladus-gateway node src/admin.ts set "Sara (beta)" --require-login on

# attach the account email / a custom daily limit
sudo docker exec enceladus-gateway node src/admin.ts set "Sara (beta)" --email sara@x.com --per-day 2000

# a new key that is signed-in from birth
sudo docker exec enceladus-gateway node src/admin.ts add "Sara (beta)" --email sara@x.com --signed-in
```

Keys added or changed while it runs **work right away** (no restart).

> Note: the real gateway enforces tiers and forced login today, but its
> `/auth/google` and `/auth/start`/`/auth/verify` endpoints arrive with the
> public domain + HTTPS. Until then, sign-in flows run against the simulator.
