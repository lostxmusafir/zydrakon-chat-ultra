"use client";

import React, { useState } from "react";
import {
  Globe,
  Server,
  Database,
  Cpu,
  Shield,
  Layers,
  Zap,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  Box,
  HardDrive,
  Cloud,
  CheckCircle2
} from "lucide-react";

export interface ArchitectureNode {
  id: string;
  title: string;
  category: "client" | "gateway" | "service" | "database" | "cache" | "queue" | "auth";
  description?: string;
  tech?: string[];
  status?: "active" | "standby";
}

export interface ArchitectureConnection {
  from: string;
  to: string;
  label?: string;
}

export interface ArchitectureDiagramData {
  title: string;
  description?: string;
  nodes: ArchitectureNode[];
  connections: ArchitectureConnection[];
}

interface ArchitectureDiagramProps {
  data?: ArchitectureDiagramData;
  codeRaw?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; icon: any }> = {
  client: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", icon: Globe },
  gateway: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", icon: Zap },
  service: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", icon: Server },
  database: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", icon: Database },
  cache: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", icon: HardDrive },
  queue: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", icon: Cpu },
  auth: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", icon: Shield },
};

const DEFAULT_DIAGRAM: ArchitectureDiagramData = {
  title: "Zydrakon AI System Architecture",
  description: "High-Performance Cloud AI Infrastructure & Streaming Pipeline",
  nodes: [
    { id: "client", title: "Next.js 16 Web Client", category: "client", description: "OLED Pitch Black UI, Live Streaming Engine", tech: ["Next.js", "React 19", "Tailwind CSS"] },
    { id: "gateway", title: "API Gateway & CORS", category: "gateway", description: "Rate Limiter, SSL Termination & Middleware", tech: ["FastAPI CORS", "Uvicorn"] },
    { id: "auth", title: "JWT Auth Guard", category: "auth", description: "Bearer Token Validator & User Sessions", tech: ["PyJWT", "Bcrypt"] },
    { id: "service", title: "FastAPI AI Orchestrator", category: "service", description: "Model Router, Multi-Key Round Robin Failover", tech: ["Python 3.12", "FastAPI", "AsyncIO"] },
    { id: "cache", title: "Response Cache Layer", category: "cache", description: "In-Memory LRU & Fast Query Cache", tech: ["Redis", "Memory Cache"] },
    { id: "database", title: "MongoDB Atlas Cloud", category: "database", description: "User Accounts, Sessions & Chat Trajectories", tech: ["MongoDB Atlas", "PyMongo"] },
    { id: "llm_openrouter", title: "OpenRouter Llama 3 / DeepSeek", category: "service", description: "Free Tier LLM Multi-Key Rotation", tech: ["OpenRouter API"] },
    { id: "llm_zhipu", title: "Zhipu AI GLM 4.5/4.7", category: "service", description: "High Speed Enterprise Reasoning Model", tech: ["Zhipu API"] },
    { id: "llm_mistral", title: "Mistral Large AI", category: "service", description: "Fallback Enterprise LLM Provider", tech: ["Mistral AI"] },
  ],
  connections: [
    { from: "client", to: "gateway", label: "HTTPS / REST" },
    { from: "gateway", to: "auth", label: "Validate Token" },
    { from: "gateway", to: "service", label: "Route Request" },
    { from: "service", to: "cache", label: "Cache Lookup" },
    { from: "service", to: "database", label: "Persist Session" },
    { from: "service", to: "llm_openrouter", label: "Model Query" },
    { from: "service", to: "llm_zhipu", label: "Gold Model Call" },
    { from: "service", to: "llm_mistral", label: "Failover Route" },
  ]
};

export function ArchitectureDiagram({ data = DEFAULT_DIAGRAM, codeRaw }: ArchitectureDiagramProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<"visual" | "svg">("visual");

  const parsedData = React.useMemo(() => {
    if (codeRaw) {
      try {
        return JSON.parse(codeRaw);
      } catch {
        return data;
      }
    }
    return data;
  }, [codeRaw, data]);

  // Download Standalone SVG / HTML Architecture File (Cocoon AI style)
  const handleDownloadHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${parsedData.title}</title>
  <style>
    body { background-color: #000000; color: #f4f4f5; font-family: system-ui, sans-serif; padding: 40px; margin: 0; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #f97316; font-size: 24px; margin-bottom: 8px; }
    p { color: #a1a1aa; font-size: 14px; margin-bottom: 30px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
    .card { background: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .card h3 { color: #ffffff; margin: 0 0 8px 0; font-size: 16px; }
    .card p { color: #a1a1aa; font-size: 12px; margin-bottom: 12px; }
    .badge { display: inline-block; background: #18181b; border: 1px solid #3f3f46; color: #f97316; font-size: 11px; padding: 4px 8px; border-radius: 8px; margin-right: 6px; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${parsedData.title}</h1>
    <p>${parsedData.description || "Generated by Zydrakon AI Architecture Generator"}</p>
    <div class="grid">
      ${parsedData.nodes.map((n: ArchitectureNode) => `
        <div class="card">
          <h3>${n.title}</h3>
          <p>${n.description || ""}</p>
          <div>${(n.tech || []).map((t: string) => `<span class="badge">${t}</span>`).join('')}</div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${parsedData.title.toLowerCase().replace(/\s+/g, '-')}-diagram.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`my-6 rounded-2xl border border-zinc-800 bg-[#09090b] text-zinc-100 overflow-hidden shadow-2xl transition-all ${isFullscreen ? "fixed inset-4 z-50 my-0 bg-[#000000]" : ""}`}>
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#0c0c0e] border-b border-zinc-800/90">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Layers className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              {parsedData.title}
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> System Architecture
              </span>
            </h3>
            {parsedData.description && (
              <p className="text-xs text-zinc-400">{parsedData.description}</p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadHtml}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-orange-500/40 text-xs font-medium text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span>Export HTML/SVG</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Visual Architecture Layout */}
      <div className="p-6 md:p-8 bg-[#000000] overflow-x-auto scrollbar-thin">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {parsedData.nodes.map((node: ArchitectureNode) => {
            const catStyle = CATEGORY_COLORS[node.category] || CATEGORY_COLORS.service;
            const IconComp = catStyle.icon;

            return (
              <div
                key={node.id}
                className={`group relative p-5 rounded-2xl border ${catStyle.border} bg-[#09090b] hover:bg-[#111115] transition-all duration-300 shadow-md hover:shadow-orange-500/10 hover:scale-[1.02]`}
              >
                {/* Header Icon + Category Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${catStyle.bg} border ${catStyle.border}`}>
                    <IconComp className={`w-5 h-5 ${catStyle.text} group-hover:scale-110 transition-transform`} />
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${catStyle.bg} ${catStyle.text} border ${catStyle.border}`}>
                    {node.category}
                  </span>
                </div>

                {/* Node Title & Description */}
                <h4 className="text-sm font-bold text-white mb-1.5 group-hover:text-orange-400 transition-colors">
                  {node.title}
                </h4>
                {node.description && (
                  <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                    {node.description}
                  </p>
                )}

                {/* Tech Stack Pills */}
                {node.tech && node.tech.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800/80">
                    {node.tech.map((t: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Data Flow Connections Summary Bar */}
        {parsedData.connections && parsedData.connections.length > 0 && (
          <div className="mt-8 pt-6 border-t border-zinc-800/80">
            <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-orange-400" /> Data Pipeline & Inter-Service Connections
            </h5>
            <div className="flex flex-wrap gap-2">
              {parsedData.connections.map((conn: ArchitectureConnection, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-mono"
                >
                  <span className="font-semibold text-orange-400">{conn.from}</span>
                  <span className="text-zinc-500">➔</span>
                  <span className="font-semibold text-white">{conn.to}</span>
                  {conn.label && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {conn.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
