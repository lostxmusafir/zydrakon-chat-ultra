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
        theme: "dark",
        securityLevel: "loose",
        suppressErrorRendering: true,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        themeVariables: {
          background: "#000000",
          primaryColor: "#f97316",
          lineColor: "#ea580c",
          primaryTextColor: "#f4f4f5",
          secondaryColor: "#18181b",
          tertiaryColor: "#09090b",
          clusterBkg: "#09090b",
          clusterBorder: "#27272a",
          subgraphBkg: "#09090b",
          subgraphBorderColor: "#27272a",
          subgraphTitleColor: "#f4f4f5",
          nodeBkg: "#18181b",
          nodeBorder: "#3f3f46",
          textColor: "#f4f4f5",
          mainBkg: "#000000",
          actorBkg: "#18181b",
          actorBorder: "#f97316",
          actorTextColor: "#f4f4f5",
          actorLineColor: "#71717a",
          signalColor: "#f97316",
          signalTextColor: "#f4f4f5",
          labelBoxBkgColor: "#18181b",
          labelBoxBorderColor: "#3f3f46",
          labelTextColor: "#f4f4f5",
          loopTextColor: "#f4f4f5",
          noteBkgColor: "#27272a",
          noteBorderColor: "#f97316",
          noteTextColor: "#f4f4f5"
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

    // 4. Flowchart-only adjustments
    if (/^\s*(graph|flowchart)/i.test(cleaned)) {
      cleaned = cleaned.replace(/(\s+)->(\s+)/g, "$1-->$2");
    }

    // 5. Sequence diagram adjustments
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

    // 6. Fix style lines with light background fills to force dark high-contrast text
    cleaned = cleaned.replace(/style\s+([A-Za-z0-9_]+)\s+fill\s*:\s*(#[89a-fA-F][0-9a-fA-F]{2,5}|lightgreen|lime|cyan|yellow|#90ee90|#86efac|#a7f3d0)([^,\n]*)/gi, (match, nodeId, fillHex, rest) => {
      if (!/color\s*:\s*/i.test(rest)) {
        return `style ${nodeId} fill:${fillHex},color:#000000,font-weight:bold${rest}`;
      }
      return match.replace(/color\s*:\s*(#fff|#ffffff|white|#f4f4f5|#ececff)/gi, "color:#000000,font-weight:bold");
    });

    // 7. General replacement of unescaped & in text blocks if needed
    cleaned = cleaned.replace(/(\w+)\s+&\s+(\w+)/g, "$1 and $2");

    // 8. Streaming safety: Auto-balance unclosed quotes and brackets
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
      .node rect, .node circle, .node polygon, .node path { stroke-width: 2px; }
      .node text, .actor text, .label text, text.actor { font-family: var(--font-inter), system-ui, sans-serif !important; font-weight: 600 !important; }
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
    const cleanLines = input
      .replace(/^```mermaid\s*/i, "")
      .replace(/```$/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !/^(flowchart|graph|subgraph|end|sequenceDiagram|classDiagram|%%)/i.test(l));

    const nodes: { id: string; label: string }[] = [];

    for (const line of cleanLines) {
      const arrowMatch = line.match(/(.+?)(?:-->|->|-->>)(.+)/);
      if (arrowMatch) {
        const left = arrowMatch[1].trim();
        const right = arrowMatch[2].trim();

        const parseNode = (raw: string) => {
          const m = raw.match(/([a-zA-Z0-9_-]+)(?:\[["']?(.*?)["']?\]|\(["']?(.*?)["']?\))?/);
          if (m) {
            const id = m[1];
            const label = m[2] || m[3] || id;
            if (!nodes.find((n) => n.id === id)) {
              nodes.push({ id, label: label.replace(/["']/g, "") });
            }
            return id;
          }
          return raw;
        };

        parseNode(left);
        parseNode(right);
      } else {
        const cleanText = line.replace(/^[0-9]+[.)]\s*/, "").replace(/[[\]"']/g, "").trim();
        if (cleanText.length > 0 && cleanText.length < 120) {
          const id = `node_${nodes.length + 1}`;
          nodes.push({ id, label: cleanText });
        }
      }
    }

    if (nodes.length === 0) {
      nodes.push({ id: "1", label: "Visual Diagram Ready" });
    }

    const nodeWidth = 280;
    const nodeHeight = 54;
    const gap = 32;
    const totalHeight = nodes.length * (nodeHeight + gap) + 40;
    const totalWidth = 340;
    const centerX = totalWidth / 2;

    const escapeXml = (unsafe: string): string => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" width="100%" style="max-width: 520px; font-family: system-ui, sans-serif; display: block; margin: 0 auto;">
      <defs>
        <marker id="neonArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#f97316"/>
        </marker>
        <filter id="boxGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#f97316" flood-opacity="0.25"/>
        </filter>
      </defs>`;

    nodes.forEach((node, idx) => {
      const y = 24 + idx * (nodeHeight + gap);
      const x = centerX - nodeWidth / 2;

      if (idx > 0) {
        const prevY = 24 + (idx - 1) * (nodeHeight + gap) + nodeHeight;
        svgContent += `
          <line x1="${centerX}" y1="${prevY}" x2="${centerX}" y2="${y - 4}" stroke="#f97316" stroke-width="2" marker-end="url(#neonArrow)" stroke-dasharray="4,2"/>
        `;
      }

      svgContent += `
        <g filter="url(#boxGlow)">
          <rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="14" fill="#09090b" stroke="#f97316" stroke-width="1.5"/>
          <circle cx="${x + 22}" cy="${y + nodeHeight / 2}" r="11" fill="#ea580c" opacity="0.2"/>
          <text x="${x + 22}" y="${y + nodeHeight / 2 + 4}" font-size="11" font-weight="bold" fill="#f97316" text-anchor="middle">${idx + 1}</text>
          <text x="${x + 44}" y="${y + nodeHeight / 2 + 4}" font-size="12" font-weight="600" fill="#f4f4f5">${escapeXml(node.label)}</text>
        </g>
      `;
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
      className="my-4 py-2 px-1 bg-transparent overflow-x-auto scrollbar-thin select-none max-w-full relative group"
    >
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-10 bg-zinc-900/80 backdrop-blur-md px-2 py-1 rounded-lg border border-zinc-800">
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white cursor-pointer"
          title="Copy Code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {svg ? (
        <div
          className="select-none [&>svg]:mx-auto [&>svg]:block [&>svg]:max-w-full [&>svg]:h-auto py-2"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="text-xs text-zinc-400 animate-pulse font-mono py-6 text-center flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          <span>Rendering visual diagram...</span>
        </div>
      )}
    </div>
  );
}
