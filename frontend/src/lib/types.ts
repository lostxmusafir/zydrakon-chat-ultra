export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  model_used?: string;
  search_query?: string;
  search_results?: SearchResult[];
}

export interface Session {
  id: string;
  created_at: string;
}

export interface RateLimits {
  rpm_limit: number;
  rpm_remaining: number;
  daily_limit: number;
  daily_remaining: number;
}

export interface ChatResponse {
  response: string;
  model_used: string;
  cached: boolean;
  latency_ms: number;
  search_query?: string;
  search_results?: SearchResult[];
}
