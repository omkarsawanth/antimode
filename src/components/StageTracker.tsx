"use client";

import React, { useState } from "react";
import { StageTrackerItem } from "@/types/schemas";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, Terminal, Activity } from "lucide-react";

interface StageTrackerProps {
  currentStage: number;
  history: StageTrackerItem[];
}

const STAGES = [
  { id: 1, name: "Interview", agent: "Strategic Interviewer" },
  { id: 2, name: "Generic Map", agent: "Cluster Mapper (30 Samples)" },
  { id: 3, name: "Diverge", agent: "Divergence Engine" },
  { id: 4, name: "Score", agent: "Dual Scorer (Genericness & Gap)" },
  { id: 5, name: "Blind Read", agent: "3 Blind Readers + Judge" },
  { id: 6, name: "Collision", agent: "Trademark Sentinel" },
  { id: 7, name: "Red-Team", agent: "Adversarial Infiltrator" },
  { id: 8, name: "Deliver", agent: "BrandKit Synthesizer" },
  { id: 9, name: "Guardian", agent: "Machine Rule Linter" },
];

export function StageTracker({ currentStage, history }: StageTrackerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
          <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-slate-300">
            Pipeline Execution State
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            Stage {Math.min(9, currentStage)} of 9
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Agent Audit Log ({history.length})</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Progress Line */}
      <div className="grid grid-cols-9 gap-1 sm:gap-2 mb-2">
        {STAGES.map((s) => {
          const isDone = s.id < currentStage;
          const isCurrent = s.id === currentStage;
          return (
            <div
              key={s.id}
              className={`flex flex-col items-center text-center p-1.5 rounded transition-all ${
                isCurrent
                  ? "bg-blue-950/80 border border-blue-500 shadow-sm shadow-blue-500/20"
                  : isDone
                  ? "bg-slate-800/80 border border-emerald-900/60"
                  : "bg-slate-950/40 border border-slate-900 opacity-40"
              }`}
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-full mb-1 text-[10px] font-mono font-bold">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className={isCurrent ? "text-blue-300 font-bold" : "text-slate-500"}>
                    {s.id}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-slate-200 truncate w-full hidden sm:block">
                {s.name}
              </span>
              <span className="text-[9px] font-mono text-slate-400 truncate w-full hidden md:block">
                {s.agent.split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Expanded Audit Log */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 max-h-60 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
          {history.length === 0 ? (
            <div className="text-slate-500 italic py-2">No agent actions recorded yet.</div>
          ) : (
            history.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-950/70 border border-slate-800/60 rounded p-2.5 flex flex-col gap-1 text-[11px]"
              >
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-900 pb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <span className="text-blue-400">[{item.agent}]</span>
                    <span className="text-[10px] px-1.5 rounded bg-slate-800 text-slate-300">
                      Stage {item.stage}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-500">Input:</span> {item.input_summary}
                </div>
                <div className="text-emerald-300/90">
                  <span className="text-slate-500">Output:</span> {item.output_summary}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
