"use client";

import React from "react";
import { BrandSpec } from "@/types/schemas";
import { Swords, ShieldAlert, ShieldCheck, Plus, CheckCircle2 } from "lucide-react";

interface RedTeamLoopProps {
  spec: BrandSpec;
  directionName: string;
}

export function RedTeamLoop({ spec, directionName }: RedTeamLoopProps) {
  if (!spec.rounds || spec.rounds.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-red-400" />
          <div>
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
              Adversarial Red-Team Stress Test ({directionName})
            </h3>
            <p className="text-xs text-slate-400">
              Adversary attacks brand boundaries to uncover vulnerabilities and synthesize machine rules
            </p>
          </div>
        </div>
        <div className="text-xs font-mono px-2.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800">
          {spec.rounds.length} Attack Rounds
        </div>
      </div>

      <div className="space-y-3 font-mono text-xs">
        {spec.rounds.map((round) => (
          <div
            key={round.round}
            className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3.5 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300">
                Round {round.round}: Infiltration Attempt
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded border font-semibold flex items-center gap-1 ${
                  round.slipped_through
                    ? "bg-amber-950/60 text-amber-300 border-amber-800"
                    : "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                }`}
              >
                {round.slipped_through ? (
                  <>
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    <span>Vulnerability Exposed</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Blocked by Spec</span>
                  </>
                )}
              </span>
            </div>

            <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800 text-slate-300">
              <span className="text-slate-500 font-semibold">Adversary Attack Copy: </span>
              <span className="italic text-rose-300">"{round.attack}"</span>
            </div>

            {round.new_rule && (
              <div className="bg-blue-950/30 p-2.5 rounded border border-blue-900/50 text-blue-200 flex items-start gap-2">
                <Plus className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-300">Patched Rule Appended: </span>
                  <span>{round.new_rule}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hardened Spec Summary */}
      <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
        <div className="bg-slate-950 p-3 rounded border border-slate-800">
          <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">
            Enforced Voice Rules ({spec.voice_rules.length})
          </div>
          <ul className="space-y-1 text-slate-300">
            {spec.voice_rules.map((rule, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-950 p-3 rounded border border-slate-800">
          <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">
            Banned Words & Stems ({spec.banned_words.length})
          </div>
          <div className="flex flex-wrap gap-1">
            {spec.banned_words.map((w, idx) => (
              <span
                key={idx}
                className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/50 text-rose-300 border border-rose-900/60 line-through"
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
