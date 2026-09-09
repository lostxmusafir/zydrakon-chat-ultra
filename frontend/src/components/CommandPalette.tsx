"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  MessageSquare,
  Sparkles,
  Zap,
  Shield,
  Feather,
  Users,
  Plus,
  Trash2,
  Lock,
  Globe,
  Bot,
  X,
  ArrowRight,
  Command
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  category: "Actions" | "Models" | "Views" | "Tools";
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectModel: (modelId: string) => void;
  onSwitchView: (view: "chat" | "writer" | "workspace") => void;
  onOpenAdmin: () => void;
  onOpenAgents: () => void;
  onOpenWorkspaces: () => void;
  onOpenChangePassword: () => void;
  onClearHistory: () => void;
  currentModel: string;
}

export function CommandPalette({
  isOpen,
  onClose,
  onNewChat,
  onSelectModel,
  onSwitchView,
  onOpenAdmin,
  onOpenAgents,
  onOpenWorkspaces,
  onOpenChangePassword,
  onClearHistory,
  currentModel,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const items: CommandItem[] = [
    {
      id: "new-chat",
      title: "New Chat Session",
      category: "Actions",
      icon: <Plus className="w-4 h-4 text-orange-400" />,
      shortcut: "Ctrl+N",
      action: () => {
        onNewChat();
        onClose();
      },
    },
    {
      id: "model-free",
      title: "Switch to Zydrakon AI (Free)",
      category: "Models",
      icon: <Zap className="w-4 h-4 text-blue-400" />,
      action: () => {
        onSelectModel("zydrakon-free");
        onClose();
      },
    },
    {
      id: "model-gold",
      title: "Switch to Zydrakon AI (Gold)",
      category: "Models",
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
      action: () => {
        onSelectModel("zhipu-free");
        onClose();
      },
    },
    {
      id: "model-premium",
      title: "Switch to Zydrakon AI Premium",
      category: "Models",
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      action: () => {
        onSelectModel("zydrakon-premium");
        onClose();
      },
    },
    {
      id: "view-chat",
      title: "Switch to Chat View",
      category: "Views",
      icon: <MessageSquare className="w-4 h-4 text-zinc-400" />,
      action: () => {
        onSwitchView("chat");
        onClose();
      },
    },
    {
      id: "view-writer",
      title: "Switch to Live AI Writer Studio",
      category: "Views",
      icon: <Feather className="w-4 h-4 text-orange-400" />,
      action: () => {
        onSwitchView("writer");
        onClose();
      },
    },
    {
      id: "view-workspace",
      title: "Switch to Team Workspaces",
      category: "Views",
      icon: <Users className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onSwitchView("workspace");
        onClose();
      },
    },
    {
      id: "open-agents",
      title: "Change AI Persona / Specialized Agents",
      category: "Tools",
      icon: <Bot className="w-4 h-4 text-cyan-400" />,
      action: () => {
        onOpenAgents();
        onClose();
      },
    },
    {
      id: "open-admin",
      title: "Open Admin Control Center",
      category: "Tools",
      icon: <Shield className="w-4 h-4 text-red-400" />,
      action: () => {
        onOpenAdmin();
        onClose();
      },
    },
    {
      id: "open-workspaces",
      title: "Manage Workspaces & Members",
      category: "Tools",
      icon: <Users className="w-4 h-4 text-amber-400" />,
      action: () => {
        onOpenWorkspaces();
        onClose();
      },
    },
    {
      id: "change-password",
      title: "Change Account Password",
      category: "Tools",
      icon: <Lock className="w-4 h-4 text-zinc-400" />,
      action: () => {
        onOpenChangePassword();
        onClose();
      },
    },
    {
      id: "clear-history",
      title: "Clear All Chat Sessions",
      category: "Actions",
      icon: <Trash2 className="w-4 h-4 text-red-500" />,
      action: () => {
        onClearHistory();
        onClose();
      },
    },
  ];

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/75 backdrop-blur-md animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#09090b] border border-zinc-800/90 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col animate-panelSlideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-zinc-800/80 gap-3">
          <Search className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search actions..."
            className="flex-1 bg-transparent text-sm md:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400">
            <span>ESC</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto scrollbar-thin p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs font-mono">
              No commands matching &quot;{query}&quot;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-orange-500/10 text-orange-200 border border-orange-500/30"
                      : "text-zinc-300 hover:bg-zinc-900/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-xl border ${
                        isSelected
                          ? "bg-orange-500/20 border-orange-500/40"
                          : "bg-zinc-900/80 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {item.icon}
                    </div>
                    <span className="text-xs md:text-sm font-medium">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-900/80 text-zinc-500 border border-zinc-800/80">
                      {item.category}
                    </span>
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0e0e12] border-t border-zinc-900 text-[11px] text-zinc-500">
          <div className="flex items-center gap-3">
            <span><strong className="text-zinc-300">↑↓</strong> Navigate</span>
            <span><strong className="text-zinc-300">↵</strong> Select</span>
            <span><strong className="text-zinc-300">ESC</strong> Close</span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="w-3 h-3 text-orange-400" />
            <span>Zydrakon Spotlight</span>
          </div>
        </div>
      </div>
    </div>
  );
}
