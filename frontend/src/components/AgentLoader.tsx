"use client";

import React from "react";

interface AgentLoaderProps {
  isDarkMode?: boolean;
  size?: number;
}

// ═══════════════════════════════════════════════════════
// Liquid Iridescent Chromatic Orb Video Loader
// Renders the sleek video orb directly without borders
// ═══════════════════════════════════════════════════════

export function AgentLoader({ isDarkMode = true, size = 52 }: AgentLoaderProps) {
  if (!isDarkMode) {
    return (
      <div 
        className="w-10 h-10 rounded-full border-2 border-transparent border-t-[var(--accent-color)] border-r-[var(--accent-color)] animate-spin opacity-80" 
      />
    );
  }

  return (
    <div 
      className="relative flex items-center justify-center select-none shrink-0"
      style={{ width: size, height: size }}
    >
      <video
        src="/loader.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-contain mix-blend-screen pointer-events-none"
      />
    </div>
  );
}
