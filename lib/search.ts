// Thin wrapper around Tavily's search API.
// Single function: searchWeb(query) → array of {title, url, snippet}.
// Designed so a future swap to Google PSE / Serper / Brave is just a new
// implementation of the same SearchResult contract.

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

// Fetch a single URL and return a SearchResult shape so it slots into the
// same pipeline as Tavily results. Strips HTML, scripts, styles. Returns null
// on any failure (network, non-2xx, parse error) — caller decides how to handle.
export async function fetchUrl(url: string, maxChars = 1500): Promise<SearchResult | null> {
  try {
    const response = await fetch(url, {
      headers: {
        // Some sites block default fetch UAs. Use a generic browser UA.
        "User-Agent": "Mozilla/5.0 (compatible; LinkedInAgent/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const html = await response.text();

    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    // Strip script/style/nav blocks, then strip remaining tags, collapse whitespace.
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

    return {
      title,
      url,
      snippet: cleaned.slice(0, maxChars),
    };
  } catch (err) {
    console.warn(`[fetchUrl] ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

interface TavilyResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
  }>;
}

const TAVILY_ENDPOINT = "https://api.tavily.com/search";

export async function searchWeb(query: string, maxResults = 6): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    // No key configured — caller should handle gracefully (memory-only research).
    throw new Error("TAVILY_API_KEY is not set");
  }

  const response = await fetch(TAVILY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      max_results: maxResults,
      include_answer: false,
      include_raw_content: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tavily ${response.status}: ${text}`);
  }

  const data: TavilyResponse = await response.json();
  return (data.results || [])
    .filter((r) => r.url && r.title)
    .map((r) => ({
      title: (r.title || "").trim(),
      url: (r.url || "").trim(),
      snippet: (r.content || "").trim(),
    }));
}
