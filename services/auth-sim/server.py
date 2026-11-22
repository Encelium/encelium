#!/usr/bin/env python3
"""Encelus auth + quota simulator (standard library only).

Stands in for the real gateway's sign-in surface while the domain and HTTPS
aren't ready. Includes a small admin panel at http://127.0.0.1:8790/admin for
managing every handle (quotas, tiers, forced login, keys) in the browser.

Run:  python server.py            (or the launcher in the repo root)

App endpoints (what the app and the website call):
  GET  /health
  GET  /v1/models                        (Bearer key)
  GET  /v1/usage                         (Bearer key) → tier, offer, counts
  POST /v1/chat/completions              (Bearer key) → tiny canned stream
  GET  /auth/google                      → {token}  (fake Google, dev only)
  POST /auth/start  {email}              → {ok, devCode}  (code printed + returned in dev)
  GET  /auth/verify?email=&code=         → {token}

Admin panel:
  GET  /admin                            → the panel page
  GET  /admin/api/state                  → settings + all keys
  POST /admin/api/action                 → everything the panel buttons do
"""

import json
import os
import secrets
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8790"))
DEV_CODES = os.environ.get("DEV_CODES", "on").lower() in ("1", "on", "true")

# Live-editable settings — the admin panel changes these at runtime.
settings = {
    "anonPerDay": int(os.environ.get("ANON_PER_DAY", "5")),
    "signedPerDay": int(os.environ.get("SIGNED_PER_DAY", "100")),
    "requireLogin": os.environ.get("REQUIRE_LOGIN", "off").lower() in ("1", "on", "true"),
}

# In-memory state: token → account. Everything dies on restart, which is the point.
tokens: dict[str, dict] = {}   # enc_… → {email, tier, requireLogin, disabled, perDay?}
codes: dict[str, str] = {}     # email → login code
usage: dict[str, dict] = {}    # token → {day, count}


def new_token(email: str, tier: str) -> str:
    tok = "enc_" + secrets.token_urlsafe(24)
    tokens[tok] = {"email": email, "tier": tier, "requireLogin": False, "disabled": False}
    return tok


def day() -> str:
    return time.strftime("%Y-%m-%d", time.gmtime())


def used_today(tok: str) -> int:
    u = usage.get(tok)
    return u["count"] if u and u["day"] == day() else 0


def limit_for(tok: str) -> int:
    acc = tokens[tok]
    if acc.get("perDay"):
        return acc["perDay"]
    return settings["signedPerDay"] if acc["tier"] == "signedIn" else settings["anonPerDay"]


def signed_in(tok: str) -> bool:
    return tokens[tok]["tier"] == "signedIn"


def offer_for(tok: str) -> dict | None:
    if signed_in(tok):
        return None
    return {"signIn": True, "perDay": settings["signedPerDay"], "via": ["google", "email"]}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print("[sim]", self.command, self.path)

    # ── helpers ──────────────────────────────────────────────────
    def bearer(self) -> str:
        h = self.headers.get("authorization", "")
        return h[7:].strip() if h.lower().startswith("bearer ") else ""

    def send_json(self, status: int, body: dict, headers: dict | None = None):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(data)))
        self.send_header("access-control-allow-origin", "*")  # the site calls these too
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("access-control-allow-origin", "*")
        self.send_header("access-control-allow-methods", "GET, POST, OPTIONS")
        self.send_header("access-control-allow-headers", "authorization, content-type")
        self.send_header("access-control-max-age", "600")
        self.end_headers()

    def read_body(self) -> dict:
        try:
            n = int(self.headers.get("content-length", "0"))
            return json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return {}

    # ── routes ───────────────────────────────────────────────────
    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        q = urllib.parse.parse_qs(url.query)

        if url.path == "/health":
            return self.send_json(200, {"ok": True, "models": ["encelium"]})

        if url.path == "/admin":
            self.send_response(200)
            self.send_header("content-type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(ADMIN_HTML.encode())
            return None

        if url.path == "/admin/api/state":
            return self.send_json(200, {
                "settings": settings,
                "keys": [
                    {
                        "token": tok,
                        "email": acc["email"],
                        "tier": acc["tier"],
                        "requireLogin": acc.get("requireLogin", False),
                        "disabled": acc.get("disabled", False),
                        "perDay": acc.get("perDay"),
                        "usedToday": used_today(tok),
                        "limit": limit_for(tok),
                    }
                    for tok, acc in tokens.items()
                ],
            })

        if url.path == "/auth/google":
            email = "demo-user@gmail.test"
            print(f"[sim] Google sign-in: {email}")
            return self.send_json(200, {"token": new_token(email, "signedIn"), "email": email})

        if url.path == "/auth/verify":
            email = (q.get("email") or [""])[0].strip().lower()
            code = (q.get("code") or [""])[0].strip()
            if not email or not code or codes.get(email) != code:
                return self.send_json(401, {"error": {"code": "bad_code", "message": "That code didn't match."}})
            codes.pop(email, None)
            return self.send_json(200, {"token": new_token(email, "signedIn"), "email": email})

        tok = self.bearer()
        if tok not in tokens or tokens[tok].get("disabled"):
            return self.send_json(401, {"error": {"code": "invalid_api_key", "message": "This key isn't valid."}})

        if url.path == "/v1/models":
            return self.send_json(200, {"object": "list", "data": [{"id": "encelium", "object": "model", "owned_by": "encelius"}]})

        if url.path == "/v1/usage":
            return self.send_json(200, {
                "requestsToday": used_today(tok),
                "requestLimit": limit_for(tok),
                "tier": tokens[tok]["tier"],
                "signedIn": signed_in(tok),
                "offer": offer_for(tok),
                "resetsAt": time.strftime("%Y-%m-%dT00:00:00Z", time.gmtime(time.time() + 86400)),
            })

        return self.send_json(404, {"error": {"code": "not_found", "message": "Nothing here."}})

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        body = self.read_body()

        if url.path == "/auth/start":
            email = str(body.get("email", "")).strip().lower()
            if "@" not in email:
                return self.send_json(400, {"error": {"code": "bad_email", "message": "That email doesn't look right."}})
            code = str(secrets.randbelow(900000) + 100000)
            codes[email] = code
            print(f"[sim] Login code for {email}: {code}  (in production this is an email)")
            return self.send_json(200, {"ok": True, **({"devCode": code} if DEV_CODES else {})})

        if url.path == "/admin/api/action":
            return self.admin_action(body)

        if url.path == "/v1/chat/completions":
            tok = self.bearer()
            if tok not in tokens or tokens[tok].get("disabled"):
                return self.send_json(401, {"error": {"code": "invalid_api_key", "message": "This key isn't valid."}})
            if (settings["requireLogin"] or tokens[tok].get("requireLogin")) and not signed_in(tok):
                return self.send_json(401, {"error": {"code": "login_required", "message": "Sign in to keep using Encelus.", "offer": offer_for(tok)}})
            if used_today(tok) >= limit_for(tok):
                return self.send_json(429, {"error": {"code": "rate_limit_exceeded", "message": "Today's limit is used up.", "offer": offer_for(tok)}}, {"retry-after": "3600"})
            u = usage.get(tok)
            if u and u["day"] == day():
                u["count"] += 1
            else:
                usage[tok] = {"day": day(), "count": 1}
            self.send_response(200)
            self.send_header("content-type", "text/event-stream")
            self.end_headers()
            chunks = [
                {"model": "encelium", "choices": [{"delta": {"content": "This is the simulator. "}}]},
                {"model": "encelium", "choices": [{"delta": {"content": "Handles changed from the panel apply right away."}}]},
                {"model": "encelium", "choices": [], "usage": {"total_tokens": 12}},
            ]
            try:
                for c in chunks:
                    self.wfile.write(f"data: {json.dumps(c)}\n\n".encode())
                self.wfile.write(b"data: [DONE]\n\n")
            except BrokenPipeError:
                pass
            return None

        return self.send_json(404, {"error": {"code": "not_found", "message": "Nothing here."}})

    # ── the panel's buttons ──────────────────────────────────────
    def admin_action(self, body: dict):
        act = body.get("action")
        tok = body.get("token")
        if act == "setTiers":
            for k in ("anonPerDay", "signedPerDay"):
                if isinstance(body.get(k), int) and body[k] > 0:
                    settings[k] = body[k]
        elif act == "requireLogin":
            settings["requireLogin"] = bool(body.get("on"))
        elif act == "newKey":
            email = str(body.get("email", "")).strip().lower() or "manual@local"
            t = new_token(email, "signedIn" if body.get("signedIn") else "anonymous")
            print(f"[sim] panel: new key for {email} ({tokens[t]['tier']})\n  {t}")
        elif act == "setTier" and tok in tokens:
            tokens[tok]["tier"] = "signedIn" if body.get("on") else "anonymous"
        elif act == "setRequireLogin" and tok in tokens:
            tokens[tok]["requireLogin"] = bool(body.get("on"))
        elif act == "setPerDay" and tok in tokens:
            tokens[tok]["perDay"] = int(body["perDay"]) if body.get("perDay") else None
        elif act == "disable" and tok in tokens:
            tokens[tok]["disabled"] = bool(body.get("on"))
        elif act == "resetUsage":
            usage.clear()
        else:
            return self.send_json(400, {"error": {"code": "bad_action", "message": "Unknown action."}})
        return self.send_json(200, {"ok": True})


ADMIN_HTML = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Encelus simulator — handles</title>
<style>
  :root { --bg:#F4F7FA; --surface:#fff; --border:#DCE5EC; --text:#0B1620; --muted:#4A5866; --accent:#0F6E8C; --soft:#DDF0F6; }
  * { box-sizing:border-box; }
  body { margin:0; font:15px/1.5 system-ui, sans-serif; background:var(--bg); color:var(--text); padding:32px; }
  h1 { font-size:22px; margin:0 0 4px; } h1 + p { margin:0 0 24px; color:var(--muted); }
  section { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:20px; margin-bottom:20px; }
  h2 { font-size:15px; margin:0 0 14px; color:var(--accent); text-transform:uppercase; letter-spacing:.06em; }
  .row { display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin-bottom:10px; }
  label { font-size:13px; color:var(--muted); }
  input[type=number], input[type=email] { height:36px; padding:0 12px; border:1px solid var(--border); border-radius:8px; font:inherit; width:140px; }
  input[type=email] { width:220px; }
  button { height:36px; padding:0 16px; border-radius:8px; border:1px solid var(--accent); background:var(--accent); color:#fff; font:inherit; font-weight:600; cursor:pointer; }
  button.ghost { background:var(--soft); color:var(--accent); }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--border); }
  th { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.05em; }
  code { font-family:ui-monospace, monospace; font-size:12px; background:var(--soft); border-radius:6px; padding:2px 8px; }
  .tier { font-weight:600; } .tier.signed { color:#2E8B57; } .tier.anon { color:var(--muted); }
  .off { color:#C03A2B; font-weight:600; }
  .note { color:var(--muted); font-size:13px; }
</style></head><body>
<h1>Encelus simulator — handles</h1>
<p>Everything applies instantly. The app and the site read these values live.</p>

<section>
  <h2>Global</h2>
  <div class="row">
    <label>Anonymous / day <input id="anon" type="number" min="1"></label>
    <label>Signed-in / day <input id="signed" type="number" min="1"></label>
    <button onclick="saveTiers()">Save tiers</button>
    <button class="ghost" onclick="toggleRequireLogin()" id="rl">…</button>
    <button class="ghost" onclick="resetUsage()">Reset today's usage</button>
  </div>
  <p class="note">The second button turns “require login for everyone” on/off — the app is asked to sign in before any run.</p>
</section>

<section>
  <h2>Keys</h2>
  <div class="row">
    <input id="email" type="email" placeholder="email (optional)">
    <button onclick="newKey()">Create anonymous key</button>
    <button class="ghost" onclick="newKey(true)">Create signed-in key</button>
  </div>
  <table id="keys"><thead><tr>
    <th>Key</th><th>Email</th><th>Tier</th><th>Used today</th><th>Login required</th><th>Custom /day</th><th></th>
  </tr></thead><tbody></tbody></table>
  <p class="note">New keys are printed in the simulator console too. Paste a key into the app: Settings → Encelium.</p>
</section>

<script>
const $ = (id) => document.getElementById(id);
let requireLogin = false;
async function load() {
  const s = await (await fetch('/admin/api/state')).json();
  $('anon').value = s.settings.anonPerDay;
  $('signed').value = s.settings.signedPerDay;
  requireLogin = s.settings.requireLogin;
  $('rl').textContent = requireLogin ? 'Require login: ON' : 'Require login: OFF';
  $('rl').style.borderColor = requireLogin ? '#C03A2B' : '';
  $('keys').querySelector('tbody').innerHTML = s.keys.map((k) => `
    <tr>
      <td><code>${k.token.slice(0, 18)}…</code></td>
      <td>${k.email}</td>
      <td class="tier ${k.tier === 'signedIn' ? 'signed' : 'anon'}">${k.tier === 'signedIn' ? 'signed-in' : 'anonymous'}</td>
      <td>${k.usedToday} / ${k.limit}</td>
      <td>${k.requireLogin ? '<span class="off">yes</span>' : 'no'}</td>
      <td>${k.perDay ?? '—'}</td>
      <td>
        <button class="ghost" onclick="act('setTier',{token:'${k.token}',on:${k.tier !== 'signedIn'}})">${k.tier === 'signedIn' ? 'Make anonymous' : 'Make signed-in'}</button>
        <button class="ghost" onclick="act('setRequireLogin',{token:'${k.token}',on:${!k.requireLogin}})">Login ${k.requireLogin ? 'off' : 'on'}</button>
        <button class="ghost" onclick="act('disable',{token:'${k.token}',on:${!k.disabled}})">${k.disabled ? 'Enable' : 'Disable'}</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="7" class="note">No keys yet — create one above.</td></tr>';
}
async function act(action, extra = {}) {
  await fetch('/admin/api/action', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
  load();
}
const saveTiers = () => act('setTiers', { anonPerDay: +$('anon').value, signedPerDay: +$('signed').value });
const toggleRequireLogin = () => act('requireLogin', { on: !requireLogin });
const resetUsage = () => act('resetUsage');
const newKey = (signedIn) => act('newKey', { email: $('email').value, signedIn: !!signedIn });
load(); setInterval(load, 4000);
</script>
</body></html>"""


if __name__ == "__main__":
    starter = new_token("anonymous@local", "anonymous")
    print(f"Encelus auth simulator on http://127.0.0.1:{PORT}")
    print(f"Admin panel: http://127.0.0.1:{PORT}/admin")
    print(f"Tiers: anonymous {settings['anonPerDay']}/day, signed-in {settings['signedPerDay']}/day. REQUIRE_LOGIN={settings['requireLogin']}")
    print(f"Starter anonymous key (paste into the app's invite box):\n  {starter}\n")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
