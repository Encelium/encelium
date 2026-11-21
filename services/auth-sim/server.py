#!/usr/bin/env python3
"""Encelus auth + quota simulator (standard library only).

Stands in for the real gateway's sign-in surface while the domain and HTTPS
aren't ready, so the app's quota-wall offer and sign-in flow can be built and
tested end to end today. Later the same endpoints move to the real server.

Run:  python server.py            (then point the app at http://127.0.0.1:8790/v1)

Endpoints the app uses:
  GET  /health
  GET  /v1/models                        (Bearer key)
  GET  /v1/usage                         (Bearer key) → tier, offer, counts
  POST /v1/chat/completions              (Bearer key) → tiny canned stream
  GET  /auth/google                      → {token}  (fake Google, dev only)
  POST /auth/start  {email}              → {ok, devCode}  (code printed + returned in dev)
  GET  /auth/verify?email=&code=         → {token}

Admin handles via environment variables:
  ANON_PER_DAY (default 5)     anonymous tier daily requests
  SIGNED_PER_DAY (default 100) signed-in tier daily requests
  REQUIRE_LOGIN (default off)  chat needs a signed-in key even before the limit
"""

import json
import os
import secrets
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8790"))
ANON_PER_DAY = int(os.environ.get("ANON_PER_DAY", "5"))
SIGNED_PER_DAY = int(os.environ.get("SIGNED_PER_DAY", "100"))
REQUIRE_LOGIN = os.environ.get("REQUIRE_LOGIN", "off").lower() in ("1", "on", "true")
DEV_CODES = os.environ.get("DEV_CODES", "on").lower() in ("1", "on", "true")

# In-memory state: token → account. Fine for a simulator; everything dies on restart.
tokens: dict[str, dict] = {}          # enc_… → {email, tier}
codes: dict[str, str] = {}            # email → login code
usage: dict[str, dict] = {}           # token → {day, count}


def new_token(email: str, tier: str) -> str:
    tok = "enc_" + secrets.token_urlsafe(24)
    tokens[tok] = {"email": email, "tier": tier}
    return tok


def account(tok: str):
    return tokens.get(tok)


def used_today(tok: str) -> int:
    day = time.strftime("%Y-%m-%d", time.gmtime())
    u = usage.get(tok)
    return u["count"] if u and u["day"] == day else 0


def count_one(tok: str) -> None:
    day = time.strftime("%Y-%m-%d", time.gmtime())
    u = usage.get(tok)
    if u and u["day"] == day:
        u["count"] += 1
    else:
        usage[tok] = {"day": day, "count": 1}


def offer_for(acc) -> dict | None:
    if acc and acc["tier"] == "signedIn":
        return None
    return {"signIn": True, "perDay": SIGNED_PER_DAY, "via": ["google", "email"]}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):  # quieter, still visible
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
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

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

        if url.path == "/auth/google":
            # Fake Google sign-in: a dev account, no real OAuth round trip.
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
        acc = account(tok)
        if not acc:
            return self.send_json(401, {"error": {"code": "invalid_api_key", "message": "This key isn't valid."}})

        if url.path == "/v1/models":
            return self.send_json(200, {"object": "list", "data": [{"id": "encelium", "object": "model", "owned_by": "encelius"}]})

        if url.path == "/v1/usage":
            limit = SIGNED_PER_DAY if acc["tier"] == "signedIn" else ANON_PER_DAY
            return self.send_json(200, {
                "requestsToday": used_today(tok),
                "requestLimit": limit,
                "tier": acc["tier"],
                "signedIn": acc["tier"] == "signedIn",
                "offer": offer_for(acc),
                "resetsAt": time.strftime("%Y-%m-%dT00:00:00Z", time.gmtime(time.time() + 86400)),
            })

        return self.send_json(404, {"error": {"code": "not_found", "message": "Nothing here."}})

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)

        if url.path == "/auth/start":
            body = self.read_body()
            email = str(body.get("email", "")).strip().lower()
            if "@" not in email:
                return self.send_json(400, {"error": {"code": "bad_email", "message": "That email doesn't look right."}})
            code = str(secrets.randbelow(900000) + 100000)
            codes[email] = code
            print(f"[sim] Login code for {email}: {code}  (in production this is an email)")
            # In dev the code is returned too, so the flow is testable without a mailbox.
            return self.send_json(200, {"ok": True, **({"devCode": code} if DEV_CODES else {})})

        if url.path == "/v1/chat/completions":
            tok = self.bearer()
            acc = account(tok)
            if not acc:
                return self.send_json(401, {"error": {"code": "invalid_api_key", "message": "This key isn't valid."}})
            if REQUIRE_LOGIN and acc["tier"] != "signedIn":
                return self.send_json(401, {"error": {"code": "login_required", "message": "Sign in to keep using Encelus.", "offer": offer_for(acc)}})
            limit = SIGNED_PER_DAY if acc["tier"] == "signedIn" else ANON_PER_DAY
            if used_today(tok) >= limit:
                return self.send_json(429, {
                    "error": {"code": "rate_limit_exceeded", "message": "Today's limit is used up.", "offer": offer_for(acc)},
                }, {"retry-after": "3600"})
            count_one(tok)
            # A tiny canned stream — enough for the app to render a reply.
            self.send_response(200)
            self.send_header("content-type", "text/event-stream")
            self.end_headers()
            chunks = [
                {"model": "encelium", "choices": [{"delta": {"content": "This is the simulator. "}}]},
                {"model": "encelium", "choices": [{"delta": {"content": "Sign-in flow works end to end."}}]},
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


if __name__ == "__main__":
    # One ready-made anonymous key so the app can connect out of the box.
    starter = new_token("anonymous@local", "anonymous")
    print(f"Encelus auth simulator on http://127.0.0.1:{PORT}")
    print(f"Tiers: anonymous {ANON_PER_DAY}/day, signed-in {SIGNED_PER_DAY}/day. REQUIRE_LOGIN={REQUIRE_LOGIN}")
    print(f"Starter anonymous key (paste into the app's invite box):\n  {starter}\n")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
