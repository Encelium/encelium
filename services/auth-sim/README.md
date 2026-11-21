# Encelus auth + quota simulator

A standard-library Python server that mimics the gateway's sign-in and quota
surface, so the app's quota-wall offer and sign-in flow can be developed and
tested before the real server has a domain and HTTPS. When the real gateway
gains these endpoints, the app switches by changing one address.

## Run

```bash
python server.py
```

It listens on `http://127.0.0.1:8790/v1` and prints a starter anonymous key.
Paste that key into the app: Settings → Encelium → Enter invite code, with the
address above.

## Knobs (environment variables)

| Variable | Default | What it does |
|---|---|---|
| `ANON_PER_DAY` | `5` | Anonymous tier daily requests (small, so the wall is easy to hit) |
| `SIGNED_PER_DAY` | `100` | Signed-in tier daily requests |
| `REQUIRE_LOGIN` | `off` | `on` = chat needs a signed-in key even before the limit |
| `DEV_CODES` | `on` | Email login codes are returned in the response (dev only) |
| `PORT` | `8790` | Listen port |

Example — hit the wall after 2 requests, then get 50 after signing in:

```bash
ANON_PER_DAY=2 SIGNED_PER_DAY=50 python server.py
```

(Windows PowerShell: `$env:ANON_PER_DAY="2"; python server.py`)

## The flow it simulates

1. The app chats with the starter key; after `ANON_PER_DAY` requests the
   simulator answers 429 with an `offer` (sign in → `SIGNED_PER_DAY`/day).
2. The app shows the quota-wall card; sign in with:
   - **Google**: `GET /auth/google` → instant fake account token (dev only),
   - **Email**: `POST /auth/start {email}` → a 6-digit code (printed on the
     console, and returned as `devCode` while `DEV_CODES=on`), then
     `GET /auth/verify?email=&code=` → token.
3. The token replaces the invite key; the app now runs on the signed-in quota.

Everything lives in memory: restart resets accounts and counts.
