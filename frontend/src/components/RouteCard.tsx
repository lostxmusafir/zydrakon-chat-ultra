"use client";

import React, { useState } from "react";
import { RouteInfo } from "@/lib/types";
import { MapPin, Navigation, Compass, ExternalLink, Car, Bike, Bus, Footprints, Map, Eye, EyeOff, Sparkles } from "lucide-react";

interface RouteCardProps {
  route: RouteInfo;
}

export function RouteCard({ route }: RouteCardProps) {
  const [selectedMode, setSelectedMode] = useState<string>(route.travel_mode || "driving");
  const [customOrigin, setCustomOrigin] = useState<string>(route.origin || "");
  const [isEditingOrigin, setIsEditingOrigin] = useState<boolean>(false);
  const [showMapPreview, setShowMapPreview] = useState<boolean>(true);

  // Format clean capitalize strings
  const formatLocation = (loc: string) => {
    if (!loc) return "";
    return loc
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  const cleanDestination = formatLocation(route.destination);
  const cleanOrigin = customOrigin ? formatLocation(customOrigin) : "";

  // Direct Google Maps Link Scheme
  const getEncodedUrl = (mode: string, origin: string, dest: string) => {
    let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest.trim())}`;
    if (origin && origin.trim()) {
      url += `&origin=${encodeURIComponent(origin.trim())}`;
    }
    url += `&travelmode=${mode}`;
    return url;
  };

  // Embed Live Google Maps Iframe URL (Zero API Key Required)
  const getEmbedIframeUrl = (origin: string, dest: string) => {
    if (origin && origin.trim()) {
      return `https://maps.google.com/maps?saddr=${encodeURIComponent(origin.trim())}&daddr=${encodeURIComponent(dest.trim())}&output=embed`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(dest.trim())}&output=embed`;
  };

  const currentUrl = getEncodedUrl(selectedMode, customOrigin, route.destination);
  const embedUrl = getEmbedIframeUrl(customOrigin, route.destination);

  const modes = [
    { id: "driving", label: "Driving", icon: Car },
    { id: "bicycling", label: "Two-Wheeler", icon: Bike },
    { id: "transit", label: "Transit", icon: Bus },
    { id: "walking", label: "Walking", icon: Footprints },
  ];

  return (
    <div className="my-4 max-w-xl w-full rounded-3xl bg-gradient-to-b from-[#0c1612] via-[#08100d] to-[#040806] border border-emerald-500/40 p-4 md:p-6 shadow-[0_0_35px_rgba(16,185,129,0.18)] text-zinc-100 transition-all animate-message select-none">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-emerald-500/25 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-inner">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
              <span>Google Maps Route Navigator</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-semibold border border-emerald-500/40">
                LIVE MAP
              </span>
            </h4>
            <p className="text-xs text-zinc-400">Interactive live route preview & turn-by-turn GPS</p>
          </div>
        </div>

        <button
          onClick={() => setShowMapPreview(!showMapPreview)}
          className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-xs text-zinc-300 hover:text-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          {showMapPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{showMapPreview ? "Hide Map" : "Show Map"}</span>
        </button>
      </div>

      {/* Origin & Destination Banner */}
      <div className="bg-[#050907] border border-zinc-800/90 rounded-2xl p-4 space-y-3 mb-4 shadow-sm">
        {/* Origin Row */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center shrink-0 pt-1">
            <div className="w-4 h-4 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            </div>
            <div className="w-0.5 h-7 bg-gradient-to-b from-blue-400 to-emerald-400 my-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">Starting Location</span>
              <button
                onClick={() => setIsEditingOrigin(!isEditingOrigin)}
                className="text-[11px] font-semibold text-zinc-400 hover:text-emerald-400 transition-colors underline cursor-pointer"
              >
                {isEditingOrigin ? "Save" : cleanOrigin ? "Edit" : "+ Set Custom Origin"}
              </button>
            </div>
            {isEditingOrigin ? (
              <input
                type="text"
                value={customOrigin}
                onChange={(e) => setCustomOrigin(e.target.value)}
                placeholder="e.g. Vadodara or Current Location"
                className="mt-1.5 w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            ) : (
              <p className="text-xs md:text-sm font-bold text-zinc-100 truncate mt-0.5">
                {cleanOrigin ? `📍 ${cleanOrigin}` : "🎯 Current Live GPS Location"}
              </p>
            )}
          </div>
        </div>

        {/* Destination Row */}
        <div className="flex items-start gap-3 pt-0.5">
          <div className="flex flex-col items-center shrink-0 pt-1">
            <MapPin className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Destination</span>
            <p className="text-sm md:text-base font-extrabold text-emerald-300 truncate mt-0.5">
              🏁 {cleanDestination}
            </p>
          </div>
        </div>
      </div>

      {/* Embedded Live Google Map Iframe Preview */}
      {showMapPreview && (
        <div className="mb-4 relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-[#000000] shadow-inner group">
          <div className="h-64 md:h-72 w-full relative">
            <iframe
              title="Google Maps Route View"
              src={embedUrl}
              className="w-full h-full border-0 filter contrast-[1.05] opacity-95 group-hover:opacity-100 transition-opacity"
              loading="lazy"
              allowFullScreen
            />
          </div>
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-zinc-800 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
            <Map className="w-3 h-3" />
            <span>Interactive Live Map Preview</span>
          </div>
        </div>
      )}

      {/* Travel Mode Selector Tabs */}
      <div className="mb-4">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
          Select Travel Mode:
        </label>
        <div className="grid grid-cols-4 gap-2 bg-[#050907] p-1.5 rounded-2xl border border-zinc-800/90">
          {modes.map((m) => {
            const Icon = m.icon;
            const isSelected = selectedMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-black shadow-md shadow-emerald-500/30"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/80"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[11px] sm:text-xs truncate">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary GPS Navigation Launch Button */}
      <a
        href={currentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-black font-extrabold text-sm md:text-base transition-all duration-200 flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] cursor-pointer active:scale-[0.98]"
      >
        <Navigation className="w-5 h-5 fill-black" />
        <span>Start Live Turn-by-Turn GPS Navigation</span>
        <ExternalLink className="w-4 h-4 shrink-0 opacity-80" />
      </a>
    </div>
  );
}
