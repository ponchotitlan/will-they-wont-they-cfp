// ─── Vendor / model catalogue ─────────────────────────────────────────────────

export const PROVIDERS = [
  {
    id: "anthropic",
    label: "Anthropic",
    icon: "🔷",
    keyHint: "sk-ant-…",
    keysUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "openai",
    label: "OpenAI",
    icon: "🟢",
    keyHint: "sk-proj-…",
    keysUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    icon: "🔴",
    keyHint: "AIza…",
    keysUrl: "https://aistudio.google.com/apikey",
  },
];

export const MODELS = {
  anthropic: [
    {
      id: "claude-opus-4-6",
      label: "Claude Opus 4.6",
      desc: "Most intelligent · best for complex evaluation",
    },
    {
      id: "claude-sonnet-4-6",
      label: "Claude Sonnet 4.6",
      desc: "Speed + intelligence · recommended",
    },
    {
      id: "claude-haiku-4-5-20251001",
      label: "Claude Haiku 4.5",
      desc: "Fastest & cheapest · good for quick checks",
    },
  ],
  openai: [
    {
      id: "gpt-5.4",
      label: "GPT-5.4",
      desc: "Best intelligence · agentic, coding & professional workflows",
    },
    {
      id: "gpt-5-mini",
      label: "GPT-5 mini",
      desc: "Near-frontier intelligence · cost-sensitive, low-latency workloads",
    },
    {
      id: "gpt-4o",
      label: "GPT-4o",
      desc: "Previous flagship · strong multimodal capabilities",
    },
    {
      id: "gpt-4o-mini",
      label: "GPT-4o mini",
      desc: "Budget option · fast and affordable",
    },
  ],
  gemini: [
    {
      id: "gemini-2.5-pro",
      label: "Gemini 2.5 Pro",
      desc: "Most advanced · deep reasoning, coding & long context",
    },
    {
      id: "gemini-2.5-flash",
      label: "Gemini 2.5 Flash",
      desc: "Best cost-effectiveness · reasoning + high-volume · recommended",
    },
    {
      id: "gemini-2.5-flash-lite",
      label: "Gemini 2.5 Flash-Lite",
      desc: "Fastest & cheapest · optimised for low latency",
    },
  ],
};

/** Default model ID for each provider. */
export const DEFAULT_MODELS = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-5.4",
  gemini: "gemini-2.5-flash",
};
