"use client";

import React, { useState } from "react";
import { ZydrakonLogo } from "./ZydrakonLogo";
import { Mail, Lock, ArrowRight, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";

interface LoginPageProps {
  onSuccess: (user: any, token: string) => void;
  onContinueGuest: () => void;
}

export function LoginPage({ onSuccess, onContinueGuest }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);
    setLoadingText("Verifying Credentials...");

    try {
      const res = await api.login({ email, password });
      setLoadingText("Loading Workspace...");
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
    setLoadingText("Authenticating with Google...");
    setTimeout(() => {
      const mockUser = { id: "google-123", name: "Google User", email: "user@gmail.com" };
      onSuccess(mockUser, "mock-google-token-xyz");
      setIsLoading(false);
    }, 1200);
  };

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
          <div>
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
              Experience Zydrakon AI, a next-generation custom-built AI model with instant token streaming, intelligent query caching, and secure authentication.
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
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
            <p className="text-xs font-mono text-zinc-600 animate-pulse">{loadingText}</p>
          </div>
        )}

        {/* Sign In Form */}
        <div className="my-auto space-y-6 py-6 w-full max-w-md mx-auto">
          <div className="text-center">
            <ZydrakonLogo size={100} className="mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight">
              Sign In
            </h2>
            <p className="text-xs text-zinc-500 mt-1.5">
              This is an invite-only platform. Enter your authorized credentials to sign in.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2 font-medium">
              <span>⚠️ {errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email or Username"
                className="w-full px-5 py-3.5 rounded-full bg-zinc-100/90 border border-zinc-200 text-xs md:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
              />
            </div>

            <div className="space-y-1">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-5 py-3.5 rounded-full bg-zinc-100/90 border border-zinc-200 text-xs md:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-sm tracking-wide shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}

