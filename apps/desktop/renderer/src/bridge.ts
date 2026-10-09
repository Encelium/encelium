export type ThemeSetting = "light" | "dark" | "system";
export type Language = "en" | "ar";
export type EffectiveTheme = "light" | "dark";

export interface Settings {
  theme: ThemeSetting;
  language: Language;
  effectiveTheme: EffectiveTheme;
}

export interface Bridge {
  getSettings(): Promise<Settings>;
  setSettings(patch: Partial<Pick<Settings, "theme" | "language">>): Promise<Settings>;
  onEffectiveTheme(callback: (theme: EffectiveTheme) => void): () => void;
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
  };
}

export const bridge: Bridge = window.enceladus ?? browserFallback();
