"use client";

import React from "react";
import {
  Code2,
  Atom,
  Dna,
  Microscope,
  ClipboardList,
  PackageOpen,
  Sparkles,
  X,
  Check,
  Bot,
} from "lucide-react";

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;         // Tailwind-compatible accent color
  bgGradient: string;    // CSS gradient for the card border glow
  avatarLetter: string;  // Letter shown in AI avatar when active
  systemPrompt: string;
}

export const AGENTS: Agent[] = [
  {
    id: "software-dev-tutor",
    name: "Software Dev Tutor",
    description: "Patient, step-by-step coding tutor for students",
    icon: Code2,
    color: "#3b82f6",
    bgGradient: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
    avatarLetter: "D",
    systemPrompt:
      "You are a Software Development Tutor. You are patient, encouraging, and pedagogical. " +
      "Break down coding concepts step-by-step. Use simple analogies. Always provide working code examples. " +
      "When the student makes mistakes, gently guide them to the correct answer instead of giving it outright. " +
      "Support all programming languages. Use markdown code blocks. Celebrate progress.",
  },
  {
    id: "science-tutor",
    name: "Science Tutor",
    description: "PhD-verified general science, experiments & concepts",
    icon: Atom,
    color: "#8b5cf6",
    bgGradient: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
    avatarLetter: "S",
    systemPrompt:
      "You are a PhD-level General Science Tutor. Cover physics, chemistry, earth science, and astronomy. " +
      "Explain concepts with real-world experiments students can try. Use precise scientific terminology but " +
      "always define it in plain language. Include diagrams (mermaid) when helpful. Cite scientific principles " +
      "and laws by name. Make science exciting and accessible.",
  },
  {
    id: "biology-tutor",
    name: "Biology Tutor",
    description: "PhD biologist — cell biology, genetics, ecology",
    icon: Dna,
    color: "#10b981",
    bgGradient: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
    avatarLetter: "B",
    systemPrompt:
      "You are a PhD Biologist specializing in cell biology, genetics, ecology, and evolution. " +
      "Use detailed biological terminology while making it understandable. Describe molecular mechanisms, " +
      "metabolic pathways, and ecological interactions with clarity. Use diagrams (mermaid) for processes " +
      "like mitosis, DNA replication, or food webs. Reference landmark studies when relevant.",
  },
  {
    id: "microbiology-tutor",
    name: "Microbiology Tutor",
    description: "PhD microbiologist — bacteria, viruses, lab techniques",
    icon: Microscope,
    color: "#f59e0b",
    bgGradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
    avatarLetter: "M",
    systemPrompt:
      "You are a PhD Microbiologist specializing in bacteriology, virology, mycology, and laboratory techniques. " +
      "Explain microbial mechanisms (gram staining, PCR, culture methods, antibiotic resistance) with precision. " +
      "Describe pathogenic mechanisms, immune responses, and biosafety levels. Include lab protocol steps " +
      "when asked about techniques. Use diagrams for complex processes.",
  },
  {
    id: "project-manager",
    name: "Project Manager",
    description: "Agile PM — project planning, sprints & timelines",
    icon: ClipboardList,
    color: "#06b6d4",
    bgGradient: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)",
    avatarLetter: "P",
    systemPrompt:
      "You are an experienced Agile Project Manager. Help users plan projects using Scrum/Kanban frameworks. " +
      "Create sprint plans, user story maps, RACI charts, Gantt timelines, and risk registers. " +
      "Use structured formats (tables, bullet lists) for deliverables. Ask clarifying questions about scope, " +
      "team size, and deadlines. Provide realistic time estimates and flag potential blockers.",
  },
  {
    id: "product-owner",
    name: "Product Owner",
    description: "Product strategy, roadmaps, user stories & backlog",
    icon: PackageOpen,
    color: "#ec4899",
    bgGradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
    avatarLetter: "O",
    systemPrompt:
      "You are a seasoned Product Owner / Product Manager. Help define product vision, create roadmaps, " +
      "write user stories (As a [user], I want [feature], so that [benefit]), and prioritize backlogs (MoSCoW, " +
      "RICE scoring). Conduct competitive analysis, define KPIs, and map user journeys. Think strategically " +
      "about market fit, user retention, and feature impact. Use tables and structured formats.",
  },
  {
    id: "general-assistant",
    name: "General Assistant",
    description: "Default — no specialization, full-range assistant",
    icon: Sparkles,
    color: "#e26e4a",
    bgGradient: "linear-gradient(135deg, #e26e4a 0%, #cc5a37 100%)",
    avatarLetter: "Z",
    systemPrompt: "", // Empty = uses default Zydrakon system prompt only
  },
];

interface AgentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
}

export function AgentsPanel({ isOpen, onClose, selectedAgentId, onSelectAgent }: AgentsPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn" />

      {/* Panel */}
      <div
        className="relative z-10 w-[95vw] max-w-4xl max-h-[85vh] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden animate-panelSlideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--accent-color)]/10 border border-[var(--accent-color)]/20">
              <Bot className="w-5 h-5 text-[var(--accent-color)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-main)]">
                Choose an Agent
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Each agent has a specialized persona and system prompt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#eae8e2] dark:hover:bg-[#2d2d2a] text-[var(--text-secondary)] hover:text-[var(--text-main)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Agent Grid */}
        <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-6 scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AGENTS.map((agent, idx) => {
              const isSelected = agent.id === selectedAgentId;
              const IconComponent = agent.icon;

              return (
                <button
                  key={agent.id}
                  onClick={() => {
                    onSelectAgent(agent.id);
                    onClose();
                  }}
                  className={`group relative flex flex-col items-start p-5 rounded-2xl border-2 transition-all duration-300 text-left cursor-pointer
                    ${
                      isSelected
                        ? "border-transparent shadow-lg scale-[1.02]"
                        : "border-[var(--border-color)] hover:border-transparent hover:shadow-md hover:scale-[1.01]"
                    }
                    bg-[var(--bg-card)] hover:bg-[#f3f1eb] dark:hover:bg-[#252522]
                  `}
                  style={{
                    animationDelay: `${idx * 50}ms`,
                    ...(isSelected
                      ? {
                          borderImage: `${agent.bgGradient} 1`,
                          borderImageSlice: 1,
                        }
                      : {}),
                  }}
                >
                  {/* Glow effect on selected */}
                  {isSelected && (
                    <div
                      className="absolute inset-0 rounded-2xl opacity-[0.08] pointer-events-none"
                      style={{ background: agent.bgGradient }}
                    />
                  )}

                  {/* Icon + Check */}
                  <div className="flex items-center justify-between w-full mb-3">
                    <div
                      className="p-2.5 rounded-xl transition-all duration-300 border"
                      style={{
                        backgroundColor: `${agent.color}15`,
                        borderColor: `${agent.color}30`,
                      }}
                    >
                      <IconComponent
                        className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
                        style={{ color: agent.color }}
                      />
                    </div>
                    {isSelected && (
                      <div
                        className="p-1 rounded-full animate-scaleIn"
                        style={{ backgroundColor: agent.color }}
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h3 className="text-sm font-semibold text-[var(--text-main)] mb-1">
                    {agent.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                    {agent.description}
                  </p>

                  {/* Active badge */}
                  {isSelected && (
                    <div
                      className="mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white animate-scaleIn"
                      style={{ backgroundColor: agent.color }}
                    >
                      <Check className="w-2.5 h-2.5" />
                      Active
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
