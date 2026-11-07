"use client";

import React, { useState } from "react";
import { Type, Play, Filter, CheckCircle2 } from "lucide-react";
import { UnifiedTimeline, TextOverlay } from "../lib/types";

interface OcrViewProps {
  timeline: UnifiedTimeline;
  onSeek: (time: number) => void;
}

export const OcrView: React.FC<OcrViewProps> = ({ timeline, onSeek }) => {
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Collect all text overlays across all clips
  const allOverlays: Array<TextOverlay & { clipIndex: number; clipId: string }> = [];
  timeline.clips.forEach((clip) => {
    clip.text_overlays.forEach((txt) => {
      allOverlays.push({
        ...txt,
        clipIndex: clip.index,
        clipId: clip.id,
      });
    });
  });

  const filtered = allOverlays.filter((o) =>
    filterCategory === "all" ? true : o.category === filterCategory
  );

  return (
    <div className="flex-1 flex flex-col bg-editor-bg p-4 overflow-y-auto select-none space-y-4">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-editor-border pb-3 gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Type className="w-5 h-5 text-amber-400" />
            <span>On-Screen Text & Titles Inventory</span>
          </h2>
          <p className="text-xs text-editor-muted">
            Detected via PP-OCRv4 / RapidOCR ONNX • Bounding box coordinates & categories
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-1 bg-editor-panel p-1 rounded-lg border border-editor-border text-xs">
          {["all", "title", "subtitle", "lower_third", "watermark"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded capitalize transition ${
                filterCategory === cat
                  ? "bg-amber-500 text-black font-semibold"
                  : "text-editor-muted hover:text-white"
              }`}
            >
              {cat.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Detected Overlays */}
      {filtered.length === 0 ? (
        <div className="bg-editor-card border border-editor-border rounded-xl p-8 text-center text-editor-muted space-y-2">
          <Type className="w-8 h-8 mx-auto text-slate-600" />
          <div className="text-sm font-semibold text-slate-400">No On-Screen Text Detected</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No graphics, titles, or lower thirds matching the active filter were detected in this video.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onSeek(item.timestamp_sec)}
              className="bg-editor-card border border-editor-border hover:border-amber-500/60 rounded-xl p-3.5 cursor-pointer transition shadow-md hover:bg-editor-panel/50 space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {item.category.replace("_", " ")}
                </span>
                <span className="text-[10px] font-mono text-emerald-400">
                  {(item.confidence * 100).toFixed(0)}% Conf
                </span>
              </div>

              <div className="text-sm font-semibold text-white group-hover:text-amber-200 transition">
                {item.text}
              </div>

              <div className="pt-2 border-t border-editor-border/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <button className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300">
                  <Play className="w-3 h-3 fill-current" />
                  <span>{item.timestamp_sec.toFixed(2)}s (Shot {item.clipIndex})</span>
                </button>
                <span className="text-[10px] text-slate-500">
                  Box: [{item.bbox_normalized.map((n) => n.toFixed(2)).join(", ")}]
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
