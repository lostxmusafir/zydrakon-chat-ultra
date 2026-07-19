"use client";

import React, { useRef, useEffect } from "react";

interface AgentLoaderProps {
  isDarkMode?: boolean;
  color?: string;
  size?: number;
}

// ═══════════════════════════════════════════════════════
// Liquid Iridescent Chromatic Orb Video Loader Component
// Borderless blend with page background & full orb scaling
// ═══════════════════════════════════════════════════════

function AgentLoaderBase({ isDarkMode = true, size = 52 }: AgentLoaderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el) {
      el.play().catch((err) => {
        console.warn("Autoplay handler caught:", err);
      });
    }
  }, []);

  if (!isDarkMode) {
    return (
      <div 
        className="w-10 h-10 rounded-full border-2 border-transparent border-t-[var(--accent-color)] border-r-[var(--accent-color)] animate-spin opacity-80" 
      />
    );
  }

  return (
    <div 
      className="relative flex items-center justify-center rounded-full overflow-hidden select-none shrink-0"
      style={{ 
        width: size, 
        height: size,
      }}
    >
      <video
        ref={videoRef}
        src="/loader.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="w-full h-full object-cover rounded-full pointer-events-none mix-blend-screen scale-[2.2]"
      />
    </div>
  );
}

export const AgentLoader = React.memo(AgentLoaderBase);
