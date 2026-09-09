"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Code, Check, Copy, RefreshCw } from "lucide-react";

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
          background: "#18181b",
          primaryColor: "#26262b",
          primaryBorderColor: "#cc785c",
          primaryTextColor: "#f4f4f5",
          secondaryColor: "#1f1f24",
          secondaryBorderColor: "#3f3f46",
          secondaryTextColor: "#e4e4e7",
          tertiaryColor: "#18181b",
          tertiaryBorderColor: "#27272a",
          tertiaryTextColor: "#a1a1aa",
          lineColor: "#9ca3af",
          textColor: "#f4f4f5",
          mainBkg: "#26262b",
          nodeBorder: "#cc785c",
          clusterBkg: "#18181b",
          clusterBorder: "#3f3f46",
          edgeLabelBackground: "#18181b",
          actorBkg: "#26262b",
          actorBorder: "#cc785c",
          actorTextColor: "#f4f4f5",
          actorLineColor: "#71717a",
          signalColor: "#cc785c",
          signalTextColor: "#f4f4f5",
          labelBoxBkgColor: "#26262b",
          labelBoxBorderColor: "#cc785c",
          labelTextColor: "#f4f4f5",
          loopTextColor: "#f4f4f5",
          noteBkgColor: "#2a2b32",
          noteBorderColor: "#cc785c",
          noteTextColor: "#f4f4f5",
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

    // 7. Sequence diagram adjustments
    if (/^\s*sequenceDiagram/i.test(cleaned)) {
      // Clean participant/actor labels so literal quotes don't appear in nodes
      cleaned = cleaned.replace(/^\s*(participant|actor)\s+([A-Za-z0-9_]+)\s+as\s+"?([^"\r\n]+)"?$/gmi, (match, type, id, label) => {
        const cleanLabel = label.trim().replace(/^"+|"+$/g, "");
        return `${type} ${id} as ${cleanLabel}`;
      });

      // Format Note over Actor1, Actor2 (add space after comma if missing)
      cleaned = cleaned.replace(/Note\s+over\s+([A-Za-z0-9_]+),([A-Za-z0-9_]+):/gi, "Note over $1, $2:");

      // Replace bare ampersands inside message lines to avoid lexer conflicts
      cleaned = cleaned.replace(/^(\s*[\w\s()]+(?:->>|-->>|->|-->|-[xX]|--[xX]|\+|-)\s*[\w\s()]+:\s*)(.+)$/gm, (match, prefix, msg) => {
        let trimmedMsg = msg.trim();
        trimmedMsg = trimmedMsg.replace(/\s+&\s+/g, " and ");
        if (trimmedMsg.includes('"')) {
          if (!(trimmedMsg.startsWith('"') && trimmedMsg.endsWith('"') && (trimmedMsg.match(/"/g) || []).length === 2)) {
            trimmedMsg = trimmedMsg.replace(/"/g, "'");
          }
        }
        return `${prefix}${trimmedMsg}`;
      });
    }

    // 8. Fix style lines with light background fills to force dark high-contrast text
    cleaned = cleaned.replace(/style\s+([A-Za-z0-9_]+)\s+fill\s*:\s*(#[89a-fA-F][0-9a-fA-F]{2,5}|lightgreen|lime|cyan|yellow|#90ee90|#86efac|#a7f3d0)([^,\n]*)/gi, (match, nodeId, fillHex, rest) => {
      if (!/color\s*:\s*/i.test(rest)) {
        return `style ${nodeId} fill:${fillHex},color:#000000,font-weight:bold${rest}`;
      }
      return match.replace(/color\s*:\s*(#fff|#ffffff|white|#f4f4f5|#ececff)/gi, "color:#000000,font-weight:bold");
    });

    // 9. General replacement of unescaped & in text blocks
    cleaned = cleaned.replace(/(\w+)\s+&\s+(\w+)/g, "$1 and $2");

    // 10. Streaming safety: Auto-balance unclosed quotes and brackets
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
        fill: #26262b !important;
        stroke: #cc785c !important;
        stroke-width: 1.5px !important;
        rx: 8px !important;
        ry: 8px !important;
      }
      .node .label, .node text, .actor text, .label text, text.actor {
        font-family: var(--font-inter), system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
        fill: #f4f4f5 !important;
        color: #f4f4f5 !important;
        font-size: 13px !important;
        font-weight: 500 !important;
      }
      .edgePath .path, .edgePath path {
        stroke: #9ca3af !important;
        stroke-width: 1.5px !important;
      }
      .edgePath marker path, marker[id*="arrow"] path, marker[id*="flowchart-point"] path {
        fill: #cc785c !important;
        stroke: #cc785c !important;
      }
      .cluster rect {
        fill: #18181b !important;
        stroke: #3f3f46 !important;
        stroke-width: 1.2px !important;
        rx: 12px !important;
      }
      .cluster text, .cluster .label {
        fill: #e4e4e7 !important;
        font-weight: 600 !important;
        font-size: 12px !important;
        letter-spacing: 0.04em !important;
      }
      .edgeLabel rect {
        fill: #18181b !important;
        rx: 4px !important;
      }
      .edgeLabel text, .edgeLabel span {
        fill: #cbd5e1 !important;
        color: #cbd5e1 !important;
        font-size: 11.5px !important;
      }
    </style>`;

    if (fixed.includes("</style>")) {
      fixed = fixed.replace("</style>", `${styleInjection}</style>`);
    } else {
      fixed = fixed.replace(/(<svg[^>]*>)/i, `$1${styleInjection}`);
    }

    // Inspect nodes with light background fills and force white text to dark #000000
    fixed = fixed.replace(/<g[^>]*class="[^"]*node[^"]*"[^>]*>[\s\S]*?<\/g>/gi, (nodeG) => {
      const hasLightFill = /fill\s*:\s*(#([89a-fA-F]{3,6})|rgb\(\s*(1[89]\d|2[0-5]\d)\s*,\s*(1[89]\d|2[0-5]\d)\s*,\s*(1[89]\d|2[0-5]\d)\s*\)|lightgreen|yellow|lime|cyan|#90ee90|#86efac|#a7f3d0)/i.test(nodeG) ||
                          /fill="(#([89a-fA-F]{3,6})|lightgreen|yellow|lime|cyan|#90ee90|#86efac|#a7f3d0)"/i.test(nodeG);
      if (hasLightFill) {
        return nodeG
          .replace(/fill="([^"]*)"/g, (match, fillVal) => {
            const lower = fillVal.toLowerCase().trim();
            if (lower === "#f4f4f5" || lower === "#ffffff" || lower === "white" || lower === "#fff" || lower === "#ececff") {
              return 'fill="#000000"';
            }
            return match;
          })
          .replace(/color:\s*(#fff|#ffffff|white|#f4f4f5|#ececff)/gi, "color: #000000");
      }
      return nodeG;
    });

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
      .filter((l) => l && !/^(flowchart|graph|subgraph|end|sequenceDiagram|classDiagram|%%|style\s+)/i.test(l));

    interface VisualNode {
      id: string;
      title: string;
      details: string[];
    }

    const nodes: VisualNode[] = [];

    const addNodeFromText = (id: string, text: string) => {
      let rawText = text.trim();
      // Remove enclosing quotes
      rawText = rawText.replace(/^["']+|["']+$/g, "");
      // Split into title and bullet points / details
      const parts = rawText
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);

      if (parts.length === 0) return;

      const title = parts[0].replace(/^[-•*]\s*/, "");
      const details = parts.slice(1).map((d) => d.replace(/^[-•*]\s*/, "• "));

      const existing = nodes.find((n) => n.id === id);
      if (!existing) {
        nodes.push({ id, title, details });
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
        // Individual node definition line, e.g. D["Tooling..."] or D[Tooling...]
        const nodeDefMatch = line.match(/^([a-zA-Z0-9_-]+)\s*(\[|\(|\{)\s*["']?([\s\S]*?)["']?\s*(\]|\)|\})$/);
        if (nodeDefMatch) {
          const id = nodeDefMatch[1];
          const text = nodeDefMatch[3];
          addNodeFromText(id, text);
        } else {
          // Plain text line
          const cleanText = line
            .replace(/^[a-zA-Z0-9_-]+\s*[:\[]\s*/, "")
            .replace(/[\]"']/g, "")
            .trim();
          if (cleanText.length > 0 && cleanText.length < 150) {
            const id = `node_${nodes.length + 1}`;
            addNodeFromText(id, cleanText);
          }
        }
      }
    }

    if (nodes.length === 0) {
      nodes.push({ id: "1", title: "Workflow Ready", details: [] });
    }

    const nodeWidth = 440;
    const gap = 36;
    const totalWidth = 480;
    const centerX = totalWidth / 2;

    const escapeXml = (unsafe: string): string => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    // Calculate dynamic node heights and total diagram height
    const nodeHeights = nodes.map((n) => Math.max(56, 36 + (n.details.length > 0 ? n.details.length * 20 : 0)));
    let totalHeight = 40;
    nodeHeights.forEach((h) => {
      totalHeight += h + gap;
    });

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" style="max-width: 580px; font-family: var(--font-inter), system-ui, -apple-system, sans-serif; display: block; margin: 0 auto;">
      <defs>
        <marker id="neonArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#cc785c"/>
        </marker>
        <filter id="boxGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#cc785c" flood-opacity="0.15"/>
        </filter>
      </defs>`;

    let currentY = 24;

    nodes.forEach((node, idx) => {
      const h = nodeHeights[idx];
      const y = currentY;
      const x = centerX - nodeWidth / 2;

      if (idx > 0) {
        const prevH = nodeHeights[idx - 1];
        const prevY = currentY - gap;
        svgContent += `
          <line x1="${centerX}" y1="${prevY}" x2="${centerX}" y2="${y - 4}" stroke="#9ca3af" stroke-width="1.5" marker-end="url(#neonArrow)" stroke-dasharray="4,2"/>
        `;
      }

      const badgeY = y + 26;

      let detailTexts = "";
      if (node.details.length > 0) {
        node.details.forEach((det, dIdx) => {
          detailTexts += `<text x="${x + 48}" y="${y + 44 + dIdx * 19}" font-size="11.5" font-weight="500" fill="#9ca3af">${escapeXml(det)}</text>`;
        });
      }

      const titleY = node.details.length > 0 ? y + 23 : y + h / 2 + 5;

      svgContent += `
        <g filter="url(#boxGlow)">
          <rect x="${x}" y="${y}" width="${nodeWidth}" height="${h}" rx="10" fill="#26262b" stroke="#cc785c" stroke-width="1.5"/>
          <circle cx="${x + 24}" cy="${badgeY}" r="12" fill="#cc785c" opacity="0.25"/>
          <text x="${x + 24}" y="${badgeY + 4.5}" font-size="11.5" font-weight="bold" fill="#cc785c" text-anchor="middle">${idx + 1}</text>
          <text x="${x + 48}" y="${titleY}" font-size="13" font-weight="600" fill="#f4f4f5">${escapeXml(node.title)}</text>
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
            // Guarantee visual diagram is rendered without raw code
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
      className="my-4 rounded-2xl border border-zinc-800/80 bg-[#18181b]/95 p-4 shadow-xl overflow-x-auto scrollbar-thin select-none max-w-full relative group"
    >
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-zinc-800/60 text-xs text-zinc-400 font-medium select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#cc785c]" />
          <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">Mermaid Diagram</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer text-[11px] border border-zinc-800/60"
          title="Copy Mermaid Code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? "Copied" : "Copy code"}</span>
        </button>
      </div>

      {svg ? (
        <div
          className="select-none [&>svg]:mx-auto [&>svg]:block [&>svg]:max-w-full [&>svg]:h-auto py-2"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="text-xs text-zinc-400 animate-pulse font-mono py-6 text-center flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#cc785c] animate-ping" />
          <span>Rendering diagram...</span>
        </div>
      )}
    </div>
  );
}
