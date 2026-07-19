"use client";

import React, { useState } from "react";
import { ShieldAlert, Sparkles, LogIn } from "lucide-react";

interface LoginModalProps {
  onSuccess: (token: string) => void;
}

export function LoginModal({ onSuccess }: LoginModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  // Mascot animation states
  const [eyeX, setEyeX] = useState(0);
  const [eyeY, setEyeY] = useState(0);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    // Track cursor movement horizontally based on text length
    const offset = Math.min(6, Math.max(-6, (val.length - 15) * 0.4));
    setEyeX(offset);
    setEyeY(3); // Look down at input
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    // Track cursor movement
    const offset = Math.min(6, Math.max(-6, (val.length - 10) * 0.5));
    setEyeX(offset);
    setEyeY(3); // Look down at input
  };

  const handleFocusEmail = () => {
    setEyeY(3);
    const offset = Math.min(6, Math.max(-6, (email.length - 15) * 0.4));
    setEyeX(offset);
  };

  const handleFocusName = () => {
    setEyeY(3);
    const offset = Math.min(6, Math.max(-6, (name.length - 10) * 0.5));
    setEyeX(offset);
  };

  const handleFocusPassword = () => {
    setIsPasswordFocused(true);
    setEyeX(0);
    setEyeY(2); // Peek slightly
  };

  const handleBlurField = () => {
    setEyeX(0);
    setEyeY(0);
  };

  const handleBlurPassword = () => {
    setIsPasswordFocused(false);
    setEyeX(0);
    setEyeY(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin 
        ? { email, password } 
        : { email, password, name };
        
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed");
      }
      
      localStorage.setItem("zydrakon_token", data.access_token);
      if (data.user) {
        localStorage.setItem("zydrakon_user", JSON.stringify(data.user));
      }
      onSuccess(data.access_token);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
      {/* Self-contained CSS for Blinking and Wiggling */}
      <style>{`
        @keyframes robot-blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        .robot-eye-blink {
          animation: robot-blink 4s infinite;
        }
        @keyframes robot-wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-2deg); }
          75% { transform: rotate(2deg); }
        }
        .robot-thinking {
          animation: robot-wiggle 1s ease-in-out infinite;
        }
      `}</style>

      <div className="bg-[var(--bg-main)]/90 p-8 rounded-3xl border border-[var(--border-color)]/70 shadow-[0_0_50px_rgba(59,130,246,0.15)] w-full max-w-md flex flex-col items-center relative overflow-hidden">
        {/* Futuristic glowing design ornaments */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[var(--accent-color)]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Interactive Robot Mascot SVG */}
        <div className={`w-36 h-28 flex items-center justify-center mb-4 select-none relative ${isLoading ? 'robot-thinking' : ''}`}>
          <svg className="w-full h-full" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
            {/* Mascot Shadow */}
            <ellipse cx="80" cy="112" rx="42" ry="5" fill="rgba(0,0,0,0.25)" className={isLoading ? "animate-pulse" : ""} />

            <g id="mascot-body" style={{ transform: isLoading ? 'translateY(-2px)' : 'none', transition: 'transform 0.3s ease' }}>
              {/* Antenna */}
              <line x1="80" y1="28" x2="80" y2="12" stroke={error ? "#ef4444" : "var(--accent-color)"} strokeWidth="3" strokeLinecap="round" />
              <circle 
                cx="80" 
                cy="9" 
                r="6" 
                fill={error ? "#ef4444" : "var(--accent-color)"} 
                className={isLoading ? "animate-ping" : ""}
                style={{ transition: 'fill 0.3s ease' }} 
              />
              <circle cx="80" cy="9" r="4" fill={error ? "#ef4444" : "var(--accent-color)"} style={{ transition: 'fill 0.3s ease' }} />

              {/* Ears/Side Bolts */}
              <rect x="30" y="44" width="8" height="24" rx="3" fill="#eae8e2" stroke="#ccbc9e" strokeWidth="1.5" />
              <rect x="122" y="44" width="8" height="24" rx="3" fill="#eae8e2" stroke="#ccbc9e" strokeWidth="1.5" />

              {/* Floating Head */}
              <rect x="36" y="24" width="88" height="64" rx="22" fill="#f8f6f0" stroke="#ccbc9e" strokeWidth="2" />

              {/* Digital Screen Mask */}
              <rect x="44" y="32" width="72" height="48" rx="14" fill="#181816" stroke="#ccbc9e" strokeWidth="1" />

              {/* Dynamic Eye Screen */}
              <g style={{ transform: `translate(${eyeX}px, ${eyeY}px)`, transition: 'transform 0.15s ease-out' }}>
                {/* Left Eye */}
                <ellipse 
                  cx="64" 
                  cy="56" 
                  rx="6" 
                  ry={error ? "2" : "6"} 
                  fill={error ? "#ef4444" : isPasswordFocused ? "#3b82f6" : "var(--accent-color)"} 
                  className="robot-eye-blink" 
                  style={{ transformOrigin: '64px 56px', transition: 'fill 0.3s ease, ry 0.2s ease' }} 
                />
                {/* Right Eye */}
                <ellipse 
                  cx="96" 
                  cy="56" 
                  rx="6" 
                  ry={error ? "2" : "6"} 
                  fill={error ? "#ef4444" : isPasswordFocused ? "#3b82f6" : "var(--accent-color)"} 
                  className="robot-eye-blink" 
                  style={{ transformOrigin: '96px 56px', transition: 'fill 0.3s ease, ry 0.2s ease' }} 
                />
              </g>

              {/* Mouth (Happy state, neutral, or sad depending on error) */}
              <path 
                d={error ? "M 74 72 Q 80 66 86 72" : "M 74 68 Q 80 74 86 68"} 
                stroke={error ? "#ef4444" : "var(--accent-color)"} 
                strokeWidth="2" 
                strokeLinecap="round" 
                fill="none"
                style={{ transition: 'stroke 0.3s ease, d 0.3s ease' }}
              />
            </g>

            {/* Left Arm / Hand (Peeks or Covers eyes) */}
            <g id="left-hand" style={{ transform: isPasswordFocused ? 'translate(28px, -24px) rotate(45deg)' : 'none', transformOrigin: '24px 92px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <rect x="18" y="80" width="12" height="24" rx="6" fill="#f8f6f0" stroke="#ccbc9e" strokeWidth="1.5" />
            </g>

            {/* Right Arm / Hand (Peeks or Covers eyes) */}
            <g id="right-hand" style={{ transform: isPasswordFocused ? 'translate(-28px, -24px) rotate(-45deg)' : 'none', transformOrigin: '136px 92px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              <rect x="130" y="80" width="12" height="24" rx="6" fill="#f8f6f0" stroke="#ccbc9e" strokeWidth="1.5" />
            </g>
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold mb-1 tracking-tight text-[var(--text-main)]">
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        
        <p className="text-[var(--text-secondary)] text-xs mb-6 text-center max-w-[280px]">
          {isLogin 
            ? "Log in to sync and access your premium space-age chat sessions." 
            : "Sign up to start chatting with Zydrakon AI."}
        </p>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs mb-6 w-full shadow-sm">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                Name
              </label>
              <input 
                type="text" 
                value={name}
                onChange={handleNameChange}
                onFocus={handleFocusName}
                onBlur={handleBlurField}
                placeholder="John Doe"
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] transition-all text-[var(--text-main)] placeholder:text-slate-500"
                required={!isLogin}
              />
            </div>
          )}
          
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              Email Address
            </label>
            <input 
              type="email" 
              value={email}
              onChange={handleEmailChange}
              onFocus={handleFocusEmail}
              onBlur={handleBlurField}
              placeholder="you@example.com"
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] transition-all text-[var(--text-main)] placeholder:text-slate-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
              Password
            </label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={handleFocusPassword}
              onBlur={handleBlurPassword}
              placeholder="••••••••"
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent-color)] focus:ring-1 focus:ring-[var(--accent-color)] transition-all text-[var(--text-main)] placeholder:text-slate-500"
              required
              minLength={6}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full mt-4 bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white font-semibold rounded-xl px-4 py-2.5 transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(59,130,246,0.2)] hover:shadow-[0_6px_16px_rgba(59,130,246,0.3)] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                {isLogin ? "Sign In" : "Sign Up"}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-sm text-[var(--text-secondary)]">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-[var(--accent-color)] font-semibold hover:underline cursor-pointer"
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}
