"use client";

import React, { useEffect, useState } from "react";
import { ZydrakonLogo } from "./ZydrakonLogo";
import { ArrowRight, ShieldCheck, Cpu, User } from "lucide-react";

interface WelcomeScreenProps {
  onEnter: () => void;
  onLogin?: () => void;
}

const BOOT_STEPS = [
  "Initializing Zydrakon Neural Matrix...",
  "Connecting to MongoDB Atlas Database...",
  "Loading OpenRouter, Zhipu & Mistral API Routers...",
  "Configuring Live Streaming Engine...",
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

        if (currentProgress > 80) setStepIndex(4);
        else if (currentProgress > 60) setStepIndex(3);
        else if (currentProgress > 40) setStepIndex(2);
        else if (currentProgress > 20) setStepIndex(1);

        return currentProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col items-center justify-between p-6 overflow-hidden select-none">
      {/* Background Cyber Grid Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#1f1f23_1px,transparent_1px)] [background-size:24px_24px] opacity-25 -z-10" />

      {/* Top Brand Header: Big Logo on Left, Login Button on Right */}
      <div className="w-full max-w-6xl flex items-center justify-between pt-2 px-2">
        <div className="flex items-center gap-3.5 cursor-pointer" onClick={onEnter}>
          <ZydrakonLogo size={52} className="drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
          <div>
            <span className="font-extrabold text-xl tracking-wider text-white block">ZYDRAKON AI</span>
            <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase block -mt-0.5">Pitch Black Ultra Studio</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>v2.5 Ultra Engine</span>
          </div>

          <button
            onClick={onLogin || onEnter}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-950/40 hover:scale-[1.02]"
          >
            <User className="w-4 h-4" />
            <span>Sign In / Login</span>
          </button>
        </div>
      </div>

      {/* Center Welcome Hero & Loader */}
      <div className="flex flex-col items-center text-center max-w-md w-full my-auto space-y-8 animate-fade-in">
        {/* Crisp Zydrakon Dragon Logo on Pure Pitch Black */}
        <div className="cursor-pointer" onClick={() => isComplete && onEnter()}>
          <ZydrakonLogo size={140} />
        </div>

        {/* Brand Title */}
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Zydrakon AI
          </h1>
          <p className="text-xs text-zinc-400 tracking-wide font-medium">
            Next-Generation AI Intelligence & Streaming Studio
          </p>
        </div>

        {/* High-Tech Loader Bar */}
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Cpu className="w-3.5 h-3.5 animate-spin text-white" />
              {BOOT_STEPS[stepIndex]}
            </span>
            <span className="font-bold text-white">{progress}%</span>
          </div>

          {/* Progress Track */}
          <div className="w-full h-1.5 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-200 ease-out shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Enter Button (Appears when boot finishes) */}
        {isComplete ? (
          <button
            onClick={onEnter}
            className="w-full py-3.5 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-semibold text-sm tracking-wide transition-all shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
        ) : (
          <p className="text-[11px] text-zinc-500 font-mono">
            Created & Developed by <span className="text-zinc-300 font-bold">Raj Patil</span>
          </p>
        )}
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-5xl flex items-center justify-between pb-4 text-[11px] text-zinc-500">
        <span>© 2026 Zydrakon AI</span>
        <span>OLED Pitch Black Edition</span>
      </div>
    </div>
  );
}
