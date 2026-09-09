"use client";

import React from "react";
import { 
  Crown, 
  Sparkles, 
  Award, 
  X, 
  ArrowRight, 
  Check,
  Zap,
  ShieldCheck
} from "lucide-react";

interface TierWelcomeModalProps {
  isOpen: boolean;
  user: any;
  onClose: () => void;
}

export function TierWelcomeModal({ isOpen, user, onClose }: TierWelcomeModalProps) {
  if (!isOpen || !user) return null;

  const rawTier = (user.tier || "free").toLowerCase();
  const tier = rawTier === "premium" ? "premium" : rawTier === "gold" ? "gold" : "free";
  const userName = user.name || "Explorer";

  // Tier-specific styling & content (Clean Luxury Design — No boxy element cards)
  const tierConfig = {
    premium: {
      badge: "ULTRA PREMIUM VIP",
      badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      accentGlow: "rgba(168, 85, 247, 0.25)",
      borderClass: "border-purple-500/30 shadow-[0_0_80px_-15px_rgba(168,85,247,0.3)]",
      iconBg: "bg-gradient-to-b from-purple-500/20 to-purple-900/40 text-purple-300 border border-purple-400/30 shadow-lg shadow-purple-950/60",
      icon: Crown,
      title: "Welcome to Ultra VIP",
      subtitle: `Welcome ${userName}. Your account has been elevated to our highest tier with unrestricted frontier intelligence and VIP privileges.`,
      features: [
        {
          title: "All Frontier Models Unlocked",
          highlight: "Zydrakon-Premium, GLM-4 Flash & Mistral"
        },
        {
          title: "Zero-Wait Turbo Processing",
          highlight: "Highest cloud queue priority & lowest latency"
        },
        {
          title: "Deep Reasoning & Architecture",
          highlight: "Complex code synthesis & high-contrast visual diagrams"
        },
        {
          title: "Maximum Daily Throughput",
          highlight: "Expanded prompt limits for heavy development"
        }
      ],
      btnGradient: "bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:brightness-110 shadow-lg shadow-purple-900/50 text-white",
      btnText: "Enter Ultra VIP Workspace"
    },
    gold: {
      badge: "GOLD MEMBER",
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      accentGlow: "rgba(245, 158, 11, 0.25)",
      borderClass: "border-amber-500/30 shadow-[0_0_80px_-15px_rgba(245,158,11,0.25)]",
      iconBg: "bg-gradient-to-b from-amber-500/20 to-amber-900/40 text-amber-300 border border-amber-400/30 shadow-lg shadow-amber-950/60",
      icon: Award,
      title: "Welcome to Gold VIP",
      subtitle: `Welcome ${userName}. Dual-engine intelligence and expanded limits are now active on your workspace.`,
      features: [
        {
          title: "Dual AI Engines",
          highlight: "Zydrakon Core + high-speed Zhipu GLM-4 Flash"
        },
        {
          title: "Double Daily Quota",
          highlight: "2x expanded prompt volume each day"
        },
        {
          title: "Instant Visual Flowcharts",
          highlight: "Real-time Mermaid architecture maps"
        },
        {
          title: "Priority Server Routing",
          highlight: "Reduced queue delays during peak traffic"
        }
      ],
      btnGradient: "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:brightness-110 shadow-lg shadow-amber-900/50 text-black font-black",
      btnText: "Activate Gold Experience"
    },
    free: {
      badge: "FREE ACCOUNT",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      accentGlow: "rgba(16, 185, 129, 0.25)",
      borderClass: "border-emerald-500/30 shadow-[0_0_80px_-15px_rgba(16,185,129,0.2)]",
      iconBg: "bg-gradient-to-b from-emerald-500/20 to-emerald-900/40 text-emerald-300 border border-emerald-400/30 shadow-lg shadow-emerald-950/60",
      icon: Sparkles,
      title: "Welcome to Zydrakon AI",
      subtitle: `Welcome ${userName}. Your free intelligent workspace is fully ready for conversations, coding, and diagrams.`,
      features: [
        {
          title: "Zydrakon Core Engine",
          highlight: "Fast, accurate open-weights intelligence"
        },
        {
          title: "Visual Diagrams & Maps",
          highlight: "Interactive Mermaid flowcharts rendered automatically"
        },
        {
          title: "Unlimited Chat Branching",
          highlight: "Create and branch as many sessions as you need"
        },
        {
          title: "Upgrade Whenever Ready",
          highlight: "Switch to Gold or Ultra Premium for dual engines"
        }
      ],
      btnGradient: "bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 shadow-lg shadow-emerald-900/50 text-white",
      btnText: "Start Chatting Free"
    }
  };

  const config = tierConfig[tier];
  const IconComponent = config.icon;

  const handleDismiss = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
      <div 
        className={`w-full max-w-md bg-[#09090b] border ${config.borderClass} rounded-3xl p-7 shadow-2xl relative overflow-hidden text-center space-y-6 transition-all`}
      >
        {/* Subtle Ambient Radial Glow */}
        <div 
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: config.accentGlow }}
        />

        {/* Minimalist Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-800/80 text-zinc-500 hover:text-zinc-200 transition-all cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Center Emblem Icon */}
        <div className="flex flex-col items-center pt-2">
          <div className={`w-16 h-16 rounded-3xl ${config.iconBg} flex items-center justify-center mb-4 transition-transform hover:scale-105`}>
            <IconComponent className="w-8 h-8" />
          </div>

          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border ${config.badgeClass}`}>
            {config.badge}
          </span>

          <h2 className="text-2xl font-black text-white tracking-tight mt-3">
            {config.title}
          </h2>

          <p className="text-zinc-400 text-xs leading-relaxed mt-2 max-w-xs mx-auto">
            {config.subtitle}
          </p>
        </div>

        {/* Clean, Elegant Features List (No heavy box cards) */}
        <div className="space-y-3 pt-2 text-left border-t border-b border-zinc-850/80 py-4">
          {config.features.map((feat, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="mt-1 w-4 h-4 rounded-full bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-zinc-200" />
              </div>
              <div className="text-xs leading-snug">
                <span className="font-semibold text-zinc-200">{feat.title}</span>
                <span className="text-zinc-500 block text-[11px] mt-0.5">{feat.highlight}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className={`w-full py-3.5 px-6 rounded-2xl ${config.btnGradient} transition-all cursor-pointer font-bold text-xs sm:text-sm flex items-center justify-center gap-2 tracking-wide`}
          >
            <span>{config.btnText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[10px] text-zinc-500 font-mono">
            Active Tier Status • Zydrakon AI
          </p>
        </div>
      </div>
    </div>
  );
}
