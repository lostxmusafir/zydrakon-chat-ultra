"use client";

import React, { useEffect, useState } from "react";
import { ZydrakonLogo } from "./ZydrakonLogo";
import { ArrowRight, ShieldCheck, Cpu } from "lucide-react";

interface WelcomeScreenProps {
  onEnter: () => void;
}

const BOOT_STEPS = [
  "Initializing Zydrakon Neural Matrix...",
  "Connecting to MongoDB Atlas Database...",
  "Loading OpenRouter, Zhipu & Mistral API Routers...",
  "Configuring Live Streaming Engine...",
  "Zydrakon AI Engine Ready 🚀",
];

export function WelcomeScreen({ onEnter }: WelcomeScreenProps) {
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

      {/* Top Brand Header */}
      <div className="w-full max-w-5xl flex items-center justify-between pt-4">
        <div className="flex items-center gap-2.5">
          <ZydrakonLogo size={32} />
          <span className="font-bold text-sm tracking-wider text-white">ZYDRAKON AI</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>v2.5 Ultra Engine</span>
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
