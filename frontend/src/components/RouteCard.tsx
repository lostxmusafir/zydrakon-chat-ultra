"use client";

import React, { useState } from "react";
import { RouteInfo } from "@/lib/types";
import { MapPin, Navigation, Compass, ExternalLink, Car, Bike, Bus, Footprints, CornerDownRight } from "lucide-react";

interface RouteCardProps {
  route: RouteInfo;
}

export function RouteCard({ route }: RouteCardProps) {
  const [selectedMode, setSelectedMode] = useState<string>(route.travel_mode || "driving");
  const [customOrigin, setCustomOrigin] = useState<string>(route.origin || "");
  const [isEditingOrigin, setIsEditingOrigin] = useState<boolean>(false);

  const getEncodedUrl = (mode: string, origin: string, dest: string) => {
    let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest.trim())}`;
    if (origin && origin.trim()) {
      url += `&origin=${encodeURIComponent(origin.trim())}`;
    }
    url += `&travelmode=${mode}`;
    return url;
  };

  const currentUrl = getEncodedUrl(selectedMode, customOrigin, route.destination);

  const modes = [
    { id: "driving", label: "Driving", icon: Car },
    { id: "bicycling", label: "Two-Wheeler", icon: Bike },
    { id: "transit", label: "Transit", icon: Bus },
    { id: "walking", label: "Walking", icon: Footprints },
  ];

  return (
    <div className="my-4 max-w-xl w-full rounded-2xl bg-gradient-to-b from-[#0e1713] via-[#09100d] to-[#060a08] border border-emerald-500/30 p-4 md:p-5 shadow-[0_0_25px_rgba(16,185,129,0.12)] text-zinc-100 transition-all animate-message select-none">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-xs md:text-sm font-bold text-white flex items-center gap-1.5">
              <span>Google Maps Route & Navigation</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-medium border border-emerald-500/30">
                Zero API Free
              </span>
            </h4>
            <p className="text-[11px] text-zinc-400">Direct instant navigation link to Google Maps</p>
          </div>
        </div>
      </div>

      {/* Origin & Destination Timeline */}
      <div className="bg-[#050807] border border-zinc-800/80 rounded-xl p-3.5 space-y-3 mb-4">
        {/* Origin Row */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center shrink-0 pt-0.5">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            </div>
            <div className="w-0.5 h-6 bg-gradient-to-b from-blue-400 to-emerald-400 my-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Starting Point</span>
              <button
                onClick={() => setIsEditingOrigin(!isEditingOrigin)}
                className="text-[10px] text-zinc-400 hover:text-emerald-400 transition-colors underline cursor-pointer"
              >
                {isEditingOrigin ? "Done" : customOrigin ? "Change" : "+ Set Origin"}
              </button>
            </div>
            {isEditingOrigin ? (
              <input
                type="text"
                value={customOrigin}
                onChange={(e) => setCustomOrigin(e.target.value)}
                placeholder="e.g. Current Location or Rajiv Chowk"
                className="mt-1 w-full px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-emerald-500 font-medium"
              />
            ) : (
              <p className="text-xs md:text-sm font-semibold text-zinc-200 truncate">
                {customOrigin || "📍 Your Current Live Location"}
              </p>
            )}
          </div>
        </div>

        {/* Destination Row */}
        <div className="flex items-start gap-3 pt-1">
          <div className="flex flex-col items-center shrink-0 pt-0.5">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Destination</span>
            <p className="text-xs md:text-sm font-bold text-emerald-300 truncate">
              {route.destination}
            </p>
          </div>
        </div>
      </div>

      {/* Travel Mode Selector Tabs */}
      <div className="mb-4">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">
          Select Travel Mode:
        </label>
        <div className="grid grid-cols-4 gap-1.5 bg-[#050807] p-1 rounded-xl border border-zinc-800/80">
          {modes.map((m) => {
            const Icon = m.icon;
            const isSelected = selectedMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMode(m.id)}
                className={`py-2 px-1.5 rounded-lg text-xs font-semibold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-bold"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] sm:text-xs truncate">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Action Button */}
      <a
        href={currentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-xs md:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 cursor-pointer active:scale-[0.99]"
      >
        <Navigation className="w-4 h-4 fill-black" />
        <span>Open in Google Maps / Start Navigation</span>
        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
      </a>
    </div>
  );
}
