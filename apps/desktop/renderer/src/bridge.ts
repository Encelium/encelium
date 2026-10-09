export type ThemeSetting = "light" | "dark" | "system";
export type Language = "en" | "ar";
export type EffectiveTheme = "light" | "dark";

export interface Settings {
  theme: ThemeSetting;
  language: Language;
  effectiveTheme: EffectiveTheme;
}

export interface ProviderOption { id: string; name: string; needsKey: boolean; keyUrl: string | null; local: boolean }
export type ModelState = { mode: "enceladus" } | { mode: "own"; presetId: string; baseUrl: string | null; model: string; hasKey: boolean };
export interface ModelInput { presetId: string; baseUrl?: string; apiKey?: string; model?: string }
export type ModelFailure = "no-network" | "bad-key" | "not-found" | "rate-limited" | "server" | "bad-response" | "bad-address" | "no-key" | "no-model" | "no-encryption" | "unknown-provider";
export type TestResult = { ok: true; models: string[] } | { ok: false; reason: ModelFailure };

export interface Bridge {
  getSettings(): Promise<Settings>;
  setSettings(patch: Partial<Pick<Settings, "theme" | "language">>): Promise<Settings>;
  onEffectiveTheme(callback: (theme: EffectiveTheme) => void): () => void;
  models: {
    presets(): Promise<ProviderOption[]>;
    get(): Promise<ModelState>;
    test(input: ModelInput): Promise<TestResult>;
    save(input: ModelInput): Promise<{ ok: true } | { ok: false; reason: ModelFailure }>;
    reset(): Promise<{ ok: true }>;
  };
}

declare global {
  interface Window { enceladus?: Bridge }
}

// Outside Electron (e.g. opening the renderer in a normal browser while designing),
// fall back to a stand-in that keeps settings in localStorage.
function browserFallback(): Bridge {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const effective = (t: ThemeSetting): EffectiveTheme => (t === "system" ? (media.matches ? "dark" : "light") : t);
  const read = (): Omit<Settings, "effectiveTheme"> => {
    try {
      const s = JSON.parse(localStorage.getItem("enceladus.settings") ?? "{}");
      return { theme: s.theme ?? "light", language: s.language ?? (navigator.language.startsWith("ar") ? "ar" : "en") };
    } catch {
      return { theme: "light", language: "en" };
    }
  };
  return {
    async getSettings() { const s = read(); return { ...s, effectiveTheme: effective(s.theme) }; },
    async setSettings(patch) {
      const s = { ...read(), ...patch };
      try { localStorage.setItem("enceladus.settings", JSON.stringify(s)); } catch { /* storage blocked: keep in memory only */ }
      return { ...s, effectiveTheme: effective(s.theme) };
    },
    onEffectiveTheme(callback) {
      const handler = () => callback(effective(read().theme));
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    },
    // Design-time stand-in only: no network, keys are never stored. "bad" as a key simulates a wrong key.
    models: (() => {
      let state: ModelState = { mode: "enceladus" };
      const wait = () => new Promise((r) => setTimeout(r, 600));
      return {
        async presets() {
          return [
            { id: "openai", name: "OpenAI", needsKey: true, keyUrl: "https://platform.openai.com/api-keys", local: false },
            { id: "anthropic", name: "Anthropic (Claude)", needsKey: true, keyUrl: "https://console.anthropic.com/settings/keys", local: false },
            { id: "gemini", name: "Google Gemini", needsKey: true, keyUrl: "https://aistudio.google.com/apikey", local: false },
            { id: "openrouter", name: "OpenRouter", needsKey: true, keyUrl: "https://openrouter.ai/keys", local: false },
            { id: "ollama", name: "Ollama", needsKey: false, keyUrl: null, local: true },
          ];
        },
        async get() { return state; },
        async test(input) { await wait(); return input.apiKey === "bad" ? { ok: false, reason: "bad-key" } : { ok: true, models: ["model-large", "model-small"] }; },
        async save(input) { await wait(); state = { mode: "own", presetId: input.presetId, baseUrl: input.baseUrl ?? null, model: input.model ?? "", hasKey: !!input.apiKey }; return { ok: true }; },
        async reset() { state = { mode: "enceladus" }; return { ok: true }; },
      };
    })(),
  };
}

export const bridge: Bridge = window.enceladus ?? browserFallback();
