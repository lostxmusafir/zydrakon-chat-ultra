"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Send, 
  Database, 
  ShieldAlert, 
  Cpu, 
  Zap,
  Sparkles,
  ArrowRight,
  Clock,
  Sun,
  Moon,
  Paperclip,
  PanelLeftClose,
  PanelLeft,
  Globe,
  ExternalLink,
  Bot
} from "lucide-react";
import { Message, Session, RateLimits } from "@/lib/types";
import { api, ApiError } from "@/lib/api";
import dynamic from "next/dynamic";

const Mermaid = dynamic(() => import("../components/Mermaid"), {
  ssr: false,
});
import { LoginModal } from "@/components/LoginModal";
import { LogOut } from "lucide-react";
import { AgentsPanel, AGENTS } from "@/components/AgentsPanel";
import { AgentLoader } from "@/components/AgentLoader";

const FREE_MODELS = [
  { id: "zydrakon-free", name: "Zydrakon AI (Free)" },
  { id: "zhipu-free", name: "Zydrakon AI (Gold)" },
  { id: "zydrakon-premium", name: "Zydrakon AI Premium" }
];

// Helper Component for Markdown Code Block
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-[var(--border-color)] shadow-sm bg-[var(--bg-code-body)]">
      <div className="flex justify-between items-center bg-[var(--bg-code-header)] px-4 py-2 text-xs text-[var(--text-secondary)] font-mono border-b border-[var(--border-color)] select-none">
        <span>{language || "code"}</span>
        <button 
          onClick={handleCopy}
          className="hover:text-[var(--text-main)] transition-colors flex items-center gap-1 font-semibold"
        >
          {copied ? "Copied!" : "Copy code"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-xs md:text-sm leading-relaxed scrollbar-thin text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<{ message: string; retryAfter?: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState("zydrakon-free");
  const [limits, setLimits] = useState<RateLimits | null>(null);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  
  // Layout states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Agents states
  const [selectedAgentId, setSelectedAgentId] = useState<string>("general-assistant");
  const [showAgentsPanel, setShowAgentsPanel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derived agent object
  const activeAgent = AGENTS.find(a => a.id === selectedAgentId) || AGENTS[AGENTS.length - 1];

  // Initialize: Load sessions, configure theme, restore agent
  useEffect(() => {
    loadSessions();
    
    // Theme setup
    const storedTheme = localStorage.getItem("zydrakon_theme");
    if (storedTheme === "dark" || (!storedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }

    // Check Auth
    const token = localStorage.getItem("zydrakon_token");
    if (token) {
      setIsAuthenticated(true);
    }
    setIsAuthChecking(false);

    // Restore saved agent selection
    const savedAgent = localStorage.getItem("zydrakon_agent");
    if (savedAgent && AGENTS.some(a => a.id === savedAgent)) {
      setSelectedAgentId(savedAgent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync: When active session changes, load messages & limits
  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
      loadLimits(activeSessionId);
      setRateLimitError(null);
      setError(null);
    }
  }, [activeSessionId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Adjust textarea height when typing
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }, [inputText]);

  // Auto-focus input when AI finishes responding, when switching sessions, or when starting new chat
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated, activeSessionId, messages.length]);

  // Advance loading phase while AI is responding
  useEffect(() => {
    if (!isLoading) {
      setLoadingPhase(0);
      return;
    }
    const maxPhase = thinkingMode ? 2 : 1;
    const interval = setInterval(() => {
      setLoadingPhase(prev => (prev < maxPhase ? prev + 1 : prev));
    }, 2200);
    return () => clearInterval(interval);
  }, [isLoading, thinkingMode]);

  const toggleTheme = () => {
    if (isDarkMode) {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
      localStorage.setItem("zydrakon_theme", "light");
    } else {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
      localStorage.setItem("zydrakon_theme", "dark");
    }
  };

  const loadSessions = async () => {
    try {
      const data = await api.listSessions();
      setSessions(data);
      
      const storedActive = localStorage.getItem("zydrakon_active_session");
      if (storedActive && data.some(s => s.id === storedActive)) {
        setActiveSessionId(storedActive);
      } else if (data.length > 0) {
        setActiveSessionId(data[0].id);
      } else {
        await createNewSession();
      }
    } catch (err: any) {
      if (err.status === 401) {
        handleLogout();
        return;
      }
      const msg = err instanceof Error ? err.message : "Failed to load sessions";
      setError(msg);
    }
  };

  const createNewSession = async () => {
    try {
      const newSession = await api.createSession();
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      localStorage.setItem("zydrakon_active_session", newSession.id);
      setMessages([]);
      setRateLimitError(null);
      setInputText("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      setTimeout(() => textareaRef.current?.focus(), 60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create new session";
      setError(msg);
    }
  };

  const deleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this session?")) return;
    
    try {
      await api.deleteSession(sessionId);
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(remainingSessions);
      
      if (activeSessionId === sessionId) {
        if (remainingSessions.length > 0) {
          setActiveSessionId(remainingSessions[0].id);
          localStorage.setItem("zydrakon_active_session", remainingSessions[0].id);
        } else {
          await createNewSession();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete session";
      setError(msg);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const msgs = await api.getSessionMessages(sessionId);
      setMessages(msgs);
      setTimeout(() => textareaRef.current?.focus(), 60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load messages";
      setError(msg);
    }
  };

  const loadLimits = async (sessionId: string) => {
    try {
      const rateLimits = await api.getRateLimits(sessionId);
      setLimits(rateLimits);
    } catch (err) {
      console.error("Failed to load rate limits", err);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading || !activeSessionId) return;

    const userText = inputText.trim();
    setInputText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setError(null);
    setRateLimitError(null);
    setIsLoading(true);

    const userMessage: Message = {
      role: "user",
      content: userText,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const agentPrompt = activeAgent.systemPrompt || undefined;
      const response = await api.sendChatMessage(activeSessionId, userText, selectedModel, thinkingMode, agentPrompt);
      
      const assistantMessage: Message = {
        role: "assistant",
        content: response.response,
        timestamp: new Date().toISOString(),
        model_used: response.model_used,
        search_query: response.search_query,
        search_results: response.search_results
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      await loadLimits(activeSessionId);
    } catch (err: any) {
      if (err.status === 401) {
        handleLogout();
        return;
      }
      if (err instanceof ApiError && err.status === 429) {
        setRateLimitError({
          message: err.message,
          retryAfter: err.details?.retry_after as string | undefined
        });
      } else {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred";
        setError(msg);
      }
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 60);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("zydrakon_token");
    localStorage.removeItem("zydrakon_active_session");
    setIsAuthenticated(false);
    setSessions([]);
    setMessages([]);
    setActiveSessionId(null);
  };

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    localStorage.setItem("zydrakon_agent", agentId);
    setTimeout(() => textareaRef.current?.focus(), 60);
  };

  const handleToggleThinkingMode = () => {
    const nextVal = !thinkingMode;
    setThinkingMode(nextVal);
    if (nextVal && selectedModel === "zydrakon-free") {
      setSelectedModel("zhipu-free"); // Switch to Gold automatically
    }
    setTimeout(() => textareaRef.current?.focus(), 60);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter key submits the text (without Shift), Shift+Enter adds newline
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!isLoading && inputText.trim()) {
        handleSend();
      }
    }
  };

  const selectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    localStorage.setItem("zydrakon_active_session", sessionId);
  };

  // Helper parser for markdown tags
  const parseInlineText = (text: string) => {
    const tokens = text.split(/(\*\*[^*]+\*\*|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/g);
    return tokens.map((token, idx) => {
      if (token.startsWith("**") && token.endsWith("**")) {
        return <strong key={idx} className="font-semibold text-black dark:text-white">{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith("`") && token.endsWith("`")) {
        return (
          <code key={idx} className="bg-[#f1ede4] dark:bg-[#2e2e2a] border border-[var(--border-color)] text-[#cc5a37] dark:text-[#e26e4a] px-1.5 py-0.5 rounded font-mono text-xs md:text-sm">
            {token.slice(1, -1)}
          </code>
        );
      }
      if (token.startsWith("[") && token.includes("](") && token.endsWith(")")) {
        const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          const [, label, url] = linkMatch;
          return (
            <a 
              key={idx} 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[var(--accent-color)] hover:underline inline-flex items-center gap-0.5 font-medium"
            >
              {label}
            </a>
          );
        }
      }
      return token;
    });
  };

  const formatMessageContent = (content: string) => {
    let normalizedContent = content;
    // Auto-close unclosed markdown code blocks (e.g. if the LLM output got truncated)
    const occurrences = (normalizedContent.match(/```/g) || []).length;
    if (occurrences % 2 !== 0) {
      normalizedContent += "\n```";
    }
    const parts = normalizedContent.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const match = part.match(/```(\w*)([\s\S]*?)```/);
        const language = (match ? match[1] : "").trim().toLowerCase();
        const code = match ? match[2].trim() : part.slice(3, -3).trim();
        if (language === "mermaid") {
          return <Mermaid key={index} chart={code} isDarkMode={isDarkMode} />;
        }
        if (language === "svg" || code.trim().startsWith("<svg")) {
          return (
            <div 
              key={index}
              className="my-4 p-4 flex justify-center items-center overflow-x-auto select-none max-w-full"
            >
              <div 
                className="w-full flex justify-center max-w-full [&>svg]:max-w-full [&>svg]:h-auto select-none"
                dangerouslySetInnerHTML={{ __html: code }}
              />
            </div>
          );
        }
        return <CodeBlock key={index} code={code} language={language} />;
      }

      const lines = part.split("\n");
      const elements: React.ReactNode[] = [];
      let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
      let currentParagraph: string[] = [];
      let currentTable: string[][] | null = null;

      const flushParagraph = (key: string) => {
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={key} className="mb-4 text-slate-800 dark:text-slate-200 leading-relaxed text-sm md:text-md">
              {parseInlineText(currentParagraph.join(" "))}
            </p>
          );
          currentParagraph = [];
        }
      };

      const flushList = (key: string) => {
        if (currentList) {
          const ListTag = currentList.type === "ol" ? "ol" : "ul";
          const listClass = currentList.type === "ol" 
            ? "list-decimal pl-6 mb-4 space-y-1.5 text-slate-800 dark:text-slate-200 text-sm md:text-md" 
            : "list-disc pl-6 mb-4 space-y-1.5 text-slate-800 dark:text-slate-200 text-sm md:text-md";
          elements.push(
            <ListTag key={key} className={listClass}>
              {currentList.items.map((item, itemIdx) => (
                <li key={itemIdx}>{parseInlineText(item)}</li>
              ))}
            </ListTag>
          );
          currentList = null;
        }
      };

      const flushTable = (key: string) => {
        if (currentTable && currentTable.length > 0) {
          let headers: string[] = [];
          let rows: string[][] = [];
          
          if (currentTable.length >= 2 && currentTable[1].every(cell => /^:?-+:?$/.test(cell))) {
            headers = currentTable[0];
            rows = currentTable.slice(2);
          } else {
            headers = currentTable[0];
            rows = currentTable.slice(1);
          }

          rows = rows.filter(row => row.length > 0 && row.some(cell => cell !== ""));

          elements.push(
            <div key={key} className="my-4 overflow-x-auto rounded-xl border border-[var(--border-color)] shadow-sm bg-[var(--bg-sidebar)]">
              <table className="min-w-full divide-y divide-[var(--border-color)] text-left text-xs md:text-sm font-sans">
                <thead className="bg-slate-50 dark:bg-[#1a1a17] text-slate-800 dark:text-slate-200 font-semibold select-none">
                  <tr>
                    {headers.map((header, hIdx) => (
                      <th key={hIdx} className="px-4 py-3 border-b border-[var(--border-color)]">
                        {parseInlineText(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]/60 text-slate-700 dark:text-slate-300">
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-100/40 dark:hover:bg-[#252522]/40 transition-colors">
                      {Array.from({ length: headers.length }).map((_, cIdx) => (
                        <td key={cIdx} className="px-4 py-3 align-top whitespace-normal break-words">
                          {parseInlineText(row[cIdx] || "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          currentTable = null;
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // 1. Empty lines trigger flushes
        if (trimmed === "") {
          flushParagraph(`p-${i}`);
          flushList(`l-${i}`);
          flushTable(`t-${i}`);
          continue;
        }

        // 2. Table row detection
        const isTableRow = trimmed.startsWith("|") && trimmed.endsWith("|");
        if (isTableRow) {
          flushParagraph(`p-${i}`);
          flushList(`l-${i}`);
          
          const cells = trimmed
            .split("|")
            .slice(1, -1)
            .map(c => c.trim());
            
          if (!currentTable) {
            currentTable = [];
          }
          currentTable.push(cells);
          continue;
        } else {
          flushTable(`t-${i}`);
        }

        // 3. Headings
        const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
          flushParagraph(`p-${i}`);
          flushList(`l-${i}`);
          const level = headingMatch[1].length;
          const text = headingMatch[2];
          const headingClass = level === 1 ? "text-xl font-bold text-black dark:text-white mb-3 mt-5"
                             : level === 2 ? "text-lg font-bold text-black dark:text-white mb-2 mt-4"
                             : level === 3 ? "text-md font-bold text-black dark:text-white mb-2 mt-4"
                             : "text-sm font-bold text-black dark:text-white mb-1.5 mt-3";
          const HeadingTag = `h${level}` as any;
          elements.push(
            <HeadingTag key={`h-${i}`} className={headingClass}>
              {parseInlineText(text)}
            </HeadingTag>
          );
          continue;
        }

        // 4. Bullet points (Unordered)
        const ulMatch = line.match(/^[-*•]\s+(.*)$/);
        if (ulMatch) {
          flushParagraph(`p-${i}`);
          if (currentList && currentList.type !== "ul") {
            flushList(`l-${i}`);
          }
          if (!currentList) {
            currentList = { type: "ul", items: [] };
          }
          currentList.items.push(ulMatch[1]);
          continue;
        }

        // 5. Ordered list points (1. Item)
        const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (olMatch) {
          flushParagraph(`p-${i}`);
          if (currentList && currentList.type !== "ol") {
            flushList(`l-${i}`);
          }
          if (!currentList) {
            currentList = { type: "ol", items: [] };
          }
          currentList.items.push(olMatch[2]);
          continue;
        }

        // 6. Normal text line
        flushList(`l-${i}`);
        currentParagraph.push(line);
      }

      flushParagraph(`p-end`);
      flushList(`l-end`);
      flushTable(`t-end`);

      return <div key={index}>{elements}</div>;
    });
  };

  if (isAuthChecking) {
    return <div className="h-screen w-screen bg-[var(--bg-main)] flex items-center justify-center text-[var(--accent-color)] animate-pulse">Loading...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-200">
      
      {!isAuthenticated && (
        <LoginModal onSuccess={(token) => {
          setIsAuthenticated(true);
          loadSessions();
        }} />
      )}

      {/* 1. Collapsible Sidebar */}
      <aside 
        className={`flex-shrink-0 flex flex-col h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] transition-all duration-300 ease-in-out z-30 ${
          sidebarOpen ? "w-72" : "w-0 overflow-hidden border-r-0"
        }`}
      >
        <div className="w-72 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
            <span className="text-xs font-bold tracking-widest text-[var(--text-secondary)] uppercase">Zydrakon AI</span>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-slate-200 dark:hover:bg-[#32322e] hover:text-[var(--text-main)]"
              title="Close sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat + Agents Buttons */}
          <div className="p-4 space-y-2">
            <button
              onClick={createNewSession}
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] hover:bg-[#eae8e2] dark:hover:bg-[#2d2d2a] font-medium text-sm transition-colors text-[var(--text-main)] shadow-sm bg-[var(--bg-card)]"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[var(--accent-color)]" />
                New Chat
              </span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-sans text-[var(--text-secondary)] border border-[var(--border-color)] rounded bg-[var(--bg-sidebar)]">
                Ctrl K
              </kbd>
            </button>

            {/* Agents Button */}
            <button
              onClick={() => setShowAgentsPanel(true)}
              className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] hover:bg-[#eae8e2] dark:hover:bg-[#2d2d2a] font-medium text-sm transition-colors text-[var(--text-main)] shadow-sm bg-[var(--bg-card)] group"
            >
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4 transition-colors" style={{ color: activeAgent.color }} />
                Agents
              </span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: activeAgent.color }}
              >
                {activeAgent.avatarLetter}
              </span>
            </button>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto px-3 space-y-1">
            {sessions.map(s => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => selectSession(s.id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                    isActive 
                      ? "bg-[#eae8e2] dark:bg-[#2d2d2a] text-black dark:text-white font-medium" 
                      : "hover:bg-[#f1ede4] dark:hover:bg-[#252522] text-[var(--text-secondary)] hover:text-[var(--text-main)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <MessageSquare className="w-4 h-4 flex-shrink-0 text-slate-500" />
                    <span className="text-sm truncate">
                      {s.id.length > 10 ? `Session-${s.id.slice(0, 8)}` : s.id}
                    </span>
                  </div>
                  <button
                    onClick={(e) => deleteSession(e, s.id)}
                    className="p-1 rounded text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-[#3b3b38] transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

        </div>
      </aside>

      {/* 2. Main Window */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[var(--bg-main)]">
        {/* Navbar Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]/90 backdrop-blur z-20">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-slate-100 dark:hover:bg-[#252522] hover:text-[var(--text-main)] mr-2"
                title="Open sidebar"
              >
                <PanelLeft className="w-4.5 h-4.5" />
              </button>
            )}

            {/* Clean Model Chooser Link */}
            <div className="relative flex items-center gap-1 text-sm font-semibold text-[var(--text-secondary)]">
              <span>Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="appearance-none bg-transparent hover:text-[var(--text-main)] font-semibold py-1 pl-1 pr-6 cursor-pointer focus:outline-none focus:ring-0 text-[var(--accent-color)] font-mono text-xs md:text-sm"
              >
                {FREE_MODELS.map(m => {
                  const isDisabled = thinkingMode && m.id === "zydrakon-free";
                  return (
                    <option 
                      key={m.id} 
                      value={m.id} 
                      disabled={isDisabled}
                      className="bg-[var(--bg-main)] text-[var(--text-main)] font-sans disabled:opacity-40"
                    >
                      {m.name} {isDisabled ? " (Not supported for Deep Research)" : ""}
                    </option>
                  );
                })}
              </select>
              <Cpu className="w-3 h-3 text-[var(--text-secondary)] absolute right-0 top-2.5 pointer-events-none" />
            </div>

            {/* Active Agent Badge */}
            {activeAgent.id !== "general-assistant" && (() => {
              const ActiveAgentIcon = activeAgent.icon;
              return (
                <button
                  onClick={() => setShowAgentsPanel(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:opacity-80 cursor-pointer"
                  style={{
                    borderColor: `${activeAgent.color}40`,
                    color: activeAgent.color,
                    backgroundColor: `${activeAgent.color}10`,
                  }}
                  title={`Active agent: ${activeAgent.name}`}
                >
                  <ActiveAgentIcon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{activeAgent.name}</span>
                </button>
              );
            })()}
          </div>

          <div className="flex items-center gap-4">
            {/* Usage Indicator Badge */}
            {limits && (
              <div 
                className="text-[10px] font-mono text-[var(--text-secondary)] bg-[#f3f1eb] dark:bg-[#222220] border border-[var(--border-color)] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5"
                title={`RPM remaining: ${limits.rpm_remaining}/${limits.rpm_limit}`}
              >
                <Zap className="w-3.5 h-3.5 text-[var(--accent-color)] animate-pulse" />
                <span>API Usage: <strong className="text-[var(--text-main)]">{limits.daily_limit - limits.daily_remaining}</strong>/{limits.daily_limit}</span>
              </div>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[#eae8e2] dark:hover:bg-[#2d2d2a] hover:text-[var(--text-main)]"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Logout Button */}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Conversation Message Pane */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-8 scrollbar-thin">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {messages.length === 0 ? (
              // Claude-like central Welcoming screen
              <div className="flex flex-col items-center justify-center pt-20 pb-8 text-center space-y-6">
                <div className="relative">
                  <div className="p-5 bg-[#f3f1eb] dark:bg-[#22221f] border border-[var(--border-color)] rounded-2xl shadow-sm">
                    <Sparkles className="w-8 h-8 text-[var(--accent-color)]" />
                  </div>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-black dark:text-white font-sans max-w-lg">
                  How can I help you today?
                </h2>
                
                <p className="max-w-md mx-auto text-xs md:text-sm text-[var(--text-secondary)]">
                  Zydrakon AI is your premium intelligent assistant. Ask a question to get started.
                </p>

                {/* Central Input Box */}
                <div className="w-full max-w-xl pt-4">
                  <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-3 shadow-md focus-within:ring-2 focus-within:ring-[var(--accent-color)]/20 focus-within:border-[var(--accent-color)] transition-all">
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={2}
                      placeholder="Ask anything..."
                      className="w-full bg-transparent resize-none focus:outline-none text-[var(--text-main)] text-sm md:text-md placeholder-slate-400 min-h-[50px] max-h-[240px] pr-2"
                      disabled={isLoading}
                    />
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-color)]/50">
                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                        <button 
                          type="button" 
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#2e2e2a]"
                          title="Attach files (Mock)"
                        >
                          <Paperclip className="w-4 h-4 text-slate-500" />
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleToggleThinkingMode}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition-all ${
                            thinkingMode
                              ? "bg-[var(--accent-color)] text-white border-[var(--accent-color)] shadow-sm"
                              : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[#eae8e2] dark:hover:bg-[#2d2d2a]"
                          }`}
                        >
                          <Sparkles className={`w-3 h-3 ${thinkingMode ? "animate-pulse" : ""}`} />
                          <span>Deep Research {thinkingMode ? "ON" : "OFF"}</span>
                        </button>
                        
                        <span className="text-[10px] font-mono opacity-80 uppercase tracking-wider hidden sm:block">SQLite Duplicate Filter Active</span>
                      </div>
                      
                      <button
                        onClick={handleSend}
                        disabled={isLoading || !inputText.trim()}
                        className="p-2 rounded-xl text-white disabled:bg-slate-200 dark:disabled:bg-[#252522] disabled:text-slate-400 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Claude-style central prompts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl pt-8">
                  {[
                    "Write a Python script to sort a list using quicksort",
                    "Explain quantum computing in simple terms",
                    "What is SQLite database caching?",
                    "Draft a professional reply to request an extension"
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputText(prompt);
                        setTimeout(() => textareaRef.current?.focus(), 60);
                      }}
                      className="flex items-center justify-between text-left p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-color)]/40 rounded-xl hover:bg-[#eae8e2]/50 dark:hover:bg-[#252522]/50 text-xs md:text-sm text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-all shadow-sm"
                    >
                      <span className="line-clamp-2 pr-2 leading-relaxed">{prompt}</span>
                      <ArrowRight className="w-4 h-4 text-[var(--accent-color)] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Active Conversation Thread
              <>
                {messages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-4 animate-message ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {/* Avatar initial symbol — agent-colored */}
                      {!isUser && (
                        <div
                          className="w-8 h-8 rounded-full border text-[11px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm select-none"
                          style={{
                            borderColor: `${activeAgent.color}40`,
                            backgroundColor: `${activeAgent.color}12`,
                            color: activeAgent.color,
                          }}
                        >
                          {activeAgent.avatarLetter}
                        </div>
                      )}
                      
                      <div className={`flex flex-col max-w-[85%] ${isUser ? "items-end" : "items-start"} space-y-1.5`}>
                        {isUser ? (
                          // User message bubble box
                          <div className="bg-[var(--bg-user-msg)] text-[var(--text-main)] rounded-2xl px-5 py-3 border border-[var(--border-color)] shadow-sm">
                            <p className="whitespace-pre-line leading-relaxed text-sm md:text-md">
                              {msg.content}
                            </p>
                          </div>
                        ) : (
                          // Assistant message rendered plain text in clean sans-serif font (Claude/ChatGPT Style!)
                          <div className="font-sans text-[var(--text-main)] pr-4 w-full leading-relaxed text-sm md:text-md">
                            {msg.search_results && msg.search_results.length > 0 && (
                              <div className="mb-4 w-full">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] mb-2 select-none">
                                  <Globe className="w-3.5 h-3.5 text-[var(--accent-color)]" />
                                  <span>Sources ({msg.search_results.length})</span>
                                  {msg.search_query && (
                                    <span className="text-[10px] font-normal font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#22221f] border border-[var(--border-color)]">
                                      Search: &quot;{msg.search_query}&quot;
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {msg.search_results.map((src, idx) => {
                                    let hostname = "";
                                    try {
                                      hostname = new URL(src.url).hostname.replace("www.", "");
                                    } catch {
                                      hostname = "link";
                                    }
                                    return (
                                      <a
                                        key={idx}
                                        href={src.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={`${src.title}\n\n${src.snippet}`}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[#fdfcfb] dark:bg-[#1c1c1a] hover:bg-[#eae8e2] dark:hover:bg-[#2d2d2a] text-xs transition-all max-w-[200px] text-[var(--text-main)] group"
                                      >
                                        <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-[var(--accent-color)] shrink-0">
                                          {idx + 1}
                                        </span>
                                        <span className="truncate font-sans font-medium hover:underline flex-1">{hostname}</span>
                                        <ExternalLink className="w-3 h-3 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </a>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {formatMessageContent(msg.content)}
                          </div>
                        )}

                        {/* Metadata row */}
                        <div className="flex items-center gap-2.5 text-[9px] font-mono text-[var(--text-secondary)] select-none">
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      {/* User Avatar */}
                      {isUser && (
                        <div className="w-8 h-8 rounded-full border border-[var(--border-color)] bg-[var(--bg-sidebar)] text-[11px] font-bold text-[var(--text-secondary)] flex items-center justify-center flex-shrink-0 shadow-sm select-none">
                          U
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ═══ Premium Agent-Aware Loading Animation ═══ */}
                {isLoading && (() => {
                  const statusLabels: Record<string, string> = {
                    "software-dev-tutor": "Compiling knowledge...",
                    "science-tutor": "Running experiments...",
                    "biology-tutor": "Sequencing DNA...",
                    "microbiology-tutor": "Culturing samples...",
                    "project-manager": "Planning sprint...",
                    "product-owner": "Mapping roadmap...",
                    "deep-research": "Researching deeply...",
                    "ppt-maker": "Building slides...",
                    "general-assistant": "Thinking...",
                  };

                  return (
                    <div className="flex items-start gap-4 justify-start animate-message">
                      {/* Fluid Iridescent Orb Video Loader */}
                      <div className="relative flex-shrink-0 mt-0.5">
                        <AgentLoader isDarkMode={isDarkMode} color={activeAgent.color} size={52} />
                      </div>

                      <div className="flex flex-col gap-2.5 min-w-[260px] max-w-sm select-none">
                        {/* Agent name + animated dots */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: activeAgent.color }}>
                            {activeAgent.name}
                          </span>
                          <span className="flex gap-0.5">
                            {[0, 1, 2].map(i => (
                              <span key={i} className="w-1 h-1 rounded-full bounce-dot" style={{ backgroundColor: activeAgent.color, animationDelay: `${i * 0.15}s` }} />
                            ))}
                          </span>
                        </div>

                        {/* Status label */}
                        <div className="flex items-center gap-2 text-xs font-mono">
                          <span className="font-semibold transition-all duration-500" style={{ color: activeAgent.color }}>
                            {thinkingMode
                              ? loadingPhase === 0
                                ? '🔍 Searching the web...'
                                : loadingPhase === 1
                                ? '📖 Reading sources...'
                                : '🧠 Reasoning & composing...'
                              : statusLabels[activeAgent.id] || "Thinking..."}
                          </span>
                        </div>

                        {/* Deep Research phase pills */}
                        {thinkingMode && (
                          <div className="flex items-center gap-1.5">
                            {(['Search', 'Read', 'Reason'] as const).map((label, i) => (
                              <span
                                key={label}
                                className={`text-[9px] font-mono px-2 py-0.5 rounded-full border transition-all duration-500 ${
                                  loadingPhase >= i
                                    ? 'border-transparent shadow-sm'
                                    : 'border-[var(--border-color)] text-[var(--text-secondary)] opacity-30'
                                }`}
                                style={loadingPhase >= i ? {
                                  backgroundColor: `${activeAgent.color}20`,
                                  borderColor: `${activeAgent.color}50`,
                                  color: activeAgent.color,
                                } : undefined}
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Shimmer skeleton lines */}
                        <div className="space-y-2 pt-0.5">
                          {[92, 75, 55].map((w, i) => (
                            <div
                              key={i}
                              className="h-2 rounded-full loader-shimmer"
                              style={{ width: `${w}%`, animationDelay: `${i * 200}ms` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Network / Integration Errors */}
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-950/20 border border-red-900/30 text-red-200 rounded-xl text-xs md:text-sm shadow-sm max-w-xl mx-auto">
                    <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                      <strong>System Error:</strong> {error}
                    </div>
                  </div>
                )}

                {/* Rate Limiting alert */}
                {rateLimitError && (
                  <div className="flex flex-col gap-3 p-4 bg-orange-950/20 border border-orange-900/30 text-orange-200 rounded-xl text-xs md:text-sm shadow-sm max-w-xl mx-auto">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="w-5 h-5 text-orange-400 flex-shrink-0" />
                      <div>
                        <strong>Rate Limit Reached:</strong> {rateLimitError.message}
                      </div>
                    </div>
                    {rateLimitError.retryAfter && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-orange-400/80 bg-orange-950/40 px-2 rounded-md self-start border border-orange-900/10">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Resets at: {new Date(rateLimitError.retryAfter).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}

          </div>
        </main>

        {/* 3. Floating Bottom Input Card (Only shown when messages exist) */}
        {messages.length > 0 && (
          <footer className="p-4 bg-[var(--bg-main)]">
            <div className="max-w-5xl mx-auto">
              <div className="bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl p-3 shadow-md focus-within:ring-2 focus-within:ring-[var(--accent-color)]/20 focus-within:border-[var(--accent-color)] transition-all">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Ask anything..."
                  className="w-full bg-transparent resize-none focus:outline-none text-[var(--text-main)] text-sm md:text-md placeholder-slate-400 min-h-[24px] max-h-[200px] pr-2 scrollbar-thin"
                  disabled={isLoading}
                />
                
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-color)]/50">
                  <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] select-none">
                    <button 
                      type="button" 
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#2e2e2a]"
                      title="Attach files (Mock)"
                    >
                      <Paperclip className="w-4 h-4 text-slate-500" />
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleToggleThinkingMode}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition-all ${
                        thinkingMode
                          ? "bg-[var(--accent-color)] text-white border-[var(--accent-color)] shadow-sm"
                          : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[#eae8e2] dark:hover:bg-[#2d2d2a]"
                      }`}
                    >
                      <Sparkles className={`w-3 h-3 ${thinkingMode ? "animate-pulse" : ""}`} />
                      <span>Deep Research {thinkingMode ? "ON" : "OFF"}</span>
                    </button>
                  </div>
                  
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !inputText.trim()}
                    className="p-2 rounded-xl text-white disabled:bg-slate-200 dark:disabled:bg-[#252522] disabled:text-slate-400 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-center text-[var(--text-secondary)] mt-2 font-mono select-none">
                Zydrakon AI can make mistakes. Consider checking important information.
              </p>
            </div>
          </footer>
        )}

      </div>

      {/* Agents Selection Panel */}
      <AgentsPanel
        isOpen={showAgentsPanel}
        onClose={() => setShowAgentsPanel(false)}
        selectedAgentId={selectedAgentId}
        onSelectAgent={handleSelectAgent}
      />
    </div>
  );
}
