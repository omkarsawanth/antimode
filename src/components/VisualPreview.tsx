"use client";

import React, { useEffect, useState } from "react";
import { VisualSchema, Direction } from "@/types/schemas";
import { Copy, Check, Type, Palette } from "lucide-react";

interface VisualPreviewProps {
  visual: Direction["visual"];
  brandName: string;
  tagline: string;
}

export function VisualPreview({ visual, brandName, tagline }: VisualPreviewProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Dynamically load Google Fonts
  useEffect(() => {
    const headingFont = visual.typography.heading.replace(/\s+/g, "+");
    const bodyFont = visual.typography.body.replace(/\s+/g, "+");
    const fontUrl = `https://fonts.googleapis.com/css2?family=${headingFont}:wght@500;700;800;900&family=${bodyFont}:wght@400;500;600&display=swap`;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontUrl;
    document.head.appendChild(link);

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, [visual.typography.heading, visual.typography.body]);

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-pink-400" />
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-200">
            Live Visual & Typography Engine
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Type className="w-3.5 h-3.5 text-blue-400" />
          <span>
            {visual.typography.heading} / {visual.typography.body}
          </span>
        </div>
      </div>

      {/* Palette Swatches */}
      <div>
        <h4 className="text-xs font-mono uppercase text-slate-400 mb-2.5">
          Color Palette (WCAG Compliant)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {visual.palette.map((color, idx) => {
            const isCopied = copiedHex === color.hex;
            const isLight =
              color.hex === "#FFFFFF" ||
              color.hex.toLowerCase().startsWith("#f") ||
              color.hex.toLowerCase().startsWith("#e");

            return (
              <div
                key={idx}
                onClick={() => copyToClipboard(color.hex)}
                className="group relative cursor-pointer rounded-lg border border-slate-700/60 p-3 transition-transform hover:-translate-y-0.5 shadow flex flex-col justify-between h-28"
                style={{ backgroundColor: color.hex }}
              >
                <div className="flex justify-between items-start">
                  <span
                    className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                      isLight
                        ? "bg-slate-900/80 text-slate-100"
                        : "bg-white/20 text-white backdrop-blur"
                    }`}
                  >
                    {color.role}
                  </span>
                  <div
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                      isLight ? "text-slate-900" : "text-white"
                    }`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </div>
                </div>

                <div className="font-mono">
                  <div
                    className={`text-xs font-bold ${
                      isLight ? "text-slate-900" : "text-white"
                    }`}
                  >
                    {color.name}
                  </div>
                  <div
                    className={`text-[11px] opacity-80 ${
                      isLight ? "text-slate-800" : "text-slate-200"
                    }`}
                  >
                    {color.hex}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Google Fonts Specimen */}
      <div className="bg-slate-950/90 border border-slate-800 p-5 rounded-lg space-y-4">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex justify-between">
          <span>Live Specimen: Google Fonts Rendering</span>
          <span>Heading: {visual.typography.heading} · Body: {visual.typography.body}</span>
        </div>

        <div className="space-y-2 border-b border-slate-800/80 pb-4">
          <h2
            className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight"
            style={{ fontFamily: `"${visual.typography.heading}", sans-serif` }}
          >
            {brandName}
          </h2>
          <p
            className="text-lg text-slate-300 font-medium"
            style={{ fontFamily: `"${visual.typography.body}", sans-serif` }}
          >
            {tagline}
          </p>
        </div>

        <div className="text-xs text-slate-400 space-y-1 font-mono">
          <p>
            <span className="text-slate-500">Typographic Rationale: </span>
            {visual.typography.rationale}
          </p>
          <p>
            <span className="text-slate-500">Shape Language: </span>
            <span className="text-slate-300">{visual.shape_language}</span>
          </p>
          <p>
            <span className="text-slate-500">Image Direction: </span>
            <span className="text-slate-300">{visual.image_style}</span>
          </p>
          <p>
            <span className="text-slate-500">Visual Avoidances: </span>
            <span className="text-rose-400">{visual.avoid.join(", ")}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
