import { Session, Message, ChatResponse, RateLimits } from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

interface RequestErrorDetails {
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
}

export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(message: string, status?: number, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

class ApiClient {
  async refreshToken(): Promise<{ access_token: string; refresh_token: string }> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem("zydrakon_refresh_token") : null;
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem("zydrakon_token");
        localStorage.removeItem("zydrakon_refresh_token");
      }
      throw new Error("Refresh token expired or invalid");
    }
    const data = await res.json();
    if (typeof window !== 'undefined') {
      localStorage.setItem("zydrakon_token", data.access_token);
      localStorage.setItem("zydrakon_refresh_token", data.refresh_token);
    }
    return data;
  }

  private async request<T>(path: string, options?: RequestInit, isRetry = false): Promise<T> {
    const url = `${BACKEND_URL}${path}`;
    
    let token = typeof window !== 'undefined' ? localStorage.getItem("zydrakon_token") : null;
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string> || {})
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch(url, { ...options, headers, signal: controller.signal });
      clearTimeout(timeoutId);

      // Automatic Token Refresh Retry Interceptor on 401 Unauthorized
      if (response.status === 401 && !isRetry && !path.startsWith("/api/auth/login") && !path.startsWith("/api/auth/refresh")) {
        try {
          const refreshed = await this.refreshToken();
          if (refreshed && refreshed.access_token) {
            return this.request<T>(path, options, true);
          }
        } catch {
          // Refresh failed; clear tokens
          if (typeof window !== 'undefined') {
            localStorage.removeItem("zydrakon_token");
            localStorage.removeItem("zydrakon_refresh_token");
            localStorage.removeItem("zydrakon_user");
          }
        }
      }

      if (!response.ok) {
        let errorData: RequestErrorDetails;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP Error: ${response.status} ${response.statusText}` };
        }
        
        throw new ApiError(
          errorData.message || "Request failed",
          response.status,
          errorData.code,
          errorData.details
        );
      }
      return response.json() as Promise<T>;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof ApiError) throw err;
      const isAbort = err instanceof Error && err.name === "AbortError";
      const msg = isAbort
        ? "Backend request timed out. Please verify server is responding."
        : (err instanceof Error ? err.message : "Network error. Make sure the backend server is running.");
      throw new Error(msg);
    }
  }

  async login(credentials: { email: string; password: string }): Promise<{ access_token: string; refresh_token: string; token_type: string; user: any }> {
    const res = await this.request<{ access_token: string; refresh_token: string; token_type: string; user: any }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (typeof window !== 'undefined' && res.access_token) {
      localStorage.setItem("zydrakon_token", res.access_token);
      if (res.refresh_token) {
        localStorage.setItem("zydrakon_refresh_token", res.refresh_token);
      }
      if (res.user) {
        localStorage.setItem("zydrakon_user", JSON.stringify(res.user));
      }
    }
    return res;
  }

  async createSession(): Promise<Session> {
    return this.request<Session>("/api/sessions", {
      method: "POST",
    });
  }

  async listSessions(): Promise<Session[]> {
    const data = await this.request<{ sessions: Session[] }>("/api/sessions");
    return data.sessions;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.request(`/api/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  async deleteAllSessions(): Promise<void> {
    await this.request("/api/sessions", {
      method: "DELETE",
    });
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    const data = await this.request<{ messages: Message[] }>(`/api/sessions/${sessionId}/messages`);
    return data.messages;
  }

  async sendChatMessage(sessionId: string, message: string, model: string, thinking?: boolean, agentSystemPrompt?: string): Promise<ChatResponse> {
    return this.request<ChatResponse>("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        session_id: sessionId, 
        message, 
        model, 
        thinking,
        agent_system_prompt: agentSystemPrompt || undefined
      }),
    });
  }

  async getRateLimits(sessionId: string): Promise<RateLimits> {
    return this.request<RateLimits>(`/api/chat/limits?session_id=${encodeURIComponent(sessionId)}`);
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });
  }

  async getAdminUsers(): Promise<any[]> {
    return this.request<any[]>("/api/admin/users");
  }

  async createAdminUser(user: { email: string; name: string; password: string; role?: string; tier?: string }): Promise<any> {
    return this.request<any>("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
  }

  async getAdminLogs(): Promise<any[]> {
    return this.request<any[]>("/api/admin/logs");
  }

  async replayMessage(sessionId: string, messageId: string, model?: string, thinking?: boolean): Promise<ChatResponse> {
    return this.request<ChatResponse>("/api/chat/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        message_id: messageId,
        model,
        thinking
      }),
    });
  }

  async branchSession(sessionId: string, messageId: string): Promise<Session> {
    return this.request<Session>("/api/sessions/branch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        message_id: messageId
      }),
    });
  }

  async proveIt(sessionId: string, messageId: string, model?: string): Promise<ChatResponse> {
    return this.request<ChatResponse>("/api/chat/prove-it", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        message_id: messageId,
        model
      }),
    });
  }
}

export const api = new ApiClient();
export { BACKEND_URL };
