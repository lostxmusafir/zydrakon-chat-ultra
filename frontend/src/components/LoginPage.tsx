"use client";

import React, { useState } from "react";
import { ZydrakonLogo } from "./ZydrakonLogo";
import { Mail, Lock, User, ArrowRight, Loader2, Sparkles, Shield, LogIn } from "lucide-react";
import { api } from "@/lib/api";

interface LoginPageProps {
  onSuccess: (user: any, token: string) => void;
  onContinueGuest: () => void;
}

export function LoginPage({ onSuccess, onContinueGuest }: LoginPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      if (isRegister) {
        setLoadingText("Creating Zydrakon Account...");
        const res = await api.register({ name, email, password });
        setLoadingText("Authenticating User Session...");
        onSuccess(res.user, res.access_token);
      } else {
        setLoadingText("Verifying Credentials...");
        const res = await api.login({ email, password });
        setLoadingText("Loading User Workspace...");
        onSuccess(res.user, res.access_token);
      }
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
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col items-center justify-center p-6 overflow-y-auto select-none">
      {/* Background Cyber Grid Lines */}
      <div className="absolute inset-0 bg-[radial-gradient(#1f1f23_1px,transparent_1px)] [background-size:24px_24px] opacity-25 -z-10" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#09090b] border border-zinc-800/90 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">

        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <ZydrakonLogo size={80} />
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              {isRegister ? "Create Zydrakon Account" : "Welcome Back"}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Sign in to access your saved sessions and AI models
            </p>
          </div>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex items-center p-1 rounded-2xl bg-zinc-950 border border-zinc-800/90">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setErrorMsg(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              !isRegister ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setErrorMsg(""); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              isRegister ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-[#09090b]/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
            <p className="text-xs font-mono text-zinc-300 animate-pulse">{loadingText}</p>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Full Name</label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Raj Patil"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>
          )}

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
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs tracking-wide transition-all shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 cursor-pointer border border-orange-400/30"
          >
            <span>{isRegister ? "Create Account" : "Sign In"}</span>
            <LogIn className="w-4 h-4" />
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-zinc-800 w-full" />
          <span className="bg-[#09090b] px-3 text-[10px] text-zinc-500 uppercase font-mono absolute">OR</span>
        </div>

        {/* Social Auth & Guest Mode */}
        <div className="space-y-2.5">
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
  );
}
