"use client";

import React from "react";
import { 
  Crown, 
  Sparkles, 
  Zap, 
  Award, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  Cpu, 
  Layers,
  Sparkle
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

  // Tier-specific configurations
  const tierConfig = {
    premium: {
      badge: "👑 ULTRA PREMIUM VIP ACTIVE",
      badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/20",
      modalBorder: "border-purple-500/40 shadow-[0_0_60px_-10px_rgba(168,85,247,0.35)]",
      glowBg: "from-purple-900/20 via-pink-900/10 to-transparent",
      iconBg: "bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-900/50",
      icon: Crown,
      title: "Welcome to Ultra Premium VIP",
      subtitle: `Congratulations ${userName}! You have unlocked full unrestricted access to Zydrakon AI's most powerful intelligence engines and VIP privileges.`,
      perks: [
        {
          icon: Crown,
          title: "All Frontier Models Unlocked",
          desc: "Full access to Zydrakon-Premium, Zhipu GLM-4 Flash, Mistral, and future flagship models."
        },
        {
          icon: Zap,
          title: "Maximum Daily Limits & Zero Wait",
          desc: "Unlimited prompt throughput with priority cloud queue routing and lowest latency."
        },
        {
          icon: Cpu,
          title: "Deep Reasoning & Architecture",
          desc: "Complex logic synthesis, multi-file code development, and pitch black visual diagrams."
        },
        {
          icon: ShieldCheck,
          title: "Exclusive VIP Personas",
          desc: "Access to advanced AI personas including Code Architect, Research Analyst, and Ruthless Advisor."
        }
      ],
      btnGradient: "bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:brightness-110 shadow-lg shadow-purple-900/50 text-white",
      btnText: "Enter Ultra VIP Workspace"
    },
    gold: {
      badge: "⭐ GOLD TIER ACTIVATED",
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20",
      modalBorder: "border-amber-500/40 shadow-[0_0_60px_-10px_rgba(245,158,11,0.3)]",
      glowBg: "from-amber-900/20 via-yellow-900/10 to-transparent",
      iconBg: "bg-gradient-to-tr from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-900/50",
      icon: Award,
      title: "Welcome to Gold VIP Tier",
      subtitle: `Great to have you on board, ${userName}! Your Gold membership is live with dual-engine AI capabilities and elevated daily limits.`,
      perks: [
        {
          icon: Cpu,
          title: "Dual-Engine AI Intelligence",
          desc: "Equipped with Zydrakon Core AI plus high-speed Zhipu GLM-4 Flash reasoning."
        },
        {
          icon: Zap,
          title: "Double Daily Prompt Quota",
          desc: "2x expanded prompt volume each day for uninterrupted coding and creative sessions."
        },
        {
          icon: Layers,
          title: "Enhanced Visual Diagrams",
          desc: "High-contrast Mermaid system architecture maps and flowcharts rendered in real-time."
        },
        {
          icon: Sparkles,
          title: "Priority Response Routing",
          desc: "Turbo speed processing with reduced queue delays during peak server loads."
        }
      ],
      btnGradient: "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:brightness-110 shadow-lg shadow-amber-900/50 text-black font-black",
      btnText: "Activate Gold Experience"
    },
    free: {
      badge: "✨ FREE TIER ACTIVATED",
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20",
      modalBorder: "border-emerald-500/30 shadow-[0_0_50px_-10px_rgba(16,185,129,0.25)]",
      glowBg: "from-emerald-900/20 via-teal-900/10 to-transparent",
      iconBg: "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-900/50",
      icon: Sparkles,
      title: "Welcome to Zydrakon AI",
      subtitle: `Welcome ${userName}! Your Free account is completely active. Enjoy lightning-fast intelligent reasoning, multi-turn chat, and visual diagrams.`,
      perks: [
        {
          icon: Zap,
          title: "Zydrakon Core Engine",
          desc: "Powered by efficient, high-speed open-weights AI models calibrated for precision."
        },
        {
          icon: Layers,
          title: "Visual Diagrams & Flowcharts",
          desc: "Interactive Mermaid diagrams with automatic neon dark-mode visualization."
        },
        {
          icon: Sparkle,
          title: "Unlimited Session Branching",
          desc: "Create and branch as many chat sessions as you need to explore distinct ideas."
        },
        {
          icon: ArrowRight,
          title: "Seamless Upgrades Available",
          desc: "Switch to Gold or Ultra Premium anytime to unlock dual-engines and VIP throughput."
        }
      ],
      btnGradient: "bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 shadow-lg shadow-emerald-900/50 text-white font-bold",
      btnText: "Start Chatting Free"
    }
  };

  const config = tierConfig[tier];
  const IconComponent = config.icon;

  const handleDismiss = () => {
    // Record that this user has seen their 1-time tier welcome popup
    try {
      const userKey = user.id || user.email || "current_user";
      localStorage.setItem(`zydrakon_tier_welcome_${userKey}`, "true");
    } catch (e) {
      console.error(e);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
      <div 
        className={`w-full max-w-lg bg-[#09090b] border ${config.modalBorder} rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6 transition-all`}
      >
        {/* Ambient Top Glow */}
        <div className={`absolute -top-24 -left-24 w-64 h-64 bg-gradient-to-br ${config.glowBg} rounded-full blur-3xl pointer-events-none`} />
        <div className={`absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-bl ${config.glowBg} rounded-full blur-3xl pointer-events-none`} />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-5 right-5 p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer border border-zinc-800/80"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Section */}
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl ${config.iconBg} flex items-center justify-center shrink-0`}>
            <IconComponent className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 pr-6">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-wider uppercase border ${config.badgeClass}`}>
              {config.badge}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {config.title}
            </h2>
          </div>
        </div>

        {/* Subtitle / Description */}
        <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
          {config.subtitle}
        </p>

        {/* Perks Grid */}
        <div className="space-y-2.5 pt-1">
          <p className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider font-semibold">
            Included in your plan
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {config.perks.map((perk, idx) => {
              const PerkIcon = perk.icon;
              return (
                <div 
                  key={idx}
                  className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/70 hover:border-zinc-700/80 transition-all flex items-start gap-2.5"
                >
                  <div className="p-1.5 rounded-xl bg-zinc-850 text-zinc-300 border border-zinc-750 shrink-0 mt-0.5">
                    <PerkIcon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-snug">{perk.title}</h4>
                    <p className="text-[11px] text-zinc-400 leading-normal mt-0.5">{perk.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleDismiss}
            className={`w-full py-3.5 px-5 rounded-2xl ${config.btnGradient} transition-all cursor-pointer font-bold text-sm flex items-center justify-center gap-2`}
          >
            <span>{config.btnText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-center text-[10px] text-zinc-600 font-mono">
            Notice: This onboarding welcome appears only once on your first login.
          </p>
        </div>
      </div>
    </div>
  );
}
