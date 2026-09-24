"use client";

import React, { useState } from "react";
import { GuardianResult, BrandSpec } from "@/types/schemas";
import { ShieldCheck, ShieldAlert, ArrowRight, Sparkles, Check, AlertCircle } from "lucide-react";

interface GuardianBoxProps {
  sessionId?: string;
  spec?: BrandSpec;
  brandName?: string;
}

export function GuardianBox({ sessionId, spec, brandName = "Brand" }: GuardianBoxProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GuardianResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAudit = async (copyToCheck?: string) => {
    const textToCheck = copyToCheck !== undefined ? copyToCheck : text;
    if (!textToCheck.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/guardian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          text: textToCheck,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Guardian audit failed (HTTP ${res.status})`);
        setResult(null);
        return;
      }
      setResult(data);
    } catch (err: any) {
      console.error("Guardian audit failed:", err);
      setError(err.message || "Guardian audit failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const loadOffBrandSample = () => {
    const offBrand = `Experience the future of personal knowledge! Our revolutionary and seamless platform empowers modern teams to supercharge their workflows with smart, effortless notes. Enjoy complete peace of mind today!`;
    setText(offBrand);
    handleAudit(offBrand);
  };

  const loadOnBrandSample = () => {
    const onBrand = `Zero cloud telemetry. ChaCha20-Poly1305 local encryption. Terminal only. 0 network sockets bound. Sub-millisecond keystroke index lookup on disk.`;
    setText(onBrand);
    handleAudit(onBrand);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
              Automated Brand Guardian
            </h3>
            <p className="text-xs text-slate-400">
              Machine-checkable enforcement linter against BrandSpec rules
            </p>
          </div>
        </div>

        {/* Quick presets for acceptance testing */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={loadOffBrandSample}
            className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 transition-colors"
          >
            Load Off-Brand (Clichés)
          </button>
          <button
            type="button"
            onClick={loadOnBrandSample}
            className="px-2.5 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800 transition-colors"
          >
            Load On-Brand (Pass)
          </button>
        </div>
      </div>

      <div>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste draft copy, marketing announcement, or UI string here to test against the BrandSpec..."
          className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
        />

        <div className="flex justify-between items-center mt-2 font-mono text-xs">
          <span className="text-slate-500">
            {spec ? `${spec.banned_words.length} banned terms · ${spec.voice_rules.length} voice rules loaded` : "Using standard brand spec"}
          </span>
          <button
            type="button"
            onClick={() => handleAudit()}
            disabled={loading || !text.trim()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-md transition-colors flex items-center gap-1.5"
          >
            {loading ? (
              <span>Auditing...</span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Audit Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-rose-950/80 border border-rose-700 rounded-lg p-3 text-xs font-mono flex items-center justify-between text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => handleAudit()}
            className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded font-bold transition-colors shrink-0 ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="pt-2">
          {result.pass ? (
            <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-lg p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-900/60 text-emerald-400">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-mono font-bold text-emerald-300">
                  PASSED: Machine-Checkable Brand Compliance Verified
                </div>
                <div className="text-xs font-mono text-emerald-400/80">
                  Zero banned words, zero cliché tropes, and strictly aligns with declarative voice constraints.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-rose-950/40 border border-rose-800/80 rounded-lg p-3.5 flex items-center gap-3">
                <div className="p-2 rounded-full bg-rose-900/60 text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-mono font-bold text-rose-300">
                    FAILED: {result.violations.length} Brand Violation(s) Flagged
                  </div>
                  <div className="text-xs font-mono text-rose-400/80">
                    The submitted text contains generic marketing clichés or violates hardened voice rules.
                  </div>
                </div>
              </div>

              {/* Violations List */}
              <div className="space-y-2">
                {result.violations.map((v, i) => (
                  <div
                    key={i}
                    className="bg-slate-950 border border-rose-900/40 rounded-lg p-3 text-xs font-mono space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-rose-400 font-bold">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{v.rule}</span>
                      </span>
                      <span className="text-[10px] text-slate-500">Violation #{i + 1}</span>
                    </div>

                    <div className="text-slate-300 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
                      <span className="text-slate-500">Excerpt: </span>
                      <span className="text-rose-300 font-semibold">{v.excerpt}</span>
                    </div>

                    <div className="text-slate-400">
                      <span className="text-slate-500">Explanation: </span>
                      {v.explanation}
                    </div>

                    <div className="text-emerald-300 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/40">
                      <span className="text-emerald-500 font-semibold">Suggested Fix: </span>
                      {v.suggested_fix}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
