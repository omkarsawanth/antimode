"use client";

import React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { EmbeddingPoint } from "@/types/schemas";

interface ScatterPlotProps {
  points: EmbeddingPoint[];
  commonNames?: string[];
  centroid?: number[];
  onSelectCandidate?: (candidateId: string) => void;
}

const CANDIDATE_COLORS = ["#F59E0B", "#EF4444", "#10B981", "#8B5CF6"];

export function ScatterPlot({
  points,
  commonNames = [],
  centroid = [0, 0],
  onSelectCandidate,
}: ScatterPlotProps) {
  const baselinePoints = points.filter((p) => !p.is_candidate);
  const candidatePoints = points.filter((p) => p.is_candidate);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: EmbeddingPoint = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl text-xs font-mono max-w-xs z-50">
          <div className="flex items-center justify-between mb-1">
            <span
              className={`font-bold ${
                data.is_candidate ? "text-amber-400 text-sm" : "text-slate-300"
              }`}
            >
              {data.name || `Sample #${data.id}`}
            </span>
            {data.is_candidate ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ANTIMODE
              </span>
            ) : (
              <span className="text-[10px] text-slate-500">Baseline</span>
            )}
          </div>
          {data.tagline && <p className="text-slate-400 italic mb-2">"{data.tagline}"</p>}
          <div className="text-[10px] text-slate-500 flex justify-between border-t border-slate-800 pt-1">
            <span>Projection:</span>
            <span>
              x: {data.x.toFixed(1)}, y: {data.y.toFixed(1)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative bg-slate-900/90 border border-slate-800 rounded-lg p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
            Semantic Embedding Space (2D Projection)
          </h3>
          <p className="text-xs text-slate-400">
            Mapping candidate directions away from the mainstream gravity well
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block"></span>
            <span className="text-slate-400">Baseline Cluster ({baselinePoints.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block ring-2 ring-amber-400/30"></span>
            <span className="text-amber-300 font-semibold">
              Antimode Candidates ({candidatePoints.length})
            </span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[320px] bg-slate-950/80 rounded border border-slate-800/80 overflow-hidden">
        {/* Subtle grid lines background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(#64748B 1px, transparent 1px), radial-gradient(#64748B 1px, #020617 1px)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 10px 10px",
          }}
        />

        {/* Cluster callout annotation */}
        <div className="absolute top-4 left-6 z-10 pointer-events-none bg-slate-900/90 border border-slate-700/80 px-2.5 py-1.5 rounded shadow text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-ping"></span>
            <span>"What everyone else gets"</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Dense LLM baseline cluster · Clichés: {commonNames.slice(0, 3).join(", ")}
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <XAxis
              type="number"
              dataKey="x"
              domain={["auto", "auto"]}
              tick={false}
              axisLine={{ stroke: "#334155" }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={["auto", "auto"]}
              tick={false}
              axisLine={{ stroke: "#334155" }}
            />
            <ZAxis range={[50, 450]} />
            <Tooltip content={<CustomTooltip />} />

            {/* Baseline cluster */}
            <Scatter name="Baseline" data={baselinePoints} fill="#64748b" opacity={0.65}>
              {baselinePoints.map((entry, index) => (
                <Cell key={`baseline-${index}`} fill="#64748B" />
              ))}
            </Scatter>

            {/* Candidate points sitting outside */}
            <Scatter
              name="Candidates"
              data={candidatePoints}
              onClick={(e: any) => {
                if (e?.candidate_id && onSelectCandidate) {
                  onSelectCandidate(e.candidate_id);
                }
              }}
              cursor="pointer"
            >
              {candidatePoints.map((entry, index) => (
                <Cell
                  key={`candidate-${index}`}
                  fill={CANDIDATE_COLORS[index % CANDIDATE_COLORS.length]}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
        <div>
          Common Stems:{" "}
          <span className="text-slate-300">
            {commonNames.length > 0 ? commonNames.join(", ") : "None detected"}
          </span>
        </div>
        <div className="text-slate-500 text-[11px]">
          Distance metric: Cosine similarity projected via 2-Component PCA
        </div>
      </div>
    </div>
  );
}
