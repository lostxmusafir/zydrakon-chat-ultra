"use client";

import React, { useEffect, useState } from "react";
import { ZydrakonLogo } from "./ZydrakonLogo";
import { ArrowRight, User, ShieldCheck } from "lucide-react";

interface WelcomeScreenProps {
  onEnter: () => void;
  onLogin?: () => void;
}

export function WelcomeScreen({ onEnter, onLogin }: WelcomeScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 80);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0d10] text-white w-screen h-screen flex flex-col lg:flex-row overflow-hidden select-none">
      
      {/* LEFT HALF (100% Height Left Screen - Dark Theme) */}
      <div className="w-full lg:w-1/2 h-full bg-[#0e0d10] p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden text-white border-r border-zinc-800/40">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />

        {/* Top Tagline */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium tracking-wide">
            Global AI intelligence made simple — streaming solutions for you.
          </span>
        </div>

        {/* Center Headline & Dragon Artwork */}
        <div className="my-auto space-y-6 py-4 max-w-xl">
          <div className="cursor-pointer" onClick={onEnter}>
            <ZydrakonLogo size={400} className="w-full max-w-[400px] h-auto drop-shadow-[0_0_50px_rgba(255,255,255,0.08)]" />
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
              Unleash Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300">
                Intelligence.
              </span>
            </h1>
            <p className="text-sm text-zinc-400 font-medium leading-relaxed">
              Next-Generation Multi-LLM Round-Robin Engine with instant streaming and Bcrypt security.
            </p>
          </div>
        </div>

        {/* Left Bottom Footer */}
        <div className="text-xs text-zinc-500 font-mono flex items-center justify-between pt-4 border-t border-zinc-800/60">
          <span>© 2026 Zydrakon AI</span>
          <span>Developed by <strong className="text-zinc-300">Raj Patil</strong></span>
        </div>
      </div>

      {/* RIGHT HALF (100% Height Right Screen - High Contrast White) */}
      <div className="w-full lg:w-1/2 h-full bg-white text-zinc-900 p-8 lg:p-16 flex flex-col justify-between relative overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <ZydrakonLogo size={60} />
            <span className="font-extrabold text-xl tracking-wide text-zinc-900">Zydrakon AI</span>
          </div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            ● v2.5 Engine Active
          </span>
        </div>

        {/* Center Action */}
        <div className="my-auto space-y-6 py-6 w-full max-w-md mx-auto text-center">
          <ZydrakonLogo size={100} className="mx-auto" />

          <div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight">
              Welcome
            </h2>
            <p className="text-xs text-zinc-500 mt-1.5">
              Access your Zydrakon AI workspace or sign in to your account
            </p>
          </div>

          <div className="space-y-3 pt-2 max-w-sm mx-auto">
            <button
              onClick={onLogin || onEnter}
              className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-sm tracking-wide shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01]"
            >
              <User className="w-4 h-4" />
              <span>Sign In to Account</span>
            </button>

            <button
              onClick={onEnter}
              className="w-full py-3.5 px-6 rounded-full bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200 text-zinc-900 font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Launch Workspace as Guest</span>
              <ArrowRight className="w-4 h-4 text-orange-600" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}


