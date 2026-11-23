<div align="center">

<img src="apps/desktop/build/icon.png" width="96" alt="Encelium" />

# Encelium

**A free, no-jargon AI agent for Windows — powered by the Encelus model.**

Say what you want in your own words — English or العربية — and Encelium plans the
work, asks before anything risky, checks its own result, and builds it in front
of you. Every change can be rewound.

[![Release](https://img.shields.io/badge/release-v0.1.0--beta-0F6E8C)](https://github.com/Encelium/encelium/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0B1620)](https://github.com/Encelium/encelium/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-2E8B57)](LICENSE)
[![Model](https://img.shields.io/badge/model-Encelus-free-DDF0F6?labelColor=0F6E8C)](#)

**⬇ [Download the beta](https://github.com/Encelium/encelium/releases/download/v0.1.0/Encelium-Setup-0.1.0.exe)** · free, no account needed

</div>

---

## Why it exists

Most AI tools speak machine: *tokens, effort, MCP endpoints, working trees.*
Encelium speaks human. It is built for people who want real work done — a shop
page, tidy folders, a small tool — without studying anything first.

- **You can't break anything.** Every change is a rewind point; one click puts it back.
- **It asks first.** Green is safe, yellow asks in plain words, red explains itself.
- **Arabic is not an afterthought.** The whole app is truly right-to-left.
- **Free, with a sign-in bonus.** Anonymous keys get a daily quota; signing in
  (Google or email) doubles it. We store your email and nothing else.

## What's inside

| Path | What it is |
|---|---|
| `apps/desktop` | The Windows app (Electron + React) |
| `apps/web` | The launch website (static, EN/AR) |
| `packages/agent-core` | The agent engine: think → act → check. No dependencies. |
| `packages/ui` | The design system shared by app and site |
| `services/gateway` | Invite keys, quotas, tiers, sign-in offers, server-side prompts |
| `services/auth-sim` | Python simulator for the auth flow, with an admin panel |

## Run it

Requires Node.js 22+.

```bash
npm install
npm run app      # the desktop app
npm run site     # the website
```

On Windows you can also double-click `Start Encelium (dev).cmd`.

The gateway and simulator have their own guides:
[`services/gateway/README.md`](services/gateway/README.md) ·
[`services/auth-sim/README.md`](services/auth-sim/README.md) ·
[quota & login handles](docs/quota-and-login-handles.md)

## Contribute

Issues and PRs are welcome. The app is the product; the gateway is what you'd
self-host if you want your own model behind the same experience.

## License

MIT — see [LICENSE](LICENSE). Copyright © 2026 The Encelium Authors.
