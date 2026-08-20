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
        <div className="my-auto space-y-8 py-6 max-w-lg">
          <div>
            <ZydrakonLogo size={240} />
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
          <button
            onClick={onContinueGuest}
            className="text-xs font-semibold text-zinc-500 hover:text-orange-600 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>Guest Mode</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
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
              Public sign-up is disabled. Enter your administrator account credentials.
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

          {/* Social & Guest Buttons */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full py-3 px-5 rounded-full bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200 text-xs text-zinc-800 font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-2.9z" />
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>

        {/* Right Bottom Footer */}
        <div className="flex items-center justify-between text-xs text-zinc-400 font-medium pt-4 border-t border-zinc-100 max-w-md mx-auto w-full">
          <span>© 2005-2026 Zydrakon Inc.</span>
          <div className="flex items-center gap-4">
            <span className="hover:text-zinc-600 cursor-pointer">Contact Us</span>
            <span className="hover:text-zinc-600 cursor-pointer">English ⌄</span>
          </div>
        </div>

      </div>

    </div>
  );
}

