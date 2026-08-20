"use client";

import React, { useEffect, useState } from "react";
import { ZydrakonLogo } from "./ZydrakonLogo";
import { ArrowRight, ShieldCheck, Cpu, User, Sparkles, Lock } from "lucide-react";

interface WelcomeScreenProps {
  onEnter: () => void;
  onLogin?: () => void;
}

const BOOT_STEPS = [
  "Initializing Zydrakon Neural Matrix...",
  "Connecting to MongoDB Atlas Database...",
  "Loading OpenRouter, Zhipu & Mistral API Routers...",
  "Zydrakon AI Engine Ready 🚀",
];

export function WelcomeScreen({ onEnter, onLogin }: WelcomeScreenProps) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsComplete(true);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 8) + 4;
        const currentProgress = Math.min(next, 100);

        if (currentProgress > 75) setStepIndex(3);
        else if (currentProgress > 50) setStepIndex(2);
        else if (currentProgress > 25) setStepIndex(1);

        return currentProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-white flex items-center justify-center p-4 md:p-8 overflow-y-auto select-none">
      {/* Background Cyber Grid Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#1f1f23_1px,transparent_1px)] [background-size:28px_28px] opacity-30 -z-10" />

      {/* 2-SHAPE CONTAINER */}
      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-stretch my-auto">
        
        {/* SHAPE 1: Left Brand Card */}
        <div className="w-full bg-[#08080a] border border-zinc-800/90 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="flex items-center gap-3">
            <ZydrakonLogo size={40} className="drop-shadow-[0_0_12px_rgba(249,115,22,0.3)]" />
            <div>
              <span className="font-extrabold text-lg tracking-wider text-white block">ZYDRAKON AI</span>
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase block -mt-0.5">Pitch Black Ultra Studio</span>
            </div>
          </div>

          {/* Center Content */}
          <div className="flex flex-col items-center text-center space-y-4 my-auto">
            <div className="relative group cursor-pointer" onClick={() => isComplete && onEnter()}>
              <div className="absolute -inset-3 rounded-full bg-orange-500/15 blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />
              <ZydrakonLogo size={130} className="relative drop-shadow-[0_0_25px_rgba(249,115,22,0.35)] transition-transform duration-300 group-hover:scale-105" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Zydrakon AI
              </h1>
              <p className="text-xs text-zinc-400 font-medium max-w-xs leading-relaxed">
                Next-Generation AI Intelligence & Streaming Studio with Multi-LLM Round-Robin Engine
              </p>
            </div>

            {/* High-Tech Boot Status Bar */}
            <div className="w-full max-w-sm space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span className="flex items-center gap-1.5 text-zinc-300">
                  <Cpu className="w-3.5 h-3.5 animate-spin text-orange-400" />
                  {BOOT_STEPS[stepIndex]}
                </span>
                <span className="font-bold text-white">{progress}%</span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-500 transition-all duration-200 ease-out shadow-[0_0_10px_rgba(249,115,22,0.8)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Left Footer */}
          <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>© 2026 Zydrakon AI</span>
            <span>By <strong className="text-zinc-300">Raj Patil</strong></span>
          </div>
        </div>

        {/* SHAPE 2: Right Welcome Action Card */}
        <div className="w-full bg-[#09090b] border border-zinc-800/90 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden text-center">
          <ZydrakonLogo size={64} className="mx-auto" />

          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Welcome to Zydrakon AI
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Sign in to your account or launch the workspace directly
            </p>
          </div>

          <div className="space-y-3 my-auto">
            <button
              onClick={onLogin || onEnter}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs tracking-wide transition-all shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 cursor-pointer border border-orange-400/30 hover:scale-[1.02]"
            >
              <User className="w-4 h-4" />
              <span>Sign In / Login</span>
            </button>

            <button
              onClick={onEnter}
              className="w-full py-3.5 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold text-xs tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer hover:text-white"
            >
              <span>Launch Workspace as Guest</span>
              <ArrowRight className="w-4 h-4 text-orange-400" />
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Encrypted Session • Multi-Model Engine Active</span>
          </div>
        </div>

      </div>
    </div>
  );
}

