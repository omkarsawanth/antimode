"use client";

import React, { useState } from "react";
import { BrandKit } from "@/types/schemas";
import { Rocket, FileDown, Copy, Check, Share2, Sparkles } from "lucide-react";

interface LaunchKitViewProps {
  brandKit: BrandKit;
  sessionId: string;
}

export function LaunchKitView({ brandKit, sessionId }: LaunchKitViewProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const { launch, direction } = brandKit;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const openExportPage = () => {
    window.open(`/api/export/${sessionId}`, "_blank");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <Rocket className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-base font-mono font-bold uppercase tracking-wider text-slate-100">
              Stage 8: Production Launch Kit ({direction.name})
            </h3>
            <p className="text-xs text-slate-400">
              Uncompromising launch assets synthesized in chosen voice with zero generic clichés
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openExportPage}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-mono font-bold rounded-lg shadow-md transition-all self-start sm:self-auto"
        >
          <FileDown className="w-4 h-4" />
          <span>Export Brand Kit / PDF</span>
        </button>
      </div>

      {/* Landing Hero Specimen */}
      <div className="bg-slate-950/90 border border-slate-800 p-6 rounded-xl space-y-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
          Landing Page Hero Copy
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
          {launch.landing_headline}
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
          {launch.subhead}
        </p>
        <div className="pt-2 text-xs font-mono text-cyan-400 font-semibold">
          One-Line Pitch: <span className="text-slate-200">{launch.one_line_pitch}</span>
        </div>
      </div>

      {/* Social Announcement Posts */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider">
          Launch Announcements & Social Manifesto Posts
        </h4>

        <div className="grid grid-cols-1 gap-3 font-mono text-xs">
          {launch.social_posts.map((post, idx) => (
            <div
              key={idx}
              className="group relative bg-slate-950/80 border border-slate-800 rounded-lg p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Post 0{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(post, idx)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 transition-colors"
                >
                  {copiedIdx === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{post}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
