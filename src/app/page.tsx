"use client";

import React, { useState, useEffect } from "react";
import {
  SessionState,
  Brief,
  GenericMap,
  Direction,
  Scores,
  BlindRead,
  Collision,
  BrandSpec,
  BrandKit,
} from "@/types/schemas";
import { StageTracker } from "@/components/StageTracker";
import { ScatterPlot } from "@/components/ScatterPlot";
import { DirectionCard } from "@/components/DirectionCard";
import { CritiqueView } from "@/components/CritiqueView";
import { VisualPreview } from "@/components/VisualPreview";
import { CollisionView } from "@/components/CollisionView";
import { RedTeamLoop } from "@/components/RedTeamLoop";
import { LaunchKitView } from "@/components/LaunchKitView";
import { GuardianBox } from "@/components/GuardianBox";
import {
  Sparkles,
  ArrowRight,
  Send,
  Loader2,
  RefreshCw,
  Compass,
  Layers,
  Swords,
  Rocket,
  ShieldCheck,
  CheckCircle2,
  Zap,
} from "lucide-react";

const SEED_PRESETS = [
  {
    id: "seed-1",
    title: "Terminal Knowledge Base",
    desc: "Encrypted second brain for paranoid kernel & security engineers",
  },
  {
    id: "seed-2",
    title: "Forest Adaptogen Tonic",
    desc: "Ultra-minimalist bitter herbal focus tonic from Nordic taiga",
  },
  {
    id: "seed-3",
    title: "Parametric Rain Insurance",
    desc: "Instant Doppler radar cash payouts for urban delivery riders",
  },
];

export default function AntimodeApp() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [rawIdea, setRawIdea] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [streamProgress, setStreamProgress] = useState<{ step: number; total: number } | null>(null);
  const [selectedDirectionId, setSelectedDirectionId] = useState<string | null>(null);
  const [collisions, setCollisions] = useState<Collision[]>([]);

  // Start with a new session or load Seed 1 by default
  useEffect(() => {
    initSession(SEED_PRESETS[0].id);
  }, []);

  const initSession = async (seedId?: string, customIdea?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed_id: seedId,
          idea: customIdea,
        }),
      });
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
        setRawIdea(data.session.brief?.idea || customIdea || "");
        setActiveQuestion(null);
        setSelectedDirectionId(null);
        setCollisions([]);
      }
    } catch (err) {
      console.error("Failed to init session:", err);
    } finally {
      setLoading(false);
    }
  };

  // Stage 1: Next interview question or finalize
  const handleInterviewNext = async (answerText?: string) => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch("/api/interview/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          answer: answerText,
        }),
      });
      const data = await res.json();
      if (data.status === "asking") {
        setActiveQuestion(data.question);
        setCurrentAnswer("");
      } else if (data.status === "completed") {
        setActiveQuestion(null);
      }
      // Refresh session
      await refreshSession(session.id);
    } catch (err) {
      console.error("Interview step failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Stage 2: Generate Generic Map (30 samples)
  const handleGenerateGenericMap = async () => {
    if (!session) return;
    setLoading(true);
    setStreamProgress({ step: 0, total: 30 });

    // Progress animation ticker
    const interval = setInterval(() => {
      setStreamProgress((prev) => {
        if (!prev) return null;
        if (prev.step >= 30) {
          clearInterval(interval);
          return prev;
        }
        return { step: Math.min(30, prev.step + 5), total: 30 };
      });
    }, 150);

    try {
      const res = await fetch("/api/generic-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id }),
      });
      const data = await res.json();
      clearInterval(interval);
      setStreamProgress({ step: 30, total: 30 });
      await refreshSession(session.id);
    } catch (err) {
      console.error("Generic map generation failed:", err);
    } finally {
      clearInterval(interval);
      setStreamProgress(null);
      setLoading(false);
    }
  };

  // Stage 3-5: Diverge and Score
  const handleDiverge = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch("/api/diverge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id }),
      });
      const data = await res.json();
      if (data.directions?.[0]) {
        setSelectedDirectionId(data.directions[0].id);
      }
      await refreshSession(session.id);

      // Trigger collision check automatically
      handleCheckCollisions();
    } catch (err) {
      console.error("Diverge failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Stage 5 Edit: Direction patch & re-score
  const handleEditDirection = async (directionId: string, patch: Partial<Direction>) => {
    if (!session) return;
    try {
      const res = await fetch("/api/direction/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          direction_id: directionId,
          patch,
        }),
      });
      await refreshSession(session.id);
    } catch (err) {
      console.error("Failed to edit direction:", err);
    }
  };

  // Stage 6: Collision check
  const handleCheckCollisions = async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/collision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: session.id }),
      });
      const data = await res.json();
      if (data.collisions) {
        setCollisions(data.collisions);
      }
      await refreshSession(session.id);
    } catch (err) {
      console.error("Collision check failed:", err);
    }
  };

  // Stage 7: Red-team stress test
  const handleRunRedTeam = async (directionId?: string) => {
    if (!session) return;
    const targetDirId = directionId || selectedDirectionId || session.directions?.[0]?.id;
    if (!targetDirId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/redteam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          direction_id: targetDirId,
          rounds: 3,
        }),
      });
      await refreshSession(session.id);
    } catch (err) {
      console.error("Red-team execution failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // Stage 8: Deliver BrandKit
  const handleDeliverKit = async (directionId?: string) => {
    if (!session) return;
    const targetDirId = directionId || selectedDirectionId || session.directions?.[0]?.id;
    if (!targetDirId) return;

    setLoading(true);
    try {
      const res = await fetch("/api/deliver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          direction_id: targetDirId,
        }),
      });
      await refreshSession(session.id);
    } catch (err) {
      console.error("Delivery failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async (id: string) => {
    try {
      const res = await fetch(`/api/session?id=${id}`);
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
        if (!selectedDirectionId && data.session.directions?.[0]) {
          setSelectedDirectionId(data.session.directions[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to refresh session:", err);
    }
  };

  const currentDirection =
    session?.directions?.find((d) => d.id === selectedDirectionId) ||
    session?.directions?.[0];

  return (
    <main className="min-h-screen bg-[#090B10] text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Brand Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl font-black tracking-tighter uppercase text-white font-mono flex items-center gap-1.5">
                <span className="text-blue-500">//</span> ANTIMODE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                Brand Engine v1.0
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>Deterministic Mode</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl font-mono">
              Maps what generic LLMs produce for an idea, forces the brand outside that zone,
              quantifies both Genericness & Perception Gap, and outputs machine-checkable rules.
            </p>
          </div>

          {/* Seed Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase text-slate-500 mr-1">Demo Seeds:</span>
            {SEED_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => initSession(preset.id)}
                className="px-2.5 py-1 text-xs font-mono rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/60 text-slate-300 transition-colors"
                title={preset.desc}
              >
                {preset.title}
              </button>
            ))}
          </div>
        </header>

        {/* Global Pipeline Stage Tracker */}
        {session && (
          <StageTracker currentStage={session.stage} history={session.history} />
        )}

        {/* Step 1: Idea & Strategic Interview */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-950 text-blue-400 font-mono text-xs font-bold border border-blue-800">
                1
              </span>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
                Strategic Brief & Diagnostic Interview
              </h2>
            </div>
            {session?.brief && session.brief.qa.length > 0 && (
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Brief Synthesized ({session.brief.qa.length} Turns)</span>
              </span>
            )}
          </div>

          {/* Raw Idea Input / Seed selector */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={rawIdea}
              onChange={(e) => setRawIdea(e.target.value)}
              placeholder="Enter raw product or company idea (e.g. terminal-first offline knowledge crypt)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => initSession(undefined, rawIdea)}
              disabled={loading || !rawIdea.trim()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold rounded-lg transition-colors text-white disabled:opacity-50"
            >
              Set Idea
            </button>
          </div>

          {/* Q&A Turns History */}
          {session?.brief?.qa && session.brief.qa.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="text-[10px] font-mono uppercase text-slate-500">
                Interview Turns ({session.brief.qa.length})
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {session.brief.qa.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950/80 border border-slate-800/80 rounded p-2.5 text-xs font-mono space-y-1"
                  >
                    <div className="text-blue-400 font-semibold">Q: {item.q}</div>
                    <div className="text-slate-300">
                      A: {item.a || <span className="italic text-slate-500">Awaiting answer...</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Question Box if awaiting answer */}
          {activeQuestion ? (
            <div className="bg-blue-950/30 border border-blue-900/60 rounded-lg p-3.5 space-y-2">
              <div className="text-xs font-mono text-blue-300 font-bold">
                Interviewer Question:
              </div>
              <p className="text-sm font-medium text-white">{activeQuestion}</p>
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Answer with specific operational constraints or uncompromised requirements..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleInterviewNext(currentAnswer)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-mono font-semibold flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleInterviewNext()}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Compass className="w-3.5 h-3.5" />
                )}
                <span>Ask Next Diagnostic Turn / Synthesize Brief</span>
              </button>
            </div>
          )}

          {/* Brief Summary Card */}
          {session?.brief?.problem && (
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Audience:</span>
                  <span className="text-slate-200">{session.brief.audience.primary}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Problem:</span>
                  <span className="text-slate-200">{session.brief.problem}</span>
                </div>
                <div>
                  <span className="text-slate-500 block uppercase text-[10px]">Value Prop:</span>
                  <span className="text-emerald-300">{session.brief.value}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Step 2: Generic Map & 2D Projection */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-950 text-blue-400 font-mono text-xs font-bold border border-blue-800">
                2
              </span>
              <div>
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
                  Generic Baseline Cluster (30 Samples)
                </h2>
                <p className="text-xs text-slate-400">
                  Maps what generic models output first to establish the negative space
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateGenericMap}
              disabled={loading}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold rounded-lg text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              {loading && streamProgress ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Mapping {streamProgress.step}/{streamProgress.total}...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{session?.generic_map ? "Re-Map Generic Cluster" : "Map Generic Cluster"}</span>
                </>
              )}
            </button>
          </div>

          {/* Stream Progress Bar */}
          {streamProgress && (
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-blue-500 h-full transition-all duration-200"
                style={{ width: `${(streamProgress.step / streamProgress.total) * 100}%` }}
              />
            </div>
          )}

          {/* Scatter Plot */}
          {session?.generic_map ? (
            <ScatterPlot
              points={session.generic_map.embedding_points}
              commonNames={session.generic_map.common_names}
              centroid={session.generic_map.centroid}
              onSelectCandidate={(id) => setSelectedDirectionId(id)}
            />
          ) : (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-8 text-center text-xs font-mono text-slate-500">
              Click "Map Generic Cluster" to generate 30 baseline concepts and calculate embeddings.
            </div>
          )}
        </section>

        {/* Step 3-5: Divergence, Dual Scoring & Direction Cards */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-950 text-blue-400 font-mono text-xs font-bold border border-blue-800">
                3
              </span>
              <div>
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
                  Divergence & Dual Scoring (Pass/Fail)
                </h2>
                <p className="text-xs text-slate-400">
                  Generates 3 non-generic directions outside the cluster, tests Genericness & Perception Gap
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDiverge}
              disabled={loading || !session?.generic_map}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-mono font-bold rounded-lg text-white shadow-md flex items-center gap-2 transition-all self-start sm:self-auto disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{session?.directions ? "Re-Run Diverge & Score" : "Run Diverge & Score"}</span>
            </button>
          </div>

          {/* Direction Cards Grid */}
          {session?.directions && session.directions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {session.directions.map((dir) => (
                <DirectionCard
                  key={dir.id}
                  direction={dir}
                  scores={session.scores?.[dir.id]}
                  blindReads={session.blind_reads?.[dir.id]}
                  isSelected={selectedDirectionId === dir.id}
                  onSelect={(id) => setSelectedDirectionId(id)}
                  onEdit={handleEditDirection}
                />
              ))}
            </div>
          ) : (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-8 text-center text-xs font-mono text-slate-500">
              Run Divergence to generate 3 distinctive brand directions with dual score evaluations.
            </div>
          )}
        </section>

        {/* Selected Direction Deep-Dive: Critique & Visual Previews */}
        {currentDirection && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CritiqueView
              revisions={currentDirection.revisions}
              directionName={currentDirection.name}
            />
            <VisualPreview
              visual={currentDirection.visual}
              brandName={currentDirection.name}
              tagline={currentDirection.tagline}
            />
          </div>
        )}

        {/* Stage 6: Trademark Collision Sentinel */}
        {collisions.length > 0 && <CollisionView collisions={collisions} />}

        {/* Stage 7: Red-Team Stress Test */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-950 text-red-400 font-mono text-xs font-bold border border-red-800">
                7
              </span>
              <div>
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
                  Adversarial Red-Team Loop
                </h2>
                <p className="text-xs text-slate-400">
                  Attacks brand boundaries to find clichés and harden machine-checkable rules
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleRunRedTeam()}
              disabled={loading || !currentDirection}
              className="px-4 py-1.5 bg-red-950 hover:bg-red-900 text-red-200 text-xs font-mono font-semibold rounded-lg border border-red-800 flex items-center gap-1.5 transition-colors self-start sm:self-auto disabled:opacity-50"
            >
              <Swords className="w-3.5 h-3.5 text-red-400" />
              <span>
                {session?.spec ? "Re-Run 3 Attack Rounds" : `Execute Red-Team Loop (${currentDirection?.name || "Selected"})`}
              </span>
            </button>
          </div>

          {session?.spec ? (
            <RedTeamLoop spec={session.spec} directionName={currentDirection?.name || "Selected"} />
          ) : (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-6 text-center text-xs font-mono text-slate-500">
              Execute the Red-Team loop to test the chosen direction against adversarial copy infiltrations.
            </div>
          )}
        </section>

        {/* Stage 8: Deliver BrandKit */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-950 text-amber-400 font-mono text-xs font-bold border border-amber-800">
                8
              </span>
              <div>
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
                  Delivery & Production Launch Collateral
                </h2>
                <p className="text-xs text-slate-400">
                  Synthesize the complete BrandKit and exportable PDF package
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleDeliverKit()}
              disabled={loading || !currentDirection}
              className="px-4 py-1.5 bg-amber-950 hover:bg-amber-900 text-amber-200 text-xs font-mono font-semibold rounded-lg border border-amber-800 flex items-center gap-1.5 transition-colors self-start sm:self-auto disabled:opacity-50"
            >
              <Rocket className="w-3.5 h-3.5 text-amber-400" />
              <span>{session?.brand_kit ? "Re-Synthesize BrandKit" : "Synthesize Launch Collateral"}</span>
            </button>
          </div>

          {session?.brand_kit && session.id ? (
            <LaunchKitView brandKit={session.brand_kit} sessionId={session.id} />
          ) : (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-6 text-center text-xs font-mono text-slate-500">
              Click "Synthesize Launch Collateral" to produce final landing headlines, social posts, and export package.
            </div>
          )}
        </section>

        {/* Stage 9: Automated Brand Guardian (Always Available) */}
        <section>
          <GuardianBox
            sessionId={session?.id}
            spec={session?.spec}
            brandName={currentDirection?.name || "Brand"}
          />
        </section>

        {/* Footer */}
        <footer className="pt-8 pb-12 text-center text-xs font-mono text-slate-600 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>Antimode // Non-Generic Machine-Enforced Brand Engine</div>
          <div>All Prompts in /prompts/*.md · State mirrored to /data/sessions/*.json</div>
        </footer>
      </div>
    </main>
  );
}
