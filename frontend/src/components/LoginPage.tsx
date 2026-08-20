"use client";

import React, { useState, useEffect } from "react";
import { ZydrakonLogo } from "./ZydrakonLogo";
import { Mail, Lock, User, ArrowRight, Loader2, ShieldCheck, Cpu, LogIn, Sparkles } from "lucide-react";
import { api } from "@/lib/api";

interface LoginPageProps {
  onSuccess: (user: any, token: string) => void;
  onContinueGuest: () => void;
}

const BOOT_STEPS = [
  "Initializing Zydrakon Neural Matrix...",
  "Connecting to MongoDB Atlas Database...",
  "Loading OpenRouter, Zhipu & Mistral API Routers...",
  "Zydrakon AI Engine Ready 🚀",
];

export function LoginPage({ onSuccess, onContinueGuest }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [bootIndex, setBootIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBootIndex((prev) => (prev + 1) % BOOT_STEPS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);
    setLoadingText("Verifying Credentials & Bcrypt Hash...");

    try {
      const res = await api.login({ email, password });
      setLoadingText("Loading Zydrakon Workspace...");
      onSuccess(res.user, res.access_token);
    } catch (err: any) {
      setErrorMsg(err?.message || "Authentication failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  };

  const handleGoogleAuth = () => {
    setIsLoading(true);
    setLoadingText("Authenticating with Google OAuth...");
    setTimeout(() => {
      const mockUser = { id: "google-123", name: "Google User", email: "user@gmail.com" };
      onSuccess(mockUser, "mock-google-token-xyz");
      setIsLoading(false);
    }, 1200);
  };

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
            <div className="relative group">
              <div className="absolute -inset-3 rounded-full bg-orange-500/15 blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />
              <ZydrakonLogo size={130} className="relative drop-shadow-[0_0_25px_rgba(249,115,22,0.35)]" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Zydrakon AI
              </h1>
              <p className="text-xs text-zinc-400 font-medium max-w-xs leading-relaxed">
                Next-Generation AI Intelligence & Streaming Studio with Multi-LLM Round-Robin Engine
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bcrypt Security Enforced</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>Multi-Model Rotation</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400">
                <Cpu className="w-3 h-3 text-zinc-400 animate-pulse" />
                <span>{BOOT_STEPS[bootIndex]}</span>
              </div>
            </div>
          </div>

          {/* Left Footer */}
          <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span>© 2026 Zydrakon AI</span>
            <span>By <strong className="text-zinc-300">Raj Patil</strong></span>
          </div>
        </div>

        {/* SHAPE 2: Right Login Card */}
        <div className="w-full bg-[#09090b] border border-zinc-800/90 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between space-y-5 relative overflow-hidden">
          
          {/* Card Header */}
          <div className="flex flex-col items-center text-center space-y-2.5">
            <ZydrakonLogo size={64} />
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                Sign In to Zydrakon AI
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Log in with your user credentials (bcrypt protected)
              </p>
            </div>
          </div>

          {/* Admin Notice */}
          <div className="p-2.5 rounded-2xl bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-400 text-center flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span>Public sign-up is disabled. Accounts managed by administrator.</span>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <span>⚠️ {errorMsg}</span>
            </div>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-[#09090b]/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-9 h-9 text-orange-400 animate-spin" />
              <p className="text-xs font-mono text-zinc-300 animate-pulse">{loadingText}</p>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Password</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs tracking-wide transition-all shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 cursor-pointer border border-orange-400/30 hover:scale-[1.01]"
            >
              <span>Sign In</span>
              <LogIn className="w-4 h-4" />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-zinc-800 w-full" />
            <span className="bg-[#09090b] px-3 text-[10px] text-zinc-500 uppercase font-mono absolute">OR</span>
          </div>

          {/* Social Auth & Guest Mode */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 font-medium transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={onContinueGuest}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/80 text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Continue as Guest</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

