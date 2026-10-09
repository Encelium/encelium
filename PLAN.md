# Enceladus — Master Plan

> Status: planning (no code yet) · Last updated: 2026-10-08
> This file is the single source of truth. If something is not here, it is not decided.

---

## 1. What we are building

**Enceladus** is a free AI agent for chat and coding, running on our own model.

- **Product 1 — Desktop app (Windows first).** Chat + coding + working with files on the computer. Built first.
- **Product 2 — Launch website.** Introduces the product and gets people to download. No chat on the web. Built second.
- **Later:** Mac version, CLI version.

**One sentence:** *Enceladus is the simplest way to get real work done with an AI agent — no jargon, nothing to study first, and it's free.*

**Who it is for:** people who want an agent to build things or handle files, but are scared off by terminals, settings and words like "tokens", "effort", "skills", "MCP". Power users are welcome, but beginners come first.

---

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Model | Our own cloud model (default, free). Users can add their own API key for other models (hidden under Advanced). |
| Platform | Windows first. Mac later. CLI later. |
| Access | Invite-only beta at launch. |
| Privacy | We do **not** train on user data. Say this loudly on the website and in the app. |
| Source code | The desktop app is **open source** under the **MIT license**. The model stays private on our servers. |
| Git identity | Local placeholder author "Enceladus" until the GitHub org exists; rewrite to the GitHub noreply address **before the first push**. |
| Code signing | **SignPath Foundation** (free for open source). Apply early. |
| Languages | Right-to-left supported from day one — UI **and** model output. **Arabic is the main RTL target**; Persian and Hebrew follow the same system. |
| Funding | Handled separately. Not part of this plan. |
| Design | Owned by Claude. Premium is a hard requirement. |

---

## 3. Product rules (every feature must pass these)

1. **No jargon.** If a beginner would need to Google a word, rename it or hide it.
2. **You can't break anything.** Every change can be undone.
3. **Show, don't tell.** Show the result (live preview, summary) before code.
4. **Honest over impressive.** If the agent failed, it says so clearly.
5. **Depth is optional.** Simple surface by default; "Look beneath" shows the technical details for those who want them.
6. **Fast.** Opens in ~2 seconds. Never freezes.

### Jargon translation table

| Industry word | What Enceladus shows |
|---|---|
| Model / provider | Hidden. (Advanced → "Use your own model") |
| Tokens / context / limits | **Energy bar** ("Today's energy: 70%") |
| Effort / reasoning level | Gone. The agent decides. |
| Skills / system prompt / CLAUDE.md-style files | **"What I know about this project"** — an editable note in plain words |
| MCP servers | **Connections** — a gallery with one-click setup |
| Tool call / permission | Plain sentence + color: 🟢 safe · 🟡 careful · 🔴 risky |
| Terminal output | One-line summary + "Show details" |
| Diff / commit / checkpoint | **Rewind** |

---

## 4. Features

### Version 1 (beta launch)

| # | Feature | What it does |
|---|---|---|
| F1 | **Chat + coding agent** | Talks, reads/writes files, runs terminal commands, uses Connections (MCP). |
| F2 | **"I'll set it up for you"** | Detects missing tools (Python, Node, Git…) and installs them with one click, in plain words. |
| F3 | **Rewind** | Every change is saved automatically. One button to go back to any point. User's own Git is never touched. |
| F4 | **Perfect right-to-left** | UI mirrors fully; model output with mixed Persian/English, code and numbers displays correctly. |
| F5 | **Live preview** | Websites the agent builds appear inside the app instantly. (v1: websites only.) |
| F6 | **"What do you want to make?" home** | Starting cards instead of an empty chat box. |
| F7 | **Learn-by-doing onboarding** | First real task in under 2 minutes; teaches Ask → Approve → Rewind. Skippable. |
| F8 | **Safety net** | Plan first, self-checking, honest failure (see section 5). |
| F9 | **Plain permissions** | 🟢🟡🔴 prompts in human language. |
| F10 | **"Fix it" button** | Appears on any error; agent diagnoses and fixes. |
| F11 | **Project note** | "What I know about this project", editable like a note. |
| F12 | **Drag & drop** | Files, folders, screenshots straight into chat. |
| F13 | **Energy bar** | Simple daily usage instead of token numbers. |
| F14 | **Learn mode (switch)** | Agent explains each step in simple words. |
| F15 | **Bring your own key** | Advanced setting. Any OpenAI-compatible or Anthropic API key. |

### Later (not v1)

- Repeat tasks ("organize Downloads every Monday")
- Voice input in the user's language
- One-click share / publish a website (costs hosting money)
- Live preview for non-web apps
- Mac version, CLI version
- Teams, billing, enterprise

### Cut (will not build)

- Model picker on the main screen
- Token counters, effort sliders
- Web chat

---

## 5. The safety net (fix for "weaker model + beginner users")

**Problem:** our model is slightly weaker; beginners can't fix its mistakes, so they leave.
**Solution:** the app protects the user from the model's mistakes.

**Before work**
- Unclear request → agent asks **one** simple question instead of guessing.
- Shows a short plan in plain words → user clicks **Start**.
- Big tasks are split into small steps (weaker models do better on small steps).

**During work**
- **Self-check loop:** run the code / open the page → read errors → fix → retry (max ~3 tries). The user should never be the first to see a broken result.
- Risky actions (delete, install, run unknown scripts, touch files outside the project) always ask first, with color.
- Automatic checkpoint before every change.

**After work**
- Short summary + result shown (preview).
- "Is this what you wanted?" 👍 👎
- Wrong → **Rewind** or **Try another way**.
- Failure → honest message: "I couldn't do this. Here's why. Here's what you can try."

**Measure in beta:** task success rate, and especially success on a user's **first 3 tasks**. This number matters more than anything else.

---

## 6. Onboarding (learn by doing)

1. Welcome screen (moon visual, one sentence, invite code if needed, sign in).
2. Language + direction picked automatically from Windows; one tap to change.
3. "Let's make your first thing together. What's your name?"
4. Agent shows a 3-step plan → user clicks **Start** *(learns: approve)*.
5. A personal web page builds live in the preview *(learns: see results)*.
6. "Don't like the color? Press Rewind." *(learns: undo)*
7. "You're ready." → Home.

Target: under 2 minutes. "Skip" always visible.

---

## 7. Design plan

### Concept: Surface & Ocean
Enceladus (Saturn's moon) has the brightest icy surface in the solar system and a hidden liquid ocean underneath; water jets ("plumes") erupt from four cracks at its south pole ("tiger stripes").
**Our product = simple surface, deep power underneath.**

- **Surface theme (light):** icy whites, cool greys, a single cold-blue accent.
- **Ocean theme (dark):** deep blue-black, soft glow, same accent.
- **Signature:** tiger-stripe lines + rising plumes = the "agent is working" animation.
- **Avoid:** crescent moons, starfields, purple space gradients (every AI brand uses these).

### Design rules
1. Calm: one main action per screen, generous spacing.
2. Motion only when it means something (working, done, error).
3. Every screen designed in LTR **and** RTL, light **and** dark.
4. Errors and empty states designed as carefully as success states.
5. Windows 11 native feel (Mica window material, proper title bar, snap layouts).
6. Keyboard friendly; accessible contrast.

### Typography (design board v0.2)
- UI Latin: **Geist** (Inter dropped — too common in AI products)
- UI Arabic: **Readex Pro** (primary RTL language; IBM Plex Sans Arabic rejected — cramped and too small next to Geist)
- UI Persian (later): **Vazirmatn**
- Code: **Geist Mono**
(All free, open licenses.)

### Theme default
- **Light (Surface) is the default.** Dark (Ocean) is optional and was made calmer in v0.2 (no neon, no navy).

### Colors (design board v0.2)
- Surface (light): Ice `#F4F7FA` · Snow `#FFFFFF` · Frost `#E7EEF4` · Rime `#D6E0E8` · Abyss ink `#0B1620` · Slate `#4A5866` · **Plume `#0F6E8C`** · Plume mist `#DDF0F6`
- Ocean (dark): Deep `#0F1317` · Trench `#161B21` · Current `#1D242C` · Ridge `#2A333D` · Moonlight `#E9EDF0` · Mist `#A1ABB5` · **Plume ice `#9CCBDA`** · Ice depth `#1E2B31`

### Logo (decided)
**A · Cracked Epsilon**: the moon disc with the Greek Ε (Ἐγκέλαδος) cut into it like the tiger-stripe cracks. Still to do: test at 16 px in the Windows taskbar.

### Motion
- Signature visual = **the cracks**: [design/enceladus-scene.js](design/enceladus-scene.js). A real 3D-shaded moon whose whole surface is cracked into large plates like dried desert mud (one crack system only — no tiger-stripe grooves, no fine cracks, nothing competing); light from the ocean glows through every crack in two slow out-of-phase waves (strongest on the night side); while working, thin vapor curtains rise from vents on the cracks near the top. **Status: closed (2026-10-09).** Startup cost ~0.5 s (rendered once); per frame it is only a few image draws plus vapor. Two states: **Resting** (soft glow, no vapor) and **Working** (brighter cracks, vapor erupts) via `setActive()`; in the app, Working = the agent is busy. Minimal, premium, light on resources (moon drawn once; each frame = 4 glow images + ~60 beams + a few hundred particles; pauses off screen). Dark version for the website hero and launch; light version for welcome and empty states.
- In-app "working" indicator: small CSS jets (approved).
- No logo splash animation (sideways spray read as speed lines — rejected).
- States: Thinking (mist breathes) → Working (jets) → Done (jets stop, result appears).
- Respects Windows "reduce motion".
- Signals: Safe `#2E8B57` · Careful `#C27A0A` · Risky `#C03A2B` (always with icon + word)

Design board: https://claude.ai/artifact/F2LUhXGzDe1ZFK8ohYy2rw

### Screens
1. Welcome / sign in / invite code
2. Onboarding first task
3. Home — "What do you want to make?"
4. Work view — chat + plan + live preview (+ "Look beneath" panel)
5. Permission prompt (🟢🟡🔴)
6. Rewind timeline
7. Project note ("What I know")
8. Connections gallery
9. Settings (simple) + Advanced (own API key, etc.)
10. Error / offline / energy-empty states

### Design process
1. **Design board** (colors, fonts, plume motion, Home + Work mockups, light/dark, LTR/RTL) → user reviews.
2. Full design system (tokens, components).
3. All screens.
4. Build.

---

## 8. Right-to-left: done properly

- Whole UI mirrors with `dir="rtl"` (logical CSS properties only: `margin-inline-start`, never `margin-left`).
- **Model output:** each paragraph gets its own direction automatically (`dir="auto"`), so a Persian sentence and an English sentence display correctly next to each other.
- **Code blocks, file paths, terminal output: always left-to-right**, even in an RTL chat.
- English words, numbers and code inside Persian sentences are isolated so punctuation doesn't jump around.
- Digits setting: Arabic-Indic (٣٤٥), Latin (345), and later Persian (۳۴۵). These are different characters, so never mix Arabic and Persian digits.
- **Test before launch:** 50 real tasks in Arabic (main target).
- Icons with direction (arrows, back, send) flip; icons without direction (play, check) don't.
- Promote RTL as a headline feature only if the Arabic test passes.

---

## 9. Technology

| Part | Choice | Why |
|---|---|---|
| App shell | **Electron** | Same rendering on Windows and (later) Mac; mature; Mica support. |
| UI | **React + TypeScript + Vite** | Fast, huge ecosystem. |
| Styling | CSS variables (design tokens) + logical properties | Themes + RTL for free. |
| Agent engine | **Separate headless package** (`agent-core`) | Same brain later powers the CLI. |
| Terminal | `node-pty` | Real Windows terminal (PowerShell/cmd). |
| Connections | Official MCP TypeScript SDK | Standard. |
| Rewind | Hidden snapshot store (separate Git directory) | Never touches the user's own Git. |
| Live preview | Built-in browser view inside the app | Cheap; runs on the user's PC. |
| Local data | SQLite | Chats, settings, history. |
| API keys | Windows encrypted storage (Electron `safeStorage`) | Never stored in plain text. |
| Updates | Auto-update from GitHub Releases | Ship fixes weekly. |
| Signing | SignPath Foundation via GitHub Actions | Free for open source. |
| Website (later) | Astro or Next.js, static | Fast, great for launch pages. |

### Repo layout (monorepo)
```
enceladus/
  packages/
    agent-core/     # brain: model calls, tools, safety net, rewind
    ui/             # design system: tokens, components (shared app + website)
  apps/
    desktop/        # Electron app
    website/        # launch site (phase 6)
  docs/
```

### What the server team must provide (not our job, but we depend on it)
- Accounts + invite codes
- Daily quota per user (feeds the energy bar)
- Model API (streaming, tool calling)
- Status endpoint (for "service down" screen)

---

## 10. Website (phase 6)

Purpose: launch, explain, download. No chat.

Sections:
1. Hero — one sentence, moon visual, **Request invite / Download**
2. "No jargon" — before/after (other agents vs Enceladus)
3. Feature stories — Set it up for you · Rewind · Live preview · Your language
4. Real recorded agent runs (proof without installing)
5. Privacy — "We never train on your data." · Open source
6. FAQ
7. Footer

Also LTR + RTL, light + dark.

---

## 11. Roadmap

| Phase | Goal | Done when |
|---|---|---|
| 0 — Foundations | Design board, repo, SignPath application | User approves design direction |
| 1 — Design system + app shell | Tokens, components, window, themes, RTL | Empty app looks premium in all 4 modes — **in progress**: npm-workspaces monorepo, `packages/ui` (tokens, base, 15 components: Button, IconButton, Tag, StatusIcon, TextField, Switch, Segmented, Composer, Message, PlanCard, PermissionPrompt, RewindTimeline, EnergyBar, Dialog, Toast) + gallery (`npm run gallery`). **Done:** Electron 44 shell (`apps/desktop`, `npm run app`): native Windows title bar buttons, secure window (sandbox, context isolation, CSP in builds), settings saved to %APPDATA%\Enceladus (theme light/dark/system, language en/ar), real Home screen, settings dialog. |
| 2 — Agent core | Model calls, files, terminal, Connections | Agent completes basic coding tasks — **in progress**: Work view + demo agent on the event contract (`apps/desktop/renderer/src/agent/types.ts`); `packages/agent-core` provider layer (OpenAI-compatible + Anthropic, streaming, tool calls, tested); "Use your own model" with DPAPI-encrypted keys. Waiting on the model team for URL/key/tool-calling (see `docs/model-integration.md`). **Done:** agent loop, file/terminal tools, risk levels, Rewind (no Git needed), folder protection, task folders in Documents\Enceladus — tested with 11 unit tests and end-to-end in the real app against a scripted local model. **Not yet tested with a real model** (no key available). Next: live preview, choosing an existing folder, persisting tasks across restarts, Connections (MCP). Packaging note: main process imports .ts via Node type stripping, which does not work inside node_modules — bundle the main process when packaging. |
| 3 — Safety net | Plan, self-check, permissions, Rewind | Beginner can't lose work |
| 4 — Beginner features | Home, onboarding, set-it-up, preview, Fix it, project note | First task < 2 min |
| 5 — Beta polish | Errors, updates, signing, crash reports, RTL test | Invite-only beta ships |
| 6 — Website | Launch site | Live |

---

## 12. Success measures (beta)

- First-task success rate (target: very high — this is the #1 number)
- Time to first success (< 2 min)
- Users who return on day 7
- Rewind usage (high = people trust it; very high = the model breaks things too often)
- RTL task success rate

---

## 13. Risks & open items

| Risk | Plan |
|---|---|
| Model fails beginners | Safety net (section 5) + measure first-task success |
| Free service abused | Accounts + invite-only + quotas from day one |
| Antivirus flags the app | Sign every build from the start, not at the end |
| SignPath rejects or delays | Apply in phase 0; backup: Azure Trusted Signing (~$10/month) |
| RTL promised but weak | 50-task test before promoting it |
| "Enceladus" name/trademark conflict | Check before the website launch |
| User PCs missing the Microsoft Visual C++ runtime (seen on our own dev PC) | Installer must bundle or check for the VC++ Redistributable before launch |
| Some networks can't reach Microsoft download servers (seen on our dev PC) | Never depend on Microsoft-hosted downloads at install time; ship what we need inside the installer |
| Server team not ready | Build against a fake/BYOK model first; switch later |
