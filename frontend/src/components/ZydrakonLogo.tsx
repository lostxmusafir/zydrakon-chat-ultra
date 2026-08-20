"use client";

import React from "react";

interface ZydrakonLogoProps {
  className?: string;
  size?: number;
}

export function ZydrakonLogo({ className = "", size = 48 }: ZydrakonLogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Official Crisp Zydrakon AI Dragon Logo image (Exact as uploaded by user) */}
      <img
        src="/zydrakon-logo.png"
        alt="Zydrakon AI Logo"
        width={size}
        height={size}
        className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
}
