export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface RouteInfo {
  origin?: string;
  destination: string;
  travel_mode?: string;
  maps_url: string;
}

export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  model_used?: string;
  search_query?: string;
  search_results?: SearchResult[];
  route_info?: RouteInfo;
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

export interface StorageStatus {
  used_bytes: number;
  max_bytes: number;
  used_percent: number;
  used_mb: number;
  max_mb: number;
  warning_80: boolean;
  critical_90: boolean;
  purged?: boolean;
  message: string;
}

export interface ChatResponse {
  response: string;
  model_used: string;
  cached: boolean;
  latency_ms: number;
  search_query?: string;
  search_results?: SearchResult[];
  storage_status?: StorageStatus;
  route_info?: RouteInfo;
}

export interface WorkspaceMember {
  id: string;
  email: string;
  name: string;
  role: "owner" | "member";
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  members: WorkspaceMember[];
  created_at: string;
}

export interface WorkspaceMessage {
  id: string;
  workspace_id: string;
  sender_id: string;
  sender_name: string;
  sender_email: string;
  content: string;
  timestamp: string;
  model_used?: string;
  is_ai?: boolean;
}
