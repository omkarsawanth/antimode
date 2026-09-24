"use client";

import React, { useState } from "react";
import { Direction, Scores, BlindRead } from "@/types/schemas";
import { Check, Edit3, AlertTriangle, Eye, ShieldCheck, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface DirectionCardProps {
  direction: Direction;
  scores?: Scores;
  blindReads?: BlindRead[];
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (directionId: string, patch: Partial<Direction>) => Promise<void>;
}

export function DirectionCard({
  direction,
  scores,
  blindReads = [],
  isSelected,
  onSelect,
  onEdit,
}: DirectionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showBlindReads, setShowBlindReads] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState(direction.name);
  const [editTagline, setEditTagline] = useState(direction.tagline);
  const [editPitch, setEditPitch] = useState(direction.one_line_pitch);
  const [editPositioning, setEditPositioning] = useState(direction.positioning);
  const [isSaving, setIsSaving] = useState(false);

  const pass = scores?.pass ?? false;

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      await onEdit(direction.id, {
        name: editName,
        tagline: editTagline,
        one_line_pitch: editPitch,
        positioning: editPositioning,
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to edit direction:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border transition-all duration-200 bg-slate-900/90 p-5 shadow-lg ${
        isSelected
          ? "border-blue-500 ring-2 ring-blue-500/20 shadow-blue-500/10"
          : "border-slate-800 hover:border-slate-700"
      }`}
    >
      {/* Header & Badges */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-[11px] font-mono tracking-wider uppercase text-blue-400 font-semibold bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-900/50">
            {direction.label}
          </span>

          {scores && (
            <div
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono font-bold tracking-wide border ${
                pass
                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                  : "bg-rose-950/80 text-rose-400 border-rose-800"
              }`}
            >
              {pass ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>PASS</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>FAIL</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Brand Name & Tagline */}
        {!isEditing ? (
          <>
            <h3 className="text-2xl font-black text-slate-100 tracking-tight mb-1">
              {direction.name}
            </h3>
            <p className="text-xs font-mono text-slate-400 italic mb-3">"{direction.tagline}"</p>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed line-clamp-3">
              {direction.one_line_pitch}
            </p>
          </>
        ) : (
          <div className="space-y-2 mb-4 bg-slate-950/80 p-3 rounded border border-slate-800">
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                Brand Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                Tagline
              </label>
              <input
                type="text"
                value={editTagline}
                onChange={(e) => setEditTagline(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                One-Line Pitch
              </label>
              <textarea
                value={editPitch}
                onChange={(e) => setEditPitch(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 text-xs rounded text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-semibold"
              >
                {isSaving ? "Re-scoring..." : "Save & Re-score"}
              </button>
            </div>
          </div>
        )}

        {/* Dual Scores Grid */}
        {scores && (
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg mb-4 font-mono">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500">Genericness</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className={`text-xl font-bold ${
                    scores.genericness <= 55 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {scores.genericness}
                </span>
                <span className="text-[10px] text-slate-500">/ 100</span>
              </div>
              <span className="text-[9px] text-slate-500">Target: ≤ 55</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-slate-500">Perception Gap</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className={`text-xl font-bold ${
                    scores.perception_gap <= 0.4 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {scores.perception_gap}
                </span>
                <span className="text-[10px] text-slate-500">/ 1.0</span>
              </div>
              <span className="text-[9px] text-slate-500">Target: ≤ 0.40</span>
            </div>
          </div>
        )}

        {/* Palette Strip Preview */}
        <div className="mb-4">
          <div className="text-[10px] font-mono text-slate-500 uppercase mb-1">Visual Palette</div>
          <div className="flex h-5 rounded overflow-hidden border border-slate-800">
            {direction.visual.palette.map((color, idx) => (
              <div
                key={idx}
                className="flex-1 transition-all hover:flex-[2]"
                style={{ backgroundColor: color.hex }}
                title={`${color.name}: ${color.hex} (${color.role})`}
              />
            ))}
          </div>
        </div>

        {/* Collapsible Details */}
        <div className="space-y-1 mb-4 font-mono text-xs">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full text-slate-400 hover:text-slate-200 text-[11px] py-1"
          >
            <span>Personality & Typography</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDetails && (
            <div className="pt-2 pb-1 space-y-2 text-[11px] border-t border-slate-800 text-slate-300">
              <div>
                <span className="text-slate-500">Traits: </span>
                <span>{direction.personality.traits.map((t) => t.trait).join(", ")}</span>
              </div>
              <div>
                <span className="text-slate-500">Avoids: </span>
                <span className="text-rose-300">{direction.personality.avoid.join(", ")}</span>
              </div>
              <div>
                <span className="text-slate-500">Fonts: </span>
                <span className="text-blue-300">{direction.visual.typography.heading}</span> +{" "}
                <span className="text-slate-400">{direction.visual.typography.body}</span>
              </div>
              {scores && (
                <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800/60">
                  <div>Embedding Sim: {scores.genericness_breakdown.embedding_sim}%</div>
                  <div>Cliche Rate: {scores.genericness_breakdown.cliche_rate}%</div>
                </div>
              )}
            </div>
          )}

          {/* Blind Reads Trigger */}
          {blindReads.length > 0 && (
            <div>
              <button
                onClick={() => setShowBlindReads(!showBlindReads)}
                className="flex items-center justify-between w-full text-slate-400 hover:text-slate-200 text-[11px] py-1"
              >
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-cyan-400" />
                  <span>Blind Reader Guesses (3)</span>
                </span>
                {showBlindReads ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showBlindReads && (
                <div className="pt-2 space-y-2 text-[10px] border-t border-slate-800">
                  {blindReads.map((br) => (
                    <div key={br.reader_id} className="bg-slate-950 p-2 rounded border border-slate-800">
                      <div className="text-slate-500 font-semibold mb-0.5">Reader #{br.reader_id}</div>
                      <div className="text-slate-300">"{br.guess.one_line}"</div>
                      <div className="text-slate-500 mt-1">Feel: {br.guess.feel_words.join(", ")}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit</span>
        </button>

        <button
          type="button"
          onClick={() => onSelect(direction.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
            isSelected
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}
        >
          {isSelected ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Selected</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Select Direction</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
