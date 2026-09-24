"use client";

import React from "react";
import { Collision } from "@/types/schemas";
import { AlertTriangle, ShieldCheck, Scale } from "lucide-react";

interface CollisionViewProps {
  collisions: Collision[];
}

export function CollisionView({ collisions }: CollisionViewProps) {
  if (!collisions || collisions.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
              Trademark & Market Collision Sentinel
            </h3>
            <p className="text-xs text-slate-400">
              Auditing candidate names for phonetic overlap, competitor proximity, and domain confusion
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
        {collisions.map((item, idx) => (
          <div
            key={idx}
            className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-base font-bold text-slate-100">{item.name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                    item.risk === "low"
                      ? "bg-emerald-950/60 text-emerald-400 border-emerald-800"
                      : item.risk === "medium"
                      ? "bg-amber-950/60 text-amber-400 border-amber-800"
                      : "bg-rose-950/60 text-rose-400 border-rose-800"
                  }`}
                >
                  {item.risk} Risk
                </span>
              </div>

              <div className="space-y-1.5 mt-2">
                <span className="text-[10px] uppercase text-slate-500">Nearest Brands:</span>
                {item.nearest_brands.map((nb, nIdx) => (
                  <div key={nIdx} className="bg-slate-900/90 p-2 rounded border border-slate-800/60">
                    <div className="font-semibold text-slate-200 text-[11px]">{nb.brand}</div>
                    <div className="text-[10px] text-slate-400">{nb.similarity_note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
