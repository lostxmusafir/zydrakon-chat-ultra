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
  PanelLeft
} from "lucide-react";
import { Message, Session, RateLimits } from "@/lib/types";
import { api, ApiError } from "@/lib/api";
import dynamic from "next/dynamic";

const Mermaid = dynamic(() => import("../components/Mermaid"), {
  ssr: false,
});

const FREE_MODELS = [
  { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash" },
  { id: "poolside/laguna-m.1:free", name: "Laguna M.1 (Poolside) Free" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron-3 Ultra 550B (Nvidia) Free" },
  { id: "meta-llama/llama-3-8b-instruct:free", name: "Llama 3 8B Free" },
  { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B Free" },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B Free" },
  { id: "qwen/qwen-2-7b-instruct:free", name: "Qwen 2 7B Free" },
  { id: "microsoft/phi-3-medium-128k-instruct:free", name: "Phi-3 Medium Free" }
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
  const [selectedModel, setSelectedModel] = useState("deepseek/deepseek-v4-flash");
  const [limits, setLimits] = useState<RateLimits | null>(null);
  const [thinkingMode, setThinkingMode] = useState(false);
  
  // Layout states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize: Load sessions, configure theme
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
    } catch (err: unknown) {
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
      const response = await api.sendChatMessage(activeSessionId, userText, selectedModel, thinkingMode);
      
      const assistantMessage: Message = {
        role: "assistant",
        content: response.response,
        timestamp: new Date().toISOString(),
        model_used: response.model_used
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      await loadLimits(activeSessionId);
    } catch (err: unknown) {
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
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter key submits the text, Shift+Enter adds newline
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    localStorage.setItem("zydrakon_active_session", sessionId);
  };

  // Helper parser for markdown tags
  const parseInlineText = (text: string) => {
    const tokens = text.split(/(\*\*[^*]+\*\*|`[^`\n]+`)/g);
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

      const paragraphs = part.split(/\n\n+/);
      return paragraphs.map((para, paraIdx) => {
        // Bullet Points
        if (para.startsWith("- ") || para.startsWith("* ") || para.startsWith("• ")) {
          const lines = para.split("\n");
          return (
            <ul key={paraIdx} className="list-disc pl-6 mb-4 space-y-1.5 text-slate-800 dark:text-slate-200">
              {lines.map((line, lineIdx) => (
                <li key={lineIdx}>
                  {parseInlineText(line.replace(/^[-*•]\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        // Headings
        if (para.startsWith("### ")) {
          return <h3 key={paraIdx} className="text-md font-bold text-black dark:text-white mb-2 mt-4">{parseInlineText(para.slice(4))}</h3>;
        }
        if (para.startsWith("## ")) {
          return <h2 key={paraIdx} className="text-lg font-bold text-black dark:text-white mb-2 mt-4">{parseInlineText(para.slice(3))}</h2>;
        }
        if (para.startsWith("# ")) {
          return <h1 key={paraIdx} className="text-xl font-bold text-black dark:text-white mb-3 mt-4">{parseInlineText(para.slice(2))}</h1>;
        }

        return (
          <p key={paraIdx} className="mb-4 text-slate-800 dark:text-slate-200">
            {parseInlineText(para)}
          </p>
        );
      });
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-200">
      
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

          {/* New Chat Button */}
          <div className="p-4">
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

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-[var(--border-color)] bg-[#f3f1eb] dark:bg-[#1f1f1d] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="font-mono flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[var(--accent-color)]" />
              SQLite cache active
            </span>
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
                {FREE_MODELS.map(m => (
                  <option key={m.id} value={m.id} className="bg-[var(--bg-main)] text-[var(--text-main)] font-sans">{m.name}</option>
                ))}
              </select>
              <Cpu className="w-3 h-3 text-[var(--text-secondary)] absolute right-0 top-2.5 pointer-events-none" />
            </div>
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

            {/* Thinking Mode Toggle Switch */}
            <button
              onClick={() => setThinkingMode(!thinkingMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold font-sans transition-all select-none ${
                thinkingMode
                  ? "bg-[var(--accent-color)] text-white border-[var(--accent-color)] shadow-sm"
                  : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[#eae8e2] dark:hover:bg-[#2d2d2a] hover:text-[var(--text-main)]"
              }`}
              title="Toggle Thinking & Web Search Mode"
            >
              <Sparkles className={`w-3.5 h-3.5 ${thinkingMode ? "animate-pulse" : ""}`} />
              <span>Thinking Mode: {thinkingMode ? "ON" : "OFF"}</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[#eae8e2] dark:hover:bg-[#2d2d2a] hover:text-[var(--text-main)]"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
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
                  Zydrakon AI integrates OpenRouter free LLMs and optimizes response latency via local SQLite database cache.
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
                          onClick={() => setThinkingMode(!thinkingMode)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition-all ${
                            thinkingMode
                              ? "bg-[var(--accent-color)] text-white border-[var(--accent-color)] shadow-sm"
                              : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[#eae8e2] dark:hover:bg-[#2d2d2a]"
                          }`}
                        >
                          <Sparkles className={`w-3 h-3 ${thinkingMode ? "animate-pulse" : ""}`} />
                          <span>Thinking {thinkingMode ? "ON" : "OFF"}</span>
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
                      onClick={() => setInputText(prompt)}
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
                      {/* Avatar initial symbol */}
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full border border-[var(--border-color)] bg-[#f3f1eb] dark:bg-[#22221f] text-[11px] font-bold text-[var(--accent-color)] flex items-center justify-center flex-shrink-0 shadow-sm select-none">
                          Z
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
                          // Assistant message rendered plain text in warm serif font (Claude Style!)
                          <div className="claude-serif text-[var(--text-main)] pr-4">
                            {formatMessageContent(msg.content)}
                          </div>
                        )}

                        {/* Metadata row */}
                        <div className="flex items-center gap-2.5 text-[9px] font-mono text-[var(--text-secondary)] select-none">
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {!isUser && msg.model_used && (
                            <>
                              <span>•</span>
                              <span className="text-[var(--accent-color)] font-semibold tracking-wider uppercase">
                                {msg.model_used.includes("mock") ? "DEV MODE" : msg.model_used.split("/").pop()?.replace(":free", "")}
                              </span>
                            </>
                          )}
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

                {/* Assistant Thinking State */}
                {isLoading && (
                  <div className="flex items-start gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full border border-[var(--border-color)] bg-[#f3f1eb] dark:bg-[#22221f] text-[11px] font-bold text-[var(--accent-color)] flex items-center justify-center flex-shrink-0 shadow-sm select-none animate-pulse">
                      Z
                    </div>
                    <div className="flex flex-col space-y-1">
                      <div className="bg-transparent text-[var(--text-secondary)] py-1.5 px-1 flex items-center gap-1.5 font-mono text-xs select-none">
                        <span>{thinkingMode ? "Zydrakon is searching & reasoning" : "Zydrakon is thinking"}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] bounce-dot delay-0"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] bounce-dot delay-150"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] bounce-dot delay-300"></span>
                      </div>
                    </div>
                  </div>
                )}

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
          <footer className="p-4 bg-[var(--bg-main)] border-t border-[var(--border-color)]">
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
                      onClick={() => setThinkingMode(!thinkingMode)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-semibold transition-all ${
                        thinkingMode
                          ? "bg-[var(--accent-color)] text-white border-[var(--accent-color)] shadow-sm"
                          : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[#eae8e2] dark:hover:bg-[#2d2d2a]"
                      }`}
                    >
                      <Sparkles className={`w-3 h-3 ${thinkingMode ? "animate-pulse" : ""}`} />
                      <span>Thinking {thinkingMode ? "ON" : "OFF"}</span>
                    </button>
                    
                    <span className="text-[9px] font-mono opacity-80">Local SQLite cache filter active</span>
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
                Zydrakon AI compiles OpenRouter free models and filters duplicates via SQL index.
              </p>
            </div>
          </footer>
        )}

      </div>
    </div>
  );
}
