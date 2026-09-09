"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Code, Check, Copy, RefreshCw, Sun, Moon } from "lucide-react";

interface MermaidProps {
  chart: string;
  isDarkMode?: boolean;
}

export default function Mermaid({ chart, isDarkMode = true }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [canvasTheme, setCanvasTheme] = useState<"grid" | "dark">("grid");

  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        securityLevel: "loose",
        suppressErrorRendering: true,
        fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
        themeVariables: {
          darkMode: false,
          background: "transparent",
          primaryColor: "#FFB74D",
          primaryBorderColor: "#18181B",
          primaryTextColor: "#111827",
          secondaryColor: "#9397EC",
          secondaryBorderColor: "#18181B",
          secondaryTextColor: "#111827",
          tertiaryColor: "#4DD0E1",
          tertiaryBorderColor: "#18181B",
          tertiaryTextColor: "#111827",
          lineColor: "#18181B",
          textColor: "#111827",
          mainBkg: "transparent",
          nodeBorder: "#18181B",
          clusterBkg: "#F8FAFC",
          clusterBorder: "#94A3B8",
          edgeLabelBackground: "#FFFFFF",
          actorBkg: "#FFB74D",
          actorBorder: "#18181B",
          actorTextColor: "#111827",
          actorLineColor: "#18181B",
          signalColor: "#18181B",
          signalTextColor: "#111827",
          labelBoxBkgColor: "#FFFFFF",
          labelBoxBorderColor: "#18181B",
          labelTextColor: "#111827",
          loopTextColor: "#111827",
          noteBkgColor: "#FEF08A",
          noteBorderColor: "#18181B",
          noteTextColor: "#111827",
          fontSize: "13px"
        }
      });
      (mermaid as any).parseError = () => {};
    } catch (e) {
      console.error("Failed to initialize mermaid", e);
    }
  }, []);

  const sanitizeMermaidChart = (input: string): string => {
    let cleaned = input.trim();

    // 1. Remove markdown code block fences if present
    cleaned = cleaned.replace(/^```mermaid\s*/i, "").replace(/```$/g, "").trim();

    // 2. Strip headers/titles placed before the diagram definition
    const diagramKeywords = /(graph|flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram|erDiagram|journey|pie|gitGraph|mindmap|architecture)/i;
    const match = cleaned.match(diagramKeywords);
    if (match && match.index && match.index > 0) {
      cleaned = cleaned.substring(match.index);
    }

    // 3. Ensure a valid diagram keyword starts the code
    if (!diagramKeywords.test(cleaned)) {
      cleaned = `flowchart TD\n${cleaned}`;
    }

    // 4. Normalize literal \n or \\n inside diagram nodes to <br/>
    cleaned = cleaned.replace(/\\n/g, "<br/>");
    // Also convert any unescaped newlines inside quotes to <br/>
    cleaned = cleaned.replace(/\["([^"]*?)"\]/g, (match, inner) => {
      return `["${inner.replace(/[\r\n]+/g, '<br/>')}"]`;
    });

    // 5. Wrap unquoted bracket labels that have special characters (like (, ), :, -, &, etc.) in quotes
    cleaned = cleaned.replace(/([A-Za-z0-9_-]+)\[([^"\]\r\n]+)\]/g, (match, id, inner) => {
      const trimmed = inner.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) return match;
      const cleanInner = trimmed.replace(/"/g, "'").replace(/&/g, "and");
      return `${id}["${cleanInner}"]`;
    });

    // 6. Flowchart-only adjustments
    if (/^\s*(graph|flowchart)/i.test(cleaned)) {
      cleaned = cleaned.replace(/(\s+)->(\s+)/g, "$1-->$2");
    }

    // 7. Inject Vibrant Pastel Palette classDefs if not already present
    if (!cleaned.includes("classDef cOrange") && /^\s*(graph|flowchart)/i.test(cleaned)) {
      const paletteClassDefs = `
    classDef cOrange fill:#FFB74D,stroke:#18181B,stroke-width:2px,color:#111827,font-weight:600;
    classDef cPurple fill:#9397EC,stroke:#18181B,stroke-width:2px,color:#111827,font-weight:600;
    classDef cPink fill:#FF70C0,stroke:#18181B,stroke-width:2px,color:#111827,font-weight:600;
    classDef cTeal fill:#4DD0E1,stroke:#18181B,stroke-width:2px,color:#111827,font-weight:600;
    classDef cBlue fill:#4FC3F7,stroke:#18181B,stroke-width:2px,color:#111827,font-weight:600;
    classDef cGreen fill:#6EE7B7,stroke:#18181B,stroke-width:2px,color:#111827,font-weight:600;
      `;

      // Append classDefs after diagram header
      cleaned = cleaned.replace(/^((?:flowchart|graph)\s+[A-Za-z]+)/im, `$1\n${paletteClassDefs}`);

      // Auto-assign classes to nodes without an explicit class
      const paletteCycle = ["cOrange", "cPurple", "cTeal", "cBlue", "cGreen", "cOrange"];
      let cycleIdx = 0;

      // 1. Diamonds always get Pink (Prototyping/Decision style)
      cleaned = cleaned.replace(/([A-Za-z0-9_-]+)\s*\{([^}]+)\}(?!:::)/g, (match, id, text) => {
        return `${id}{${text}}:::cPink`;
      });

      // 2. Rectangles [ ... ] safely matched without breaking on inner parens
      cleaned = cleaned.replace(/([A-Za-z0-9_-]+)\s*\[([^\]]+)\](?!:::)/g, (match, id, text) => {
        const assignedClass = paletteCycle[cycleIdx % paletteCycle.length];
        cycleIdx++;
        return `${id}[${text}]:::${assignedClass}`;
      });

      // 3. Rounded nodes ( ... ) safely matched only when standalone
      cleaned = cleaned.replace(/(?<!\[)(?:^|\s+)([A-Za-z0-9_-]+)\s*\(([^)]+)\)(?!:::)/g, (match, id, text) => {
        const assignedClass = paletteCycle[cycleIdx % paletteCycle.length];
        cycleIdx++;
        return ` ${id}(${text}):::${assignedClass}`;
      });
    }

    // 8. General replacement of unescaped & in text blocks
    cleaned = cleaned.replace(/(\w+)\s+&\s+(\w+)/g, "$1 and $2");

    // 9. Streaming safety: Auto-balance unclosed quotes and brackets
    const quoteMatches = cleaned.match(/"/g);
    if (quoteMatches && quoteMatches.length % 2 !== 0) {
      cleaned += '"';
    }
    const openBracketCount = (cleaned.match(/\[/g) || []).length;
    const closeBracketCount = (cleaned.match(/\]/g) || []).length;
    if (openBracketCount > closeBracketCount) {
      cleaned += ']';
    }

    return cleaned;
  };

  const fixSvgContrast = (svgString: string): string => {
    if (!svgString) return svgString;
    let fixed = svgString;

    const styleInjection = `<style>
      svg {
        font-family: var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
      .node rect, .node circle, .node ellipse, .node polygon, .node path {
        stroke: #18181b !important;
        stroke-width: 2px !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
        rx: 8px;
        ry: 8px;
      }
      .node .label, .node text, .actor text, .label text, text.actor {
        font-family: var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
        fill: #111827 !important;
        color: #111827 !important;
        font-size: 13px !important;
        font-weight: 600 !important;
      }
      .edgePath .path, .edgePath path {
        stroke: #18181b !important;
        stroke-width: 2px !important;
        stroke-linecap: round !important;
      }
      .edgePath marker path, marker[id*="arrow"] path, marker[id*="flowchart-point"] path {
        fill: #18181b !important;
        stroke: #18181b !important;
      }
      .cluster rect {
        fill: #f8fafc !important;
        stroke: #94a3b8 !important;
        stroke-width: 1.5px !important;
        stroke-dasharray: 4,4 !important;
        rx: 12px !important;
      }
      .cluster text, .cluster .label {
        fill: #334155 !important;
        font-weight: 700 !important;
        font-size: 12px !important;
        letter-spacing: 0.04em !important;
      }
      .edgeLabel rect {
        fill: #ffffff !important;
        stroke: #18181b !important;
        stroke-width: 1px !important;
        rx: 4px !important;
      }
      .edgeLabel text, .edgeLabel span {
        fill: #111827 !important;
        color: #111827 !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
      }
    </style>`;

    if (fixed.includes("</style>")) {
      fixed = fixed.replace("</style>", `${styleInjection}</style>`);
    } else {
      fixed = fixed.replace(/(<svg[^>]*>)/i, `$1${styleInjection}`);
    }

    return fixed;
  };

  const generateVisualFlowchartSvg = (input: string): string => {
    // 1. Normalize line endings, literal \n, and <br/>
    const rawInput = input
      .replace(/^```mermaid\s*/i, "")
      .replace(/```$/g, "")
      .replace(/\\n/g, "\n")
      .replace(/<br\s*\/?>/gi, "\n");

    const cleanLines = rawInput
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !/^(flowchart|graph|subgraph|end|sequenceDiagram|classDiagram|%%|style\s+|classDef\s+)/i.test(l));

    interface VisualNode {
      id: string;
      title: string;
      details: string[];
      isDiamond?: boolean;
    }

    const nodes: VisualNode[] = [];

    const addNodeFromText = (id: string, text: string, isDiamond = false) => {
      let rawText = text.trim();
      rawText = rawText.replace(/^["']+|["']+$/g, "").replace(/:::[A-Za-z0-9_-]+/g, "");
      const parts = rawText
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);

      if (parts.length === 0) return;

      const title = parts[0].replace(/^[-•*]\s*/, "");
      const details = parts.slice(1).map((d) => d.replace(/^[-•*]\s*/, "• "));

      const existing = nodes.find((n) => n.id === id);
      if (!existing) {
        nodes.push({ id, title, details, isDiamond });
      } else if (details.length > 0 && existing.details.length === 0) {
        existing.details = details;
      }
    };

    for (const line of cleanLines) {
      const arrowMatch = line.match(/(.+?)(?:-->|->|-->>)(.+)/);
      if (arrowMatch) {
        const left = arrowMatch[1].trim();
        const right = arrowMatch[2].trim();

        const parseSegment = (raw: string) => {
          const diamondMatch = raw.match(/([a-zA-Z0-9_-]+)\s*\{["']?([\s\S]*?)["']?\}/);
          if (diamondMatch) {
            addNodeFromText(diamondMatch[1], diamondMatch[2], true);
            return diamondMatch[1];
          }
          const m = raw.match(/([a-zA-Z0-9_-]+)\s*(?:\[["']?([\s\S]*?)["']?\]|\(["']?([\s\S]*?)["']?\))?/);
          if (m) {
            const id = m[1];
            const text = m[2] || m[3] || id;
            addNodeFromText(id, text);
            return id;
          }
          return raw;
        };

        parseSegment(left);
        parseSegment(right);
      } else {
        const diamondMatch = line.match(/^([a-zA-Z0-9_-]+)\s*\{["']?([\s\S]*?)["']?\}/);
        if (diamondMatch) {
          addNodeFromText(diamondMatch[1], diamondMatch[2], true);
        } else {
          const nodeDefMatch = line.match(/^([a-zA-Z0-9_-]+)\s*(\[|\(|\{)\s*["']?([\s\S]*?)["']?\s*(\]|\)|\})/);
          if (nodeDefMatch) {
            addNodeFromText(nodeDefMatch[1], nodeDefMatch[3]);
          } else {
            const cleanText = line
              .replace(/^[a-zA-Z0-9_-]+\s*[:\[]\s*/, "")
              .replace(/[\]"']/g, "")
              .trim();
            if (cleanText.length > 0 && cleanText.length < 150) {
              addNodeFromText(`node_${nodes.length + 1}`, cleanText);
            }
          }
        }
      }
    }

    if (nodes.length === 0) {
      nodes.push({ id: "1", title: "Workflow Ready", details: [] });
    }

    // Keep visual flowchart compact (maximum 7 key stages to prevent endless vertical towers)
    const displayNodes = nodes.slice(0, 7);

    const nodeWidth = 400;
    const gap = 36;
    const totalWidth = 460;
    const centerX = totalWidth / 2;

    const escapeXml = (unsafe: string): string => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    // Color palette from user's image
    const palette = [
      { bg: "#FFB74D", border: "#18181B" }, // Orange (Brainstorming)
      { bg: "#9397EC", border: "#18181B" }, // Purple (Trends / Research)
      { bg: "#FF70C0", border: "#18181B" }, // Pink (Prototyping / Diamond)
      { bg: "#4DD0E1", border: "#18181B" }, // Teal (Design / Implementation)
      { bg: "#4FC3F7", border: "#18181B" }, // Sky Blue (Review / Refinement)
      { bg: "#6EE7B7", border: "#18181B" }  // Mint Green
    ];

    const nodeHeights = displayNodes.map((n) => Math.max(56, 36 + (n.details.length > 0 ? n.details.length * 20 : 0)));
    let totalHeight = 40;
    nodeHeights.forEach((h) => {
      totalHeight += h + gap;
    });

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" style="max-width: 540px; font-family: var(--font-inter), system-ui, -apple-system, sans-serif; display: block; margin: 0 auto;">
      <defs>
        <marker id="sharpArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#18181B"/>
        </marker>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.1"/>
        </filter>
      </defs>`;

    let currentY = 24;

    displayNodes.forEach((node, idx) => {
      const h = nodeHeights[idx];
      const y = currentY;
      const x = centerX - nodeWidth / 2;

      // Select color: diamonds always get pink, others cycle
      const col = node.isDiamond ? palette[2] : palette[idx % palette.length];

      if (idx > 0) {
        const prevH = nodeHeights[idx - 1];
        const prevY = currentY - gap;
        svgContent += `
          <line x1="${centerX}" y1="${prevY}" x2="${centerX}" y2="${y - 4}" stroke="#18181B" stroke-width="2" marker-end="url(#sharpArrow)"/>
        `;
      }

      const badgeY = y + 26;

      let detailTexts = "";
      if (node.details.length > 0) {
        node.details.forEach((det, dIdx) => {
          detailTexts += `<text x="${x + 48}" y="${y + 44 + dIdx * 19}" font-size="11.5" font-weight="600" fill="#18181B">${escapeXml(det)}</text>`;
        });
      }

      const titleY = node.details.length > 0 ? y + 23 : y + h / 2 + 5;

      svgContent += `
        <g filter="url(#softShadow)">
          <rect x="${x}" y="${y}" width="${nodeWidth}" height="${h}" rx="8" fill="${col.bg}" stroke="${col.border}" stroke-width="2"/>
          <circle cx="${x + 24}" cy="${badgeY}" r="11" fill="#18181B" opacity="0.12"/>
          <text x="${x + 24}" y="${badgeY + 4}" font-size="11" font-weight="700" fill="#18181B" text-anchor="middle">${idx + 1}</text>
          <text x="${x + 46}" y="${titleY}" font-size="13" font-weight="700" fill="#111827">${escapeXml(node.title)}</text>
          ${detailTexts}
        </g>
      `;

      currentY += h + gap;
    });

    svgContent += `</svg>`;
    return svgContent;
  };

  useEffect(() => {
    let isMounted = true;

    setError(null);

    const renderTimer = setTimeout(async () => {
      if (!chart.trim()) return;

      const id = `mermaid-svg-${Math.random().toString(36).substring(2, 11)}`;
      const sanitizedChart = sanitizeMermaidChart(chart);

      try {
        const { svg: renderedSvg } = await mermaid.render(id, sanitizedChart);

        if (isMounted) {
          setError(null);
          setSvg(fixSvgContrast(renderedSvg));
        }
      } catch (err) {
        try {
          const fallbackId = `mermaid-fb-${Math.random().toString(36).substring(2, 11)}`;
          let rawClean = chart.replace(/^```mermaid\s*/i, "").replace(/```$/g, "").trim();
          if (!/(graph|flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram|erDiagram|journey|pie|gitGraph|mindmap)/i.test(rawClean)) {
            rawClean = "flowchart TD\n" + rawClean;
          }

          const { svg: fallbackSvg } = await mermaid.render(fallbackId, rawClean);
          if (isMounted) {
            setError(null);
            setSvg(fixSvgContrast(fallbackSvg));
          }
        } catch {
          const orphanEl = document.getElementById(id) || document.getElementById(`d${id}`);
          if (orphanEl) orphanEl.remove();

          if (isMounted) {
            const visualSvg = generateVisualFlowchartSvg(chart);
            setSvg(visualSvg);
            setError(null);
          }
        }
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(renderTimer);
    };
  }, [chart, isDarkMode, canvasTheme]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={ref}
      className={`my-5 rounded-2xl border shadow-xl overflow-x-auto scrollbar-thin select-none max-w-full relative group transition-colors ${
        canvasTheme === "grid"
          ? "border-zinc-300/80 bg-[#FAFAFA] [background-image:radial-gradient(#CBD5E1_1.5px,transparent_1.5px)] [background-size:20px_20px]"
          : "border-zinc-800/80 bg-[#18181B]/95 [background-image:radial-gradient(rgba(255,255,255,0.08)_1.5px,transparent_1.5px)] [background-size:20px_20px]"
      } p-4`}
    >
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-zinc-300/60 dark:border-zinc-800/60 text-xs font-medium select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFB74D] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#9397EC] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF70C0] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#4DD0E1] inline-block" />
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wider ${canvasTheme === "grid" ? "text-zinc-800" : "text-zinc-200"}`}>
            Flowchart
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCanvasTheme(canvasTheme === "grid" ? "dark" : "grid")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
              canvasTheme === "grid"
                ? "bg-white/80 hover:bg-white text-zinc-700 border-zinc-300 shadow-sm"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            }`}
            title="Toggle Canvas Theme"
          >
            {canvasTheme === "grid" ? <Moon className="w-3 h-3 text-zinc-600" /> : <Sun className="w-3 h-3 text-amber-400" />}
            <span>{canvasTheme === "grid" ? "Dark Mode" : "Dot Grid"}</span>
          </button>

          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
              canvasTheme === "grid"
                ? "bg-white/80 hover:bg-white text-zinc-700 border-zinc-300 shadow-sm"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            }`}
            title="Copy Mermaid Code"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      {svg ? (
        <div
          className="select-none [&>svg]:mx-auto [&>svg]:block [&>svg]:max-w-full [&>svg]:h-auto py-3"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="text-xs text-zinc-500 animate-pulse font-mono py-8 text-center flex items-center justify-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF70C0] animate-ping" />
          <span>Rendering colorful flowchart...</span>
        </div>
      )}
    </div>
  );
}
