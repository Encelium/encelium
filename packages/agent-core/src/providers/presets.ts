// The providers offered in "Use your own model". Picking one fills in everything
// except the key, so the user only ever pastes a key (or nothing, for local models).
import type { Protocol } from "./types.ts";

export interface ProviderPreset {
  id: string;
  name: string;
  protocol: Protocol;
  baseUrl: string;
  needsKey: boolean;
  /** Where the user creates a key. Shown as "Where do I get a key?". */
  keyUrl?: string;
  /** Runs on the user's own computer (no key, no internet needed). */
  local?: boolean;
  usageInStream?: boolean;
  /** Suggested model when the list can't be fetched. */
  suggestedModel?: string;
}

export const ENCELADUS_PRESET: ProviderPreset = {
  id: "enceladus",
  name: "Enceladus",
  protocol: "openai",
  baseUrl: "", // filled in when the model team gives us the URL (docs/model-integration.md)
  needsKey: true,
  usageInStream: true,
};

export const PRESETS: ProviderPreset[] = [
  { id: "openai", name: "OpenAI", protocol: "openai", baseUrl: "https://api.openai.com/v1", needsKey: true, keyUrl: "https://platform.openai.com/api-keys", usageInStream: true },
  { id: "anthropic", name: "Anthropic (Claude)", protocol: "anthropic", baseUrl: "https://api.anthropic.com", needsKey: true, keyUrl: "https://console.anthropic.com/settings/keys" },
  { id: "gemini", name: "Google Gemini", protocol: "openai", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", needsKey: true, keyUrl: "https://aistudio.google.com/apikey" },
  { id: "openrouter", name: "OpenRouter", protocol: "openai", baseUrl: "https://openrouter.ai/api/v1", needsKey: true, keyUrl: "https://openrouter.ai/keys", usageInStream: true },
  { id: "deepseek", name: "DeepSeek", protocol: "openai", baseUrl: "https://api.deepseek.com/v1", needsKey: true, keyUrl: "https://platform.deepseek.com/api_keys", usageInStream: true },
  { id: "groq", name: "Groq", protocol: "openai", baseUrl: "https://api.groq.com/openai/v1", needsKey: true, keyUrl: "https://console.groq.com/keys" },
  { id: "ollama", name: "Ollama", protocol: "openai", baseUrl: "http://localhost:11434/v1", needsKey: false, local: true },
  { id: "lmstudio", name: "LM Studio", protocol: "openai", baseUrl: "http://localhost:1234/v1", needsKey: false, local: true },
];

/** "Custom" = any OpenAI-compatible server: the user supplies the address too. */
export const CUSTOM_PRESET_ID = "custom";
