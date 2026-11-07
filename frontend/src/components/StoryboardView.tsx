"use client";

import React, { useState } from "react";
import {
  LayoutGrid,
  List,
  Film,
  Compass,
  Palette,
  CheckCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { ClipItem, UnifiedTimeline } from "../lib/types";

interface StoryboardViewProps {
  timeline: UnifiedTimeline;
  activeClip: ClipItem | null;
  onSelectClip: (clip: ClipItem) => void;
  onSeek: (time: number) => void;
}

export const StoryboardView: React.FC<StoryboardViewProps> = ({
  timeline,
  activeClip,
  onSelectClip,
  onSeek,
}) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleCardClick = (clip: ClipItem) => {
    onSelectClip(clip);
    onSeek(clip.start_time);
  };

  return (
    <div className="flex-1 flex flex-col bg-editor-bg p-4 overflow-y-auto select-none space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-editor-border pb-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <LayoutGrid className="w-5 h-5 text-cyan-400" />
            <span>Clip Storyboard Inventory</span>
          </h2>
          <p className="text-xs text-editor-muted">
            {timeline.total_clips} reconstructed shots • Frame-accurate cut sequence
          </p>
        </div>

        <div className="flex items-center space-x-1 bg-editor-panel p-0.5 rounded-lg border border-editor-border">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded transition ${
              viewMode === "grid" ? "bg-cyan-600 text-white" : "text-editor-muted hover:text-white"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded transition ${
              viewMode === "list" ? "bg-cyan-600 text-white" : "text-editor-muted hover:text-white"
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {timeline.clips.map((clip) => {
            const isSelected = activeClip?.id === clip.id;
            return (
              <div
                key={clip.id}
                onClick={() => handleCardClick(clip)}
                className={`bg-editor-card rounded-xl border overflow-hidden cursor-pointer transition hover:border-cyan-500/60 shadow-lg group flex flex-col justify-between ${
                  isSelected
                    ? "border-cyan-400 ring-2 ring-cyan-500/30 bg-cyan-950/20"
                    : "border-editor-border hover:bg-editor-panel/50"
                }`}
              >
                {/* Thumbnail Image */}
                <div className="relative aspect-video bg-black overflow-hidden">
                  <img
                    src={clip.thumbnail_url}
                    alt={clip.id}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e) => {
                      // Fallback placeholder if image fails to render
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-white/10">
                    Shot {String(clip.index).padStart(2, "0")}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-cyan-300 font-mono text-[10px] px-2 py-0.5 rounded border border-white/10">
                    {clip.duration.toFixed(2)}s
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-medium">
                      <span className="capitalize text-slate-200">
                        {clip.visual_summary.shot_type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {(clip.boundary_confidence * 100).toFixed(0)}% Conf
                      </span>
                    </div>

                    <p className="text-[11px] text-editor-muted line-clamp-2">
                      {clip.visual_summary.description || "Video cut segment"}
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="pt-2 border-t border-editor-border/60 flex flex-wrap gap-1 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-editor-panel text-cyan-300 border border-editor-border flex items-center space-x-1">
                      <Compass className="w-2.5 h-2.5" />
                      <span className="capitalize">{clip.camera_motion.primary_motion.replace("_", " ")}</span>
                    </span>

                    <span className="px-1.5 py-0.5 rounded bg-editor-panel text-amber-300 border border-editor-border flex items-center space-x-1">
                      <Palette className="w-2.5 h-2.5" />
                      <span>{clip.color_profile.estimated_look}</span>
                    </span>

                    {clip.text_overlays.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {clip.text_overlays.length} Text Overlays
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Layout */
        <div className="bg-editor-card border border-editor-border rounded-xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-editor-panel border-b border-editor-border text-[11px] text-editor-muted uppercase font-mono">
              <tr>
                <th className="py-2.5 px-3">Shot</th>
                <th className="py-2.5 px-3">Thumbnail</th>
                <th className="py-2.5 px-3">Timecode (In / Out)</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Framing</th>
                <th className="py-2.5 px-3">Camera Motion</th>
                <th className="py-2.5 px-3">Color Grade</th>
                <th className="py-2.5 px-3">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-editor-border/60 font-mono">
              {timeline.clips.map((clip) => {
                const isSelected = activeClip?.id === clip.id;
                return (
                  <tr
                    key={clip.id}
                    onClick={() => handleCardClick(clip)}
                    className={`cursor-pointer transition hover:bg-editor-panel/70 ${
                      isSelected ? "bg-cyan-950/40 text-cyan-200" : "text-slate-300"
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-white">#{String(clip.index).padStart(2, "0")}</td>
                    <td className="py-2.5 px-3">
                      <img
                        src={clip.thumbnail_url}
                        alt=""
                        className="w-14 h-8 object-cover rounded border border-white/10"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      {clip.start_time.toFixed(2)}s → {clip.end_time.toFixed(2)}s
                    </td>
                    <td className="py-2.5 px-3">{clip.duration.toFixed(2)}s</td>
                    <td className="py-2.5 px-3 font-sans capitalize text-slate-200">
                      {clip.visual_summary.shot_type.replace("_", " ")}
                    </td>
                    <td className="py-2.5 px-3 font-sans capitalize text-cyan-300">
                      {clip.camera_motion.primary_motion.replace("_", " ")}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-amber-300">
                      {clip.color_profile.estimated_look}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400">
                      {(clip.boundary_confidence * 100).toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
