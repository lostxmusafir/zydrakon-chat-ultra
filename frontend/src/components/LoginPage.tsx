"use client";

import React, { useState } from "react";
import { ZydrakonLogo } from "./ZydrakonLogo";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, KeyRound, CheckCircle2, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

interface LoginPageProps {
  onSuccess: (user: any, token: string) => void;
  onContinueGuest: () => void;
}

export function LoginPage({ onSuccess, onContinueGuest }: LoginPageProps) {
  const [mode, setMode] = useState<"signin" | "changepwd">("signin");
  
  // Sign-in states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Change password states
  const [changeEmail, setChangeEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changeSuccessMsg, setChangeSuccessMsg] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setChangeSuccessMsg("");
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

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setChangeSuccessMsg("");

    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match. Please re-enter.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    setLoadingText("Updating Password...");

    try {
      const res = await api.changePasswordPublic({
        email: changeEmail,
        old_password: oldPassword,
        new_password: newPassword,
      });

      setChangeSuccessMsg(res?.message || "Password updated successfully! You can now sign in.");
      setEmail(changeEmail);
      setPassword("");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Switch back to sign-in mode after brief delay or keep message
      setMode("signin");
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update password. Please check your credentials.");
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
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

          {/* Mode Switch Pills */}
          <div className="flex items-center p-1 bg-zinc-100 rounded-full border border-zinc-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg("");
              }}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                mode === "signin"
                  ? "bg-white text-orange-600 shadow-sm font-bold"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("changepwd");
                setErrorMsg("");
                setChangeEmail(email || "");
              }}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                mode === "changepwd"
                  ? "bg-white text-orange-600 shadow-sm font-bold"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Change Password
            </button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
            <p className="text-xs font-mono text-zinc-600 animate-pulse">{loadingText}</p>
          </div>
        )}

        {/* SIGN IN VIEW */}
        {mode === "signin" && (
          <div className="my-auto space-y-6 py-6 w-full max-w-md mx-auto animate-in fade-in duration-200">
            <div className="text-center">
              <ZydrakonLogo size={90} className="mx-auto mb-3" />
              <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight">
                Sign In
              </h2>
              <p className="text-xs text-zinc-500 mt-1.5">
                This is an invite-only platform. Enter your authorized credentials to sign in.
              </p>
            </div>

            {/* Success Message Banner */}
            {changeSuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{changeSuccessMsg}</span>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2 font-medium">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
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

              <div className="space-y-1 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-5 pr-12 py-3.5 rounded-full bg-zinc-100/90 border border-zinc-200 text-xs md:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-sm tracking-wide shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("changepwd");
                    setErrorMsg("");
                    setChangeEmail(email || "");
                  }}
                  className="text-xs text-orange-600 hover:text-orange-700 font-semibold hover:underline cursor-pointer inline-flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>First time or need to change password?</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CHANGE PASSWORD VIEW */}
        {mode === "changepwd" && (
          <div className="my-auto space-y-6 py-6 w-full max-w-md mx-auto animate-in fade-in duration-200">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-zinc-900 tracking-tight">
                Change Password
              </h2>
              <p className="text-xs text-zinc-500 mt-1.5">
                Update your initial or temporary password to a new secure password.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2 font-medium">
                <span>⚠️ {errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase ml-3">
                  Account Email
                </label>
                <input
                  type="email"
                  required
                  value={changeEmail}
                  onChange={(e) => setChangeEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-5 py-3 rounded-full bg-zinc-100/90 border border-zinc-200 text-xs md:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-1 relative">
                <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase ml-3">
                  Current / Temporary Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? "text" : "password"}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Current password"
                    className="w-full pl-5 pr-12 py-3 rounded-full bg-zinc-100/90 border border-zinc-200 text-xs md:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    aria-label={showOldPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1 relative">
                <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase ml-3">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 6 characters)"
                    className="w-full pl-5 pr-12 py-3 rounded-full bg-zinc-100/90 border border-zinc-200 text-xs md:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1 relative">
                <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase ml-3">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-5 pr-12 py-3 rounded-full bg-zinc-100/90 border border-zinc-200 text-xs md:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 mt-2 rounded-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-sm tracking-wide shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>Update Password</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErrorMsg("");
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-800 font-semibold hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

    </div>
  );
}
