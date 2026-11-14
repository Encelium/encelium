# Connecting the Encelium model to the desktop app

**For:** the person running the Encelium model servers.
**From:** the desktop app team.
**Goal:** the app talks to our model out of the box, and users can switch to another model (their own key) with almost no setup.

---

## The one big request: speak the OpenAI-compatible format

Please expose the model through an **OpenAI-compatible Chat Completions API** (`POST /v1/chat/completions`).

Why this matters:

- It's the de-facto standard. vLLM, SGLang, TGI, Ollama and LM Studio all serve it out of the box, so it's usually a configuration option, not new work.
- The app then uses **one** code path for our model and for most other providers: OpenAI, Google Gemini, OpenRouter, DeepSeek, Groq, and local models. Less code means fewer bugs.

If the format must differ, tell us early. It changes our work a lot.

---

## What we need from you (checklist)

### 1. Access
- [ ] **Base URL** for production, e.g. `https://api.example.com/v1`
- [ ] **Base URL for testing** (staging). We need it during development.
- [ ] **A test key** for the staging server.
- [ ] **How users authenticate in the beta.** Options, simplest first:
  - (a) one key per invited user, entered once (or delivered by an invite link)
  - (b) users sign in with an account and the app receives a token
  - Which one, and who builds the sign-in part?

### 2. Model details
- [ ] **Model ID(s)** to send in requests, e.g. `encelium-1`
- [ ] **Context window** (maximum tokens in + out per request)
- [ ] **Maximum output tokens** per response
- [ ] **Languages it handles well.** We especially need **Arabic** results.

### 3. Features the agent depends on (please confirm each)
- [ ] **Streaming** (`"stream": true`, server-sent events). Required, because users must see text appear as it's written.
- [ ] **Tool calling / function calling** in the OpenAI format (`tools`, `tool_choice`, `tool_calls` in responses). **Required.** Without it the model can't act as an agent: no reading files, running commands, or using connections. Please also tell us:
  - Can it call **several tools in one turn** (parallel tool calls)?
  - How reliable is it at producing **valid JSON arguments**? Even an informal success rate helps.
- [ ] **Image input** (vision). Needed for "make my site look like this screenshot". Nice to have.
- [ ] **Reasoning / thinking output**, if the model has it: how it's returned (separate field or tags), and whether we can turn it off.

### 4. Limits and usage (feeds the "Today's energy" bar)
- [ ] **Free-tier limits**: per minute, per day, per user.
- [ ] **How we learn a user's remaining quota**: a usage endpoint, or response headers (e.g. `x-ratelimit-remaining-*`)?
- [ ] **What happens at the limit**: HTTP `429`? With a `Retry-After` header?

### 5. Errors and status
- [ ] **Error format** (we expect the OpenAI style `{ "error": { "message", "type", "code" } }`)
- [ ] **A status/health endpoint**, so the app can say "The service is down, we're on it" instead of failing silently

### 6. Privacy (this goes on our website)
- [ ] Written confirmation that **user prompts and files are not used for training**
- [ ] **How long requests and logs are kept**, and where (country/region)

---

## How we'll test the connection

As soon as we have the staging URL and a test key, we run:

1. List models: `GET {base}/models`
2. A one-line streamed chat
3. A tool call (the model asks to read a file, and we send back the result)
4. The same three in Arabic

We'll send you the results, including any failures, with the exact request so you can reproduce them.

---

## For users who bring their own model

Users won't see any of the above. In the app it's one screen: *Settings → Advanced → Use your own model*. They pick a provider from a list (or "Custom"), paste a key, and press **Test**. Local models (Ollama, LM Studio) need no key at all. That only stays this simple because everything speaks the same format, which is why the request at the top matters so much.
