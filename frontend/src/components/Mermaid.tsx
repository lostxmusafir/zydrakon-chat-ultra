"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidProps {
  chart: string;
  isDarkMode: boolean;
}

export default function Mermaid({ chart, isDarkMode }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Configure and Initialize Mermaid
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: isDarkMode ? "dark" : "default",
        securityLevel: "loose",
        suppressErrorRendering: true,
        fontFamily: "var(--font-inter), sans-serif",
        themeVariables: {
          background: isDarkMode ? "#151513" : "#fbfaf7",
          primaryColor: isDarkMode ? "#e26e4a" : "#cc5a37",
          lineColor: isDarkMode ? "#3e3e3a" : "#e4e2db",
          primaryTextColor: isDarkMode ? "#f3f1eb" : "#1f1f1d",
          secondaryColor: isDarkMode ? "#2d2d2a" : "#eae8e2",
          tertiaryColor: isDarkMode ? "#1a1a18" : "#fbfaf7",
        }
      });
      // Override parseError to prevent global uncaught exceptions during streaming
      (mermaid as any).parseError = (err: any, hash: any) => {
        console.warn("Mermaid silent parse warning:", err);
      };
    } catch (e) {
      console.error("Failed to initialize mermaid", e);
    }

    let isMounted = true;

    const renderChart = async () => {
      if (!ref.current) return;
      try {
        setError(null);
        // Generate a random valid id
        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 11)}`;
        
        // Clean up common LLM syntax issues (e.g. unquoted link labels with parentheses)
        let sanitizedChart = chart;
        sanitizedChart = sanitizedChart.replace(/\|([^"|\r\n]+)\|/g, '|"$1"|');
        
        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, sanitizedChart);
        
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err: unknown) {
        console.error("Mermaid render error:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Invalid Mermaid syntax");
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, isDarkMode]);

  if (error) {
    return (
      <div className="my-4 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 dark:text-red-300 font-mono text-xs max-w-full overflow-x-auto shadow-inner select-text">
        <div className="font-bold flex items-center gap-1.5 mb-1.5 text-red-500">
          ⚠️ Diagram Rendering Failed
        </div>
        <p className="opacity-90 leading-relaxed">{error}</p>
        <details className="mt-2 opacity-60 cursor-pointer select-none">
          <summary className="text-[10px] hover:underline font-sans">Show original source</summary>
          <pre className="mt-2 p-2 bg-black/20 rounded font-mono text-[10px] whitespace-pre select-text text-slate-300">{chart}</pre>
        </details>
      </div>
    );
  }

  return (
    <div 
      ref={ref} 
      className="my-4 p-4 flex justify-center items-center overflow-x-auto select-none max-w-full"
    >
      {svg ? (
        <div 
          className="w-full flex justify-center max-w-full scrollbar-thin select-none [&>svg]:max-w-full [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="text-xs text-[var(--text-secondary)] animate-pulse font-mono py-4">
          Compiling vector diagram...
        </div>
      )}
    </div>
  );
}
