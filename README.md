# Encelium

A free, no-jargon AI agent for Windows. Say what you want in your own words —
English or Arabic — and Encelium plans the work, asks before anything risky,
checks its own result, and builds it in front of you. Every change can be
rewound. Powered by our own model, **Encelus**, free during the beta.

- **Website:** the launch site lives in `apps/web` (static, two pages).
- **Desktop app:** `apps/desktop` (Electron + React), the product itself.
- **Agent engine:** `packages/agent-core` — the think → act → check loop, tools,
  checkpoints. No dependencies outside Node's standard library.
- **Design system:** `packages/ui` — tokens and components shared by the app
  and the site, so they can never drift apart.
- **Gateway:** `services/gateway` — the server between the app and the model:
  invite keys, quotas per tier, sign-in offers, server-side prompts.
- **Auth simulator:** `services/auth-sim` — a standard-library Python server
  that mimics the gateway's sign-in surface with an admin panel, for local
  development and testing.

## Run the app (development)

Requires Node.js 22+. From the repo root:

```bash
npm install
npm run app
```

Or double-click `Start Encelium (dev).cmd` on Windows.

## Run the website

```bash
npm run site
```

## Run the gateway / simulator

See `services/gateway/README.md` and `services/auth-sim/README.md`.
The quota and login handles are documented in
[`docs/quota-and-login-handles.md`](docs/quota-and-login-handles.md).

## License

MIT — see [LICENSE](LICENSE). Copyright © 2026 The Encelium Authors.
