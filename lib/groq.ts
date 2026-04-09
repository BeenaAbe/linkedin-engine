// LLM client — supports Groq direct or OpenRouter (via PROVIDER env var)
// Both use OpenAI-compatible API, so we just swap base URL + key + model

const PROVIDER = (process.env.LLM_PROVIDER || "groq").toLowerCase();

const PROVIDER_CONFIG = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: () => process.env.GROQ_API_KEY,
    model: "openai/gpt-oss-120b",
    extraHeaders: {} as Record<string, string>,
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: () => process.env.OPENROUTER_API_KEY,
    model: "openai/gpt-oss-120b",
    extraHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "LinkedIn Agent",
    } as Record<string, string>,
  },
} as const;

interface CompletionOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  // Optional per-call model override. Use to route specific agents to a
  // different model (e.g. writer → Claude for prose quality) while the rest
  // stay on the provider default.
  model?: string;
}

export async function complete({
  systemPrompt,
  userPrompt,
  temperature = 0.5,
  maxTokens = 3000,
  jsonMode = false,
  model,
}: CompletionOptions): Promise<string> {
  const config = PROVIDER_CONFIG[PROVIDER as keyof typeof PROVIDER_CONFIG] || PROVIDER_CONFIG.groq;
  const apiKey = config.apiKey();

  if (!apiKey) {
    throw new Error(`Missing API key for provider: ${PROVIDER}`);
  }

  const selectedModel = model || config.model;

  const body: Record<string, unknown> = {
    model: selectedModel,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  // For OpenRouter + a Groq-hosted model, force routing through Groq for speed.
  // Skip the override for Anthropic/OpenAI direct models that Groq doesn't host.
  if (PROVIDER === "openrouter" && !selectedModel.startsWith("anthropic/")) {
    body.provider = { order: ["groq"], allow_fallbacks: true };
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...config.extraHeaders,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
