import { Session, Message, ChatResponse, RateLimits } from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

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
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${BACKEND_URL}${path}`;
    try {
      const response = await fetch(url, options);
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
      // Re-throw if it's already a formatted ApiError
      if (err instanceof ApiError) throw err;
      const msg = err instanceof Error ? err.message : "Network error. Make sure the backend server is running.";
      throw new Error(msg);
    }
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

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    const data = await this.request<{ messages: Message[] }>(`/api/sessions/${sessionId}/messages`);
    return data.messages;
  }

  async sendChatMessage(sessionId: string, message: string, model: string, thinking?: boolean): Promise<ChatResponse> {
    return this.request<ChatResponse>("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message, model, thinking }),
    });
  }

  async getRateLimits(sessionId: string): Promise<RateLimits> {
    return this.request<RateLimits>(`/api/chat/limits?session_id=${encodeURIComponent(sessionId)}`);
  }
}

export const api = new ApiClient();
export { BACKEND_URL };
