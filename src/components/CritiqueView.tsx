"use client";

import React from "react";
import { Revision } from "@/types/schemas";
import { ArrowRight, Sparkles, AlertCircle } from "lucide-react";

interface CritiqueViewProps {
  revisions: Revision[];
  directionName: string;
}

export function CritiqueView({ revisions, directionName }: CritiqueViewProps) {
  if (!revisions || revisions.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-xs font-mono text-slate-500">
        No critic revisions logged for {directionName}.
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
          Anti-Cliché Critic Log ({directionName})
        </h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
          {revisions.length} revision(s) recorded
        </span>
      </div>

      <div className="space-y-4">
        {revisions.map((rev, idx) => (
          <div
            key={idx}
            className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3.5 flex flex-col gap-2.5 font-mono text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                Field: {rev.field}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              {/* Before */}
              <div className="bg-rose-950/20 border border-rose-900/40 p-2.5 rounded text-rose-300">
                <div className="text-[10px] uppercase text-rose-500 font-semibold mb-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Before (Generic Trope Detected)</span>
                </div>
                <p className="line-through opacity-80 text-xs">"{rev.before}"</p>
              </div>

              {/* After */}
              <div className="bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded text-emerald-300">
                <div className="text-[10px] uppercase text-emerald-500 font-semibold mb-1 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  <span>After (Hardened Antimode Stance)</span>
                </div>
                <p className="font-semibold text-xs text-emerald-200">"{rev.after}"</p>
              </div>
            </div>

            {/* Reason */}
            <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800/60">
              <span className="text-amber-400 font-semibold">Strategic Rationale: </span>
              {rev.reason}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
