"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Bot,
  Feather,
  LogOut,
  User,
  ShieldCheck,
  Zap,
  Globe,
  ExternalLink,
  Copy,
  Check,
  Lock,
  RotateCcw,
  GitBranch,
  Swords,
  Users,
  UserPlus
} from "lucide-react";
import { Message, Session, RateLimits, StorageStatus, Workspace, WorkspaceMember, WorkspaceMessage } from "@/lib/types";
import { api, ApiError } from "@/lib/api";
import dynamic from "next/dynamic";

const Mermaid = dynamic(() => import("../components/Mermaid"), { ssr: false });
const ArchitectureDiagram = dynamic(
  () => import("../components/ArchitectureDiagram").then((mod) => mod.ArchitectureDiagram),
  { ssr: false }
);
import { LoginModal } from "@/components/LoginModal";
import { AgentsPanel, AGENTS } from "@/components/AgentsPanel";
import { AgentLoader } from "@/components/AgentLoader";
import { LiveAIWriter } from "@/components/LiveAIWriter";
import { ZydrakonLogo } from "@/components/ZydrakonLogo";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { LoginPage } from "@/components/LoginPage";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { WorkspacesModal } from "@/components/WorkspacesModal";

const FREE_MODELS = [
  { id: "zydrakon-free", name: "Zydrakon AI (Free)" },
  { id: "zhipu-free", name: "Zydrakon AI (Gold)" },
  { id: "zydrakon-premium", name: "Zydrakon AI Premium" },
];

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-zinc-800 shadow-md bg-[#050507]">
      <div className="flex justify-between items-center bg-[#121215] px-4 py-2 text-xs text-zinc-400 font-mono border-b border-zinc-800/80 select-none">
        <span>{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="hover:text-white transition-colors flex items-center gap-1 font-medium text-zinc-300"
        >
          {copied ? (
            <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3"/> Copied!</span>
          ) : (
            <span className="flex items-center gap-1"><Copy className="w-3 h-3"/> Copy code</span>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-xs md:text-sm leading-relaxed scrollbar-thin text-zinc-200">
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
  const [selectedModel, setSelectedModel] = useState("zydrakon-free");
  const [limits, setLimits] = useState<RateLimits | null>(null);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [isStreamingMsg, setIsStreamingMsg] = useState(false);

  const checkStorageStatus = async () => {
    try {
      const status = await api.getStorageStatus();
      setStorageStatus(status);
      if (status.purged) {
        setMessages([]);
        loadSessions();
      }
    } catch (e) {
      console.error("Storage status check failed:", e);
    }
  };

  // App Main Mode: 'chat' | 'writer' | 'workspace'
  const [mainView, setMainView] = useState<"chat" | "writer" | "workspace">("chat");

  // Layout states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Workspaces state
  const [showWorkspacesModal, setShowWorkspacesModal] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [workspaceMessages, setWorkspaceMessages] = useState<WorkspaceMessage[]>([]);
  const [workspaceInput, setWorkspaceInput] = useState("");
  const [askAiInWorkspace, setAskAiInWorkspace] = useState(false);
  const [isSendingWsMsg, setIsSendingWsMsg] = useState(false);

  // Welcome & Full Login States
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [showFullLoginPage, setShowFullLoginPage] = useState(true);

  // Agents states
  const [selectedAgentId, setSelectedAgentId] = useState<string>("general-assistant");
  const [showAgentsPanel, setShowAgentsPanel] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const loadWorkspaceMessages = async (wsId: string) => {
    try {
      const msgs = await api.getWorkspaceMessages(wsId);
      setWorkspaceMessages(msgs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendWorkspaceMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceInput.trim() || !activeWorkspace || isSendingWsMsg) return;
    const text = workspaceInput.trim();
    setWorkspaceInput("");
    setIsSendingWsMsg(true);
    try {
      await api.sendWorkspaceMessage(activeWorkspace.id, text, askAiInWorkspace, selectedModel);
      await loadWorkspaceMessages(activeWorkspace.id);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to send workspace message");
    } finally {
      setIsSendingWsMsg(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Active agent
  const activeAgent = AGENTS.find((a) => a.id === selectedAgentId) || AGENTS[AGENTS.length - 1];

  // Initialize
  useEffect(() => {
    loadSessions();
    checkStorageStatus();
    const interval = setInterval(checkStorageStatus, 15000);

    // Enforce Pitch Black Dark Mode
    document.documentElement.classList.add("dark");
    localStorage.setItem("zydrakon_theme", "dark");

    // Restore Auth User
    const token = localStorage.getItem("zydrakon_token");
    const storedUser = localStorage.getItem("zydrakon_user");
    if (token) {
      setIsAuthenticated(true);
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch (e) {
          console.error(e);
        }
      }
    }

    // Restore Agent Selection
    const savedAgent = localStorage.getItem("zydrakon_agent");
    if (savedAgent && AGENTS.some((a) => a.id === savedAgent)) {
      setSelectedAgentId(savedAgent);
    }

    return () => clearInterval(interval);
  }, []);

  // Real-time polling for team workspace messages
  useEffect(() => {
    if (mainView === "workspace" && activeWorkspace) {
      loadWorkspaceMessages(activeWorkspace.id);
      const interval = setInterval(() => {
        loadWorkspaceMessages(activeWorkspace.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [mainView, activeWorkspace]);

  // Sync session change
  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
      loadLimits(activeSessionId);
      setError(null);
    }
  }, [activeSessionId]);

  // Scroll to bottom
  useEffect(() => {
    if (mainView === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isStreamingMsg, mainView]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [inputText]);

  const loadSessions = async () => {
    try {
      const data = await api.listSessions();
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      } else if (data.length === 0) {
        handleNewSession();
      }
    } catch (err: any) {
      console.log("Using local offline session fallback...", err);
      const defaultId = `session-${Date.now()}`;
      setSessions([{ id: defaultId, created_at: new Date().toISOString() }]);
      setActiveSessionId(defaultId);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const msgs = await api.getSessionMessages(sessionId);
      setMessages(msgs);
    } catch (err) {
      setMessages([]);
    }
  };

  const loadLimits = async (sessionId: string) => {
    try {
      const l = await api.getRateLimits(sessionId);
      setLimits(l);
    } catch (err) {
      setLimits(null);
    }
  };

  const handleReplay = async (messageId?: string) => {
    if (!activeSessionId || !messageId || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.replayMessage(activeSessionId, messageId, selectedModel, thinkingMode);
      await loadMessages(activeSessionId);
      await loadLimits(activeSessionId);
    } catch (err: any) {
      setError(err?.message || "Failed to replay message");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBranch = async (messageId?: string) => {
    if (!activeSessionId || !messageId || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const newSession = await api.branchSession(activeSessionId, messageId);
      await loadSessions();
      setActiveSessionId(newSession.id);
      alert("🌿 Branched session created successfully!");
    } catch (err: any) {
      setError(err?.message || "Failed to branch session");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProveIt = async (messageId?: string) => {
    if (!activeSessionId || !messageId || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.proveIt(activeSessionId, messageId, selectedModel);
      await loadMessages(activeSessionId);
      await loadLimits(activeSessionId);
    } catch (err: any) {
      setError(err?.message || "Failed to challenge response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = async () => {
    try {
      const newSession = await api.createSession();
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setMessages([]);
    } catch (err) {
      const localId = `session-${Date.now()}`;
      const localSession = { id: localId, created_at: new Date().toISOString() };
      setSessions((prev) => [localSession, ...prev]);
      setActiveSessionId(localId);
      setMessages([]);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteSession(sessionId);
      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);
      if (activeSessionId === sessionId) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (err) {
      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);
      if (activeSessionId === sessionId) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      }
    }
  };

  const handleDeleteAllSessions = async () => {
    try {
      await api.deleteAllSessions();
    } catch (err) {
      console.error(err);
    } finally {
      setSessions([]);
      setMessages([]);
      handleNewSession();
    }
  };

  // Stream AI response text character by character for Live AI Write effect in Chat
  const streamResponseIntoChat = (fullResponseText: string, searchResults?: any[], searchQuery?: string) => {
    setIsStreamingMsg(true);
    let currentLen = 0;
    const totalLen = fullResponseText.length;
    const chunkSize = Math.max(2, Math.floor(totalLen / 120));

    // Create temporary streaming assistant message
    const assistantMsgIndex = messages.length + 1; // position

    const interval = setInterval(() => {
      currentLen += chunkSize;
      const slicedText = fullResponseText.slice(0, currentLen);

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "assistant" && (last as any).isStreaming) {
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              content: slicedText,
            },
          ];
        } else {
          return [
            ...prev,
            {
              role: "assistant",
              content: slicedText,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              model_used: selectedModel,
              search_results: searchResults,
              search_query: searchQuery,
              isStreaming: true,
            } as any,
          ];
        }
      });

      if (currentLen >= totalLen) {
        clearInterval(interval);
        setIsStreamingMsg(false);
        // Finalize message state
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && (last as any).isStreaming) {
            delete (last as any).isStreaming;
          }
          return [...prev];
        });
      }
    }, 15);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || isStreamingMsg) return;

    let currentSession = activeSessionId;
    if (!currentSession) {
      try {
        const newS = await api.createSession();
        setSessions([newS]);
        setActiveSessionId(newS.id);
        currentSession = newS.id;
      } catch {
        currentSession = `session-${Date.now()}`;
        setSessions([{ id: currentSession, created_at: new Date().toISOString() }]);
        setActiveSessionId(currentSession);
      }
    }

    const userMessageText = inputText.trim();
    setInputText("");
    setError(null);

    const userMsg: Message = {
      role: "user",
      content: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await api.sendChatMessage(
        currentSession,
        userMessageText,
        selectedModel,
        thinkingMode,
        activeAgent.systemPrompt || undefined
      );

      setIsLoading(false);
      streamResponseIntoChat(response.response, response.search_results, response.search_query);
      if (currentSession) loadLimits(currentSession);
    } catch (err: any) {
      setIsLoading(false);
      console.error("Orchestrator error:", err);
      const errorMsg = err?.message || "Unable to reach Zydrakon AI backend orchestrator. Please verify backend is running.";
      streamResponseIntoChat(`⚠️ **Zydrakon AI Orchestrator Notice**: ${errorMsg}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    localStorage.setItem("zydrakon_agent", agentId);
  };

// Inline Markdown Formatter (Parses **bold**, `code`, and *italics* without raw asterisks)
function formatMarkdownInline(text: string): React.ReactNode {
  if (!text) return text;
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={idx} className="px-1.5 py-0.5 rounded bg-zinc-800 text-orange-400 font-mono text-sm md:text-base border border-zinc-700/60">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={idx} className="italic text-zinc-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

  // Helper renderer for Markdown content
  const renderMessageContent = (content: string) => {
    if (!content) return null;

    const blocks = content.split("```");
    return blocks.map((block, index) => {
      if (index % 2 === 1) {
        // Code Block
        const firstLineEnd = block.indexOf("\n");
        let language = "";
        let code = block;
        if (firstLineEnd !== -1) {
          language = block.slice(0, firstLineEnd).trim();
          code = block.slice(firstLineEnd + 1);
        }

        const langLower = language.toLowerCase();
        if (langLower.startsWith("mermaid")) {
          return <Mermaid key={index} chart={code.trim()} />;
        }
        if (langLower === "architecture" || langLower === "cloud" || langLower === "system-design") {
          return <ArchitectureDiagram key={index} codeRaw={code.trim()} />;
        }
        return <CodeBlock key={index} code={code.trim()} language={language} />;
      }

      // Process lines inside standard text block
      const rawLines = block.split("\n");
      const elements: React.ReactNode[] = [];
      let i = 0;

      while (i < rawLines.length) {
        const line = rawLines[i];
        const trimmed = line.trim();

        // Check if line starts a markdown table (starts and ends with |)
        if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 2) {
          const tableLines: string[] = [];
          while (i < rawLines.length && rawLines[i].trim().startsWith("|") && rawLines[i].trim().endsWith("|")) {
            tableLines.push(rawLines[i].trim());
            i++;
          }

          if (tableLines.length >= 2) {
            const headerRow = tableLines[0].split("|").slice(1, -1).map(c => c.trim());
            const dataRows = tableLines
              .slice(1)
              .filter(r => !/^\|[\s-:]+(\|[\s-:]+)*\|$/.test(r))
              .map(r => r.split("|").slice(1, -1).map(c => c.trim()));

            elements.push(
              <div key={`table-${i}`} className="my-4 overflow-x-auto rounded-xl border border-zinc-800 bg-[#09090b] shadow-md scrollbar-thin select-text">
                <table className="w-full text-left text-sm md:text-base text-zinc-200 border-collapse">
                  <thead className="bg-[#121215] text-white border-b border-zinc-800 uppercase tracking-wider font-semibold">
                    <tr>
                      {headerRow.map((cell, cIdx) => (
                        <th key={cIdx} className="px-4 py-3 border-r last:border-r-0 border-zinc-800/80">
                          {formatMarkdownInline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {dataRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#151518] transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-2.5 border-r last:border-r-0 border-zinc-800/80">
                            {formatMarkdownInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            continue;
          }
        }

        if (!trimmed) {
          elements.push(<div key={i} className="h-1.5" />);
          i++;
          continue;
        }

        // Header matching for any level # to ######
        const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const text = headerMatch[2];
          if (level === 1) {
            elements.push(<h1 key={i} className="text-2xl md:text-3xl font-bold text-orange-400 mt-4 mb-2">{formatMarkdownInline(text)}</h1>);
          } else if (level === 2) {
            elements.push(<h2 key={i} className="text-xl md:text-2xl font-bold text-white mt-4 mb-2">{formatMarkdownInline(text)}</h2>);
          } else {
            elements.push(<h3 key={i} className="text-base md:text-lg font-bold text-zinc-100 mt-3 mb-1.5">{formatMarkdownInline(text)}</h3>);
          }
          i++;
          continue;
        }

        // Bullet List items
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          elements.push(
            <li key={i} className="text-base md:text-lg leading-relaxed text-zinc-200 ml-5 list-disc">
              {formatMarkdownInline(trimmed.slice(2))}
            </li>
          );
          i++;
          continue;
        }

        // Normal text paragraph
        elements.push(
          <p key={i} className="text-base md:text-lg leading-relaxed text-zinc-200">
            {formatMarkdownInline(line)}
          </p>
        );
        i++;
      }

      return <div key={index} className="space-y-3">{elements}</div>;
    });
  };

  if (showWelcomeScreen) {
    return (
      <WelcomeScreen
        onEnter={() => setShowWelcomeScreen(false)}
        onLogin={() => {
          setShowWelcomeScreen(false);
          setShowFullLoginPage(true);
        }}
      />
    );
  }

  if (showFullLoginPage) {
    return (
      <LoginPage
        onSuccess={(user, token) => {
          localStorage.setItem("zydrakon_token", token);
          localStorage.setItem("zydrakon_user", JSON.stringify(user));
          setIsAuthenticated(true);
          setCurrentUser(user);
          setShowFullLoginPage(false);
          loadSessions();
        }}
        onContinueGuest={() => setShowFullLoginPage(false)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#000000] text-zinc-100 overflow-hidden font-sans select-none">
      {/* Sidebar Overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Pitch Black Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-72 bg-[#09090b] border-r border-zinc-800/80 transform transition-transform duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:opacity-0 md:overflow-hidden"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            <ZydrakonLogo size={32} />
            <div>
              <h1 className="font-bold text-sm text-white tracking-wide">Zydrakon AI</h1>
              <span className="text-[10px] text-zinc-500 block -mt-0.5">Pitch Black Ultra</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="p-3 space-y-2 border-b border-zinc-800/80">
          <button
            onClick={() => {
              setMainView("chat");
              handleNewSession();
            }}
            className="w-full py-2.5 px-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-850 text-white font-medium text-xs transition-all flex items-center justify-between group cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-orange-400 group-hover:rotate-90 transition-transform" />
              New Chat
            </span>
            <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono">⌘N</span>
          </button>

          <button
            onClick={() => setShowAgentsPanel(true)}
            className="w-full py-2 px-3 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 text-xs text-zinc-300 transition-all flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-blue-400" />
              <span>Agents Persona</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white" style={{ backgroundColor: activeAgent.color }}>
              {activeAgent.name.split(" ")[0]}
            </span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
            <span>Recent Conversations</span>
            {sessions.length > 0 && (
              <button
                onClick={handleDeleteAllSessions}
                className="text-[10px] text-zinc-500 hover:text-red-400 font-normal normal-case transition-colors flex items-center gap-1 cursor-pointer"
                title="Clear all sessions"
              >
                <Trash2 className="w-3 h-3" /> Clear All
              </button>
            )}
          </div>
          {sessions.map((s) => {
            const isActive = activeSessionId === s.id && mainView === "chat";
            return (
              <div
                key={s.id}
                onClick={() => {
                  setMainView("chat");
                  setActiveSessionId(s.id);
                }}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                  isActive
                    ? "bg-zinc-850 text-white font-medium border border-zinc-800"
                    : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-orange-400" : "text-zinc-600"}`} />
                  <span className="truncate">Session {s.id.slice(-6)}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer / User Profile */}
        <div className="p-3 border-t border-zinc-800/80 bg-[#060608]">
          {isAuthenticated && currentUser ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 text-xs font-bold">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : "U"}
                </div>
                <div className="truncate">
                  <p className="text-xs font-medium text-white truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{currentUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowChangePasswordModal(true)}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-orange-400 transition-colors"
                  title="Change Password"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem("zydrakon_token");
                    localStorage.removeItem("zydrakon_user");
                    setIsAuthenticated(false);
                    setCurrentUser(null);
                    loadSessions();
                  }}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowFullLoginPage(true)}
              className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200 font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-orange-400" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-[#000000] relative overflow-hidden">
        {/* Top Header Navigation Bar */}
        <header className="h-14 px-4 md:px-6 bg-[#09090b] border-b border-zinc-800/80 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              title={sidebarOpen ? "Close Sidebar" : "Open Sidebar"}
            >
              <PanelLeft className="w-4 h-4 text-orange-400" />
            </button>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
              <button
                onClick={() => setMainView("chat")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  mainView === "chat" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
                <span>AI Chat</span>
              </button>
              <button
                onClick={() => {
                  setMainView("workspace");
                  if (!activeWorkspace) {
                    setShowWorkspacesModal(true);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  mainView === "workspace" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Team Workspace</span>
                {activeWorkspace && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-mono truncate max-w-[80px]">
                    {activeWorkspace.name}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Model Switcher & Agent Tag & Workspace Manager */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setShowWorkspacesModal(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-400 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Workspaces</span>
            </button>

            <button
              onClick={() => setShowAgentsPanel(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs hover:border-zinc-700 transition-all"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activeAgent.color }} />
              <span className="text-zinc-300 font-medium">{activeAgent.name}</span>
            </button>

            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-orange-400 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {FREE_MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-zinc-900 text-zinc-200">
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Storage Capacity 80% Warning Banner */}
        {storageStatus && storageStatus.warning_80 && (
          <div className="bg-gradient-to-r from-red-950/90 via-amber-950/90 to-red-950/90 border-b border-red-500/50 text-amber-200 px-4 py-2.5 text-xs md:text-sm font-medium flex items-center justify-between shadow-lg z-20 transition-all animate-pulse">
            <div className="flex items-center gap-2.5">
              <span className="p-1 rounded-lg bg-red-500/20 text-red-400 font-bold">⚠️ Storage Alert</span>
              <span>
                Jaldi hi aapki history delete kar di jayegi! Database storage 80%+ full ho chuka hai ({storageStatus.used_percent}% used).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono bg-black/60 border border-red-500/30 px-2.5 py-0.5 rounded-md text-red-300">
                {storageStatus.used_mb}MB / {storageStatus.max_mb}MB ({storageStatus.used_percent}%)
              </span>
            </div>
          </div>
        )}

        {/* View Router: Personal Chat vs Live Writer Studio vs Team Workspace */}
        {mainView === "workspace" ? (
          <div className="flex-1 flex flex-col relative overflow-hidden bg-[#000000]">
            {/* Workspace Header Bar */}
            <div className="p-4 bg-[#09090c] border-b border-zinc-800/80 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{activeWorkspace ? activeWorkspace.name : "Select or Create Workspace"}</span>
                    {activeWorkspace && (
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
                        {activeWorkspace.members.length} {activeWorkspace.members.length === 1 ? "member" : "members"}
                      </span>
                    )}
                  </h2>
                  {activeWorkspace?.description && (
                    <p className="text-xs text-zinc-400">{activeWorkspace.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWorkspacesModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-200 font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-orange-400" />
                  <span>Invite People</span>
                </button>
              </div>
            </div>

            {/* Workspace Messages Thread */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6 space-y-4 select-text">
              {!activeWorkspace ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <Users className="w-12 h-12 text-zinc-600 mb-3" />
                  <h3 className="text-base font-bold text-white mb-1">No Workspace Selected</h3>
                  <p className="text-xs text-zinc-400 max-w-sm mb-4">
                    Create a workspace or select an existing one to collaborate with registered users.
                  </p>
                  <button
                    onClick={() => setShowWorkspacesModal(true)}
                    className="px-4 py-2 rounded-xl bg-orange-500 text-black font-semibold text-xs hover:bg-orange-600 cursor-pointer"
                  >
                    Open Workspaces Manager
                  </button>
                </div>
              ) : workspaceMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
                  <MessageSquare className="w-10 h-10 mb-2 opacity-50 text-blue-400" />
                  <p className="text-sm font-semibold text-zinc-300">Workspace Chat Channel Started</p>
                  <p className="text-xs text-zinc-500 mt-1">Send a message below to start chatting with team members!</p>
                </div>
              ) : (
                workspaceMessages.map((msg) => {
                  const isMe = currentUser && msg.sender_id === currentUser.id;
                  const isAi = msg.is_ai;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 max-w-3xl ${isMe ? "ml-auto flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${
                          isAi
                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                            : isMe
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                            : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                        }`}
                      >
                        {isAi ? "🤖" : msg.sender_name[0].toUpperCase()}
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                          isAi
                            ? "bg-[#14120f] border border-orange-500/30 text-zinc-200"
                            : isMe
                            ? "bg-blue-950/40 border border-blue-500/30 text-zinc-100"
                            : "bg-[#101014] border border-zinc-800 text-zinc-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 border-b border-zinc-800/60 pb-1 text-[10px] text-zinc-400">
                          <span className="font-semibold text-zinc-300 flex items-center gap-1">
                            {msg.sender_name}
                            {isAi && (
                              <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.2 rounded font-mono">
                                AI Bot
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-zinc-500">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Workspace Message Input Bar */}
            {activeWorkspace && (
              <form onSubmit={handleSendWorkspaceMessage} className="p-4 bg-[#09090c] border-t border-zinc-800/80">
                <div className="max-w-4xl mx-auto space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={askAiInWorkspace}
                        onChange={(e) => setAskAiInWorkspace(e.target.checked)}
                        className="rounded border-zinc-700 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="flex items-center gap-1 font-medium text-orange-400">
                        <Sparkles className="w-3.5 h-3.5" /> Ask AI in Workspace Chat
                      </span>
                    </label>
                    <span className="text-[11px] text-zinc-500">Press Enter to send</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Message #${activeWorkspace.name}...`}
                      value={workspaceInput}
                      onChange={(e) => setWorkspaceInput(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-blue-500/60"
                    />
                    <button
                      type="submit"
                      disabled={!workspaceInput.trim() || isSendingWsMsg}
                      className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSendingWsMsg ? "Sending..." : "Send"}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        ) : mainView === "writer" ? (
          <LiveAIWriter
            selectedModel={selectedModel}
            onSendToChat={(text) => {
              setMainView("chat");
              setInputText(`Here is my document text:\n\n${text}\n\nPlease analyze, polish, and enhance it further.`);
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col relative overflow-hidden bg-[#000000]">
            {/* Messages View */}
            <div className="flex-1 overflow-y-auto scrollbar-thin select-text">
              <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 my-12">
                  <div className="mb-6">
                    <ZydrakonLogo size={110} className="drop-shadow-[0_0_25px_rgba(249,115,22,0.25)]" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">How can Zydrakon AI assist you today?</h2>
                  <p className="text-xs text-zinc-400 max-w-md mb-6">
                    Ask any question, write code, run live research, or switch to the Live AI Writer Studio for real-time document drafting.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                    {[
                      "✍️ Write a Next.js 16 app tutorial",
                      "💻 Create a Python web scraper",
                      "🧬 Explain mitochondrial DNA replication",
                      "📈 Draft a SaaS product launch plan",
                    ].map((promptText, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInputText(promptText.slice(3));
                        }}
                        className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800/90 hover:border-orange-500/40 hover:bg-zinc-900 text-left text-xs text-zinc-300 hover:text-white transition-all cursor-pointer"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.role === "user" ? "items-end" : "items-start"
                    } animate-message`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <span className="text-xs md:text-sm font-semibold text-zinc-300">
                        {msg.role === "user" ? "You" : activeAgent.name}
                      </span>
                      <span className="text-xs text-zinc-500">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`text-base md:text-lg leading-relaxed ${
                        msg.role === "user"
                          ? "max-w-[85%] md:max-w-[75%] bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-2xl p-4 shadow-sm"
                          : "w-full max-w-none bg-transparent text-zinc-100 p-0 shadow-none border-none"
                      }`}
                    >
                      {/* Search Query Pill */}
                      {msg.search_query && (
                        <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs md:text-sm text-orange-400">
                          <Globe className="w-3.5 h-3.5 shrink-0" />
                          <span>Searched: {msg.search_query}</span>
                        </div>
                      )}

                      {/* Render Message Body */}
                      {renderMessageContent(msg.content)}

                      {/* Animated Typing Cursor if streaming */}
                      {(msg as any).isStreaming && (
                        <span className="inline-block w-2 h-4 ml-1 bg-orange-500 animate-pulse rounded-sm align-middle" />
                      )}

                      {/* Interactive Actions Toolbar */}
                      {msg.id && !isLoading && !isStreamingMsg && (
                        <div className={`mt-3 flex items-center gap-3 text-zinc-500 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} select-none border-t border-zinc-900/60 pt-2`}>
                          {/* Replay Button */}
                          <button
                            onClick={() => handleReplay(msg.id)}
                            title="🔄 Replay (Regenerate answer)"
                            className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold hover:text-orange-500 transition-colors p-1 px-2 rounded-lg bg-zinc-950/40 hover:bg-zinc-950 border border-zinc-900/80 hover:border-zinc-800 cursor-pointer shadow-sm"
                          >
                            <RotateCcw className="w-3 h-3 shrink-0" />
                            <span>Replay</span>
                          </button>
                          
                          {/* Branch Button */}
                          <button
                            onClick={() => handleBranch(msg.id)}
                            title="🌿 Continue From Here (Start a new branch)"
                            className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold hover:text-emerald-500 transition-colors p-1 px-2 rounded-lg bg-zinc-950/40 hover:bg-zinc-950 border border-zinc-900/80 hover:border-zinc-800 cursor-pointer shadow-sm"
                          >
                            <GitBranch className="w-3 h-3 shrink-0" />
                            <span>Branch</span>
                          </button>

                          {/* Prove It Button (only for Assistant responses) */}
                          {msg.role === "assistant" && (
                            <button
                              onClick={() => handleProveIt(msg.id)}
                              title="⚔️ Prove It (Analyze supporting/counter evidence)"
                              className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold hover:text-blue-500 transition-colors p-1 px-2 rounded-lg bg-zinc-950/40 hover:bg-zinc-950 border border-zinc-900/80 hover:border-zinc-800 cursor-pointer shadow-sm"
                            >
                              <Swords className="w-3 h-3 shrink-0" />
                              <span>Prove It</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Agent Loader when thinking */}
              {isLoading && (
                <div className="flex flex-col items-start animate-message">
                  <AgentLoader />
                </div>
              )}

              <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Claude-Style Floating Chat Input Box */}
            <div className="p-4 md:pb-6 bg-transparent flex flex-col items-center">
              <div className="w-full max-w-4xl mx-auto flex flex-col gap-2">
                <div className="relative flex items-end bg-[#09090b] border border-zinc-800/90 hover:border-zinc-700/80 rounded-3xl p-3 focus-within:border-orange-500/60 focus-within:ring-1 focus-within:ring-orange-500/30 transition-all shadow-2xl">
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask ${activeAgent.name} anything... (Shift+Enter for new line)`}
                    rows={1}
                    className="w-full px-3 py-1.5 bg-transparent text-base md:text-lg text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none max-h-48 font-sans"
                  />

                  <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isLoading || isStreamingMsg}
                    className="p-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-20 disabled:hover:bg-orange-600 transition-all shrink-0 cursor-pointer shadow-md shadow-orange-950/40 mb-0.5"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 px-3">
                  <span>Press Enter to send message</span>
                  {limits && (
                    <span>
                      Daily: {limits.daily_remaining}/{limits.daily_limit}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Agents Selection Modal */}
      <AgentsPanel
        isOpen={showAgentsPanel}
        onClose={() => setShowAgentsPanel(false)}
        selectedAgentId={selectedAgentId}
        onSelectAgent={handleSelectAgent}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={(user) => {
          setIsAuthenticated(true);
          setCurrentUser(user);
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* Workspaces Management Modal */}
      <WorkspacesModal
        isOpen={showWorkspacesModal}
        onClose={() => setShowWorkspacesModal(false)}
        activeWorkspaceId={activeWorkspace?.id || null}
        onSelectWorkspace={(ws) => {
          setActiveWorkspace(ws);
          if (ws) {
            loadWorkspaceMessages(ws.id);
          }
        }}
        currentUser={currentUser}
      />
    </div>
  );
}
