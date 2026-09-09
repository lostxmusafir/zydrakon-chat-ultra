"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Check, Copy } from "lucide-react";

interface MermaidProps {
  chart: string;
  isDarkMode?: boolean;
}

export default function Mermaid({ chart, isDarkMode = true }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: "base",
        securityLevel: "loose",
        suppressErrorRendering: true,
        fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
        themeVariables: {
          darkMode: true,
          background: "transparent",
          primaryColor: "#FFB74D",
          primaryBorderColor: "#F59E0B",
          primaryTextColor: "#09090B",
          secondaryColor: "#A5B4FC",
          secondaryBorderColor: "#818CF8",
          secondaryTextColor: "#09090B",
          tertiaryColor: "#5EEAD4",
          tertiaryBorderColor: "#14B8A6",
          tertiaryTextColor: "#09090B",
          lineColor: "#F1F5F9",
          textColor: "#09090B",
          mainBkg: "transparent",
          nodeBorder: "#F59E0B",
          clusterBkg: "rgba(255, 255, 255, 0.03)",
          clusterBorder: "#52525B",
          edgeLabelBackground: "#18181B",
          actorBkg: "#FFB74D",
          actorBorder: "#F59E0B",
          actorTextColor: "#09090B",
          actorLineColor: "#F1F5F9",
          signalColor: "#F1F5F9",
          signalTextColor: "#F4F4F5",
          labelBoxBkgColor: "#18181B",
          labelBoxBorderColor: "#52525B",
          labelTextColor: "#F4F4F5",
          loopTextColor: "#F4F4F5",
          noteBkgColor: "#FEF08A",
          noteBorderColor: "#EAB308",
          noteTextColor: "#09090B",
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

    // 7. Inject Vibrant High-Contrast Pastel Palette classDefs if not already present
    if (!cleaned.includes("classDef cOrange") && /^\s*(graph|flowchart)/i.test(cleaned)) {
      const paletteClassDefs = `
    classDef cOrange fill:#FFB74D,stroke:#F59E0B,stroke-width:2px,color:#09090B,font-weight:700;
    classDef cPurple fill:#A5B4FC,stroke:#818CF8,stroke-width:2px,color:#09090B,font-weight:700;
    classDef cPink fill:#F472B6,stroke:#EC4899,stroke-width:2px,color:#09090B,font-weight:700;
    classDef cTeal fill:#5EEAD4,stroke:#14B8A6,stroke-width:2px,color:#09090B,font-weight:700;
    classDef cBlue fill:#7DD3FC,stroke:#0284C7,stroke-width:2px,color:#09090B,font-weight:700;
    classDef cGreen fill:#86EFAC,stroke:#22C55E,stroke-width:2px,color:#09090B,font-weight:700;
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
        background: transparent !important;
      }
      .node rect, .node circle, .node ellipse, .node polygon, .node path {
        stroke-width: 2px !important;
        stroke-linecap: round !important;
        stroke-linejoin: round !important;
        rx: 8px;
        ry: 8px;
      }
      .node .label, .node text, .actor text, .label text, text.actor {
        font-family: var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
        fill: #09090b !important;
        color: #09090b !important;
        font-size: 13px !important;
        font-weight: 700 !important;
      }
      /* Lines & arrows: bright off-white so they contrast against the dark background */
      .edgePath .path, .edgePath path {
        stroke: #f1f5f9 !important;
        stroke-width: 2px !important;
        stroke-linecap: round !important;
      }
      .edgePath marker path, marker[id*="arrow"] path, marker[id*="flowchart-point"] path {
        fill: #f1f5f9 !important;
        stroke: #f1f5f9 !important;
      }
      .cluster rect {
        fill: rgba(255, 255, 255, 0.03) !important;
        stroke: #52525b !important;
        stroke-width: 1.5px !important;
        stroke-dasharray: 4,4 !important;
        rx: 12px !important;
      }
      .cluster text, .cluster .label {
        fill: #e4e4e7 !important;
        font-weight: 700 !important;
        font-size: 12px !important;
        letter-spacing: 0.04em !important;
      }
      .edgeLabel rect {
        fill: #18181b !important;
        stroke: #52525b !important;
        stroke-width: 1px !important;
        rx: 4px !important;
      }
      .edgeLabel text, .edgeLabel span {
        fill: #f4f4f5 !important;
        color: #f4f4f5 !important;
        font-size: 11px !important;
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

    const nodeWidth = 380;
    const gap = 32;
    const totalWidth = 440;
    const centerX = totalWidth / 2;

    const escapeXml = (unsafe: string): string => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    // Color palette with high contrast against dark background
    const palette = [
      { bg: "#FFB74D", border: "#F59E0B" }, // Orange (Brainstorming)
      { bg: "#A5B4FC", border: "#818CF8" }, // Purple (Trends / Research)
      { bg: "#F472B6", border: "#EC4899" }, // Pink (Prototyping / Diamond)
      { bg: "#5EEAD4", border: "#14B8A6" }, // Teal (Design / Implementation)
      { bg: "#7DD3FC", border: "#0284C7" }, // Sky Blue (Review / Refinement)
      { bg: "#86EFAC", border: "#22C55E" }  // Mint Green
    ];

    const nodeHeights = displayNodes.map((n) => Math.max(54, 34 + (n.details.length > 0 ? n.details.length * 18 : 0)));
    let totalHeight = 40;
    nodeHeights.forEach((h) => {
      totalHeight += h + gap;
    });

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" style="max-width: 520px; font-family: var(--font-inter), system-ui, -apple-system, sans-serif; display: block; margin: 0 auto; background: transparent;">
      <defs>
        <marker id="sharpArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#F1F5F9"/>
        </marker>
        <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.3"/>
        </filter>
      </defs>`;

    let currentY = 20;

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
          <line x1="${centerX}" y1="${prevY}" x2="${centerX}" y2="${y - 4}" stroke="#F1F5F9" stroke-width="2" marker-end="url(#sharpArrow)"/>
        `;
      }

      const badgeY = y + 25;

      let detailTexts = "";
      if (node.details.length > 0) {
        node.details.forEach((det, dIdx) => {
          detailTexts += `<text x="${x + 46}" y="${y + 42 + dIdx * 18}" font-size="11" font-weight="600" fill="#09090B">${escapeXml(det)}</text>`;
        });
      }

      const titleY = node.details.length > 0 ? y + 22 : y + h / 2 + 5;

      svgContent += `
        <g filter="url(#softGlow)">
          <rect x="${x}" y="${y}" width="${nodeWidth}" height="${h}" rx="8" fill="${col.bg}" stroke="${col.border}" stroke-width="2"/>
          <circle cx="${x + 22}" cy="${badgeY}" r="11" fill="#000000" opacity="0.14"/>
          <text x="${x + 22}" y="${badgeY + 4}" font-size="11" font-weight="700" fill="#09090B" text-anchor="middle">${idx + 1}</text>
          <text x="${x + 44}" y="${titleY}" font-size="13" font-weight="700" fill="#09090B">${escapeXml(node.title)}</text>
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
  }, [chart, isDarkMode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={ref}
      className="my-5 bg-transparent overflow-x-auto scrollbar-thin select-none max-w-full relative group"
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-10 bg-zinc-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Copy Mermaid Code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      {svg ? (
        <div
          className="select-none [&>svg]:mx-auto [&>svg]:block [&>svg]:max-w-full [&>svg]:h-auto py-2"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="text-xs text-zinc-500 animate-pulse font-mono py-6 text-center flex items-center justify-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FF70C0] animate-ping" />
          <span>Rendering flowchart...</span>
        </div>
      )}
    </div>
  );
}
