"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Eye,
  Volume2,
  Sliders,
  Scissors,
  Music,
} from "lucide-react";
import { UnifiedTimeline, ClipItem, TimelineTrack } from "../lib/types";

interface MultitrackTimelineProps {
  timeline: UnifiedTimeline;
  currentTime: number;
  onSeek: (time: number) => void;
  activeClip: ClipItem | null;
  onSelectClip: (clip: ClipItem) => void;
  onClipTrim: (clipId: string, newStart: number, newEnd: number) => void;
}

export const MultitrackTimeline: React.FC<MultitrackTimelineProps> = ({
  timeline,
  currentTime,
  onSeek,
  activeClip,
  onSelectClip,
  onClipTrim,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1.0); // 1.0 = fit, 2.0 = 2x zoom, up to 5x
  const [isScrubbing, setIsScrubbing] = useState(false);

  const totalDuration = timeline.total_duration_sec || 1.0;
  const fps = timeline.fps || 24.0;

  // Handle timeline clicking / scrubbing
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * totalDuration;
    onSeek(targetTime);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    handleTimelineClick(e);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrubbing || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      onSeek(ratio * totalDuration);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
    };

    if (isScrubbing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isScrubbing, totalDuration, onSeek]);

  // Playhead position percentage
  const playheadPercent = (currentTime / totalDuration) * 100;

  return (
    <div className="h-64 bg-editor-card border-t border-editor-border flex flex-col select-none overflow-hidden">
      {/* Timeline Toolbar & Ruler Header */}
      <div className="h-8 bg-editor-panel border-b border-editor-border px-3 flex items-center justify-between text-xs">
        {/* Left Track Names Title */}
        <div className="w-36 md:w-44 font-semibold text-slate-300 flex items-center space-x-1.5">
          <Scissors className="w-3.5 h-3.5 text-cyan-400" />
          <span>Timeline Tracks</span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom((z) => Math.max(1.0, z - 0.5))}
            className="p-1 rounded hover:bg-editor-hover text-slate-400 hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 w-8 text-center">
            {zoom.toFixed(1)}x
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(5.0, z + 0.5))}
            className="p-1 rounded hover:bg-editor-hover text-slate-400 hover:text-white transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="h-3 w-[1px] bg-editor-border mx-1" />
          <button
            onClick={() => setZoom(1.0)}
            className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-white p-1 rounded hover:bg-editor-hover"
            title="Fit to Screen"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Fit</span>
          </button>
        </div>
      </div>

      {/* Main Track Grid Area */}
      <div className="flex-1 flex overflow-x-auto overflow-y-hidden">
        {/* Track Headers (Left Column) */}
        <div className="w-36 md:w-44 bg-editor-card/90 border-r border-editor-border flex flex-col flex-shrink-0 z-20 shadow-md">
          {/* Ruler Spacing */}
          <div className="h-6 border-b border-editor-border bg-editor-panel/60" />

          {/* V1 Video Track Header */}
          <div className="h-14 border-b border-editor-border px-3 flex items-center justify-between text-xs font-medium text-slate-300">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>V1: Video</span>
            </div>
            <Eye className="w-3.5 h-3.5 text-slate-500" />
          </div>

          {/* V2 Text Track Header */}
          <div className="h-10 border-b border-editor-border px-3 flex items-center justify-between text-xs font-medium text-slate-300">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>V2: Titles</span>
            </div>
            <Eye className="w-3.5 h-3.5 text-slate-500" />
          </div>

          {/* A1 Audio Track Header */}
          <div className="h-10 border-b border-editor-border px-3 flex items-center justify-between text-xs font-medium text-slate-300">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>A1: Audio</span>
            </div>
            <Volume2 className="w-3.5 h-3.5 text-slate-500" />
          </div>

          {/* FX Effects Track Header */}
          <div className="h-10 border-b border-editor-border px-3 flex items-center justify-between text-xs font-medium text-slate-300">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span>FX: Motion</span>
            </div>
            <Lock className="w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>

        {/* Tracks Content & Playhead (Right Scrollable Container) */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          className="flex-1 relative cursor-pointer overflow-x-hidden min-w-[700px]"
          style={{ width: `${100 * zoom}%` }}
        >
          {/* Timecode Ruler Bar */}
          <div className="h-6 border-b border-editor-border bg-editor-panel/40 flex items-center relative text-[10px] font-timecode text-slate-400">
            {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, sec) => {
              const leftPercent = (sec / totalDuration) * 100;
              return (
                <div
                  key={sec}
                  className="absolute flex flex-col items-center pointer-events-none"
                  style={{ left: `${leftPercent}%` }}
                >
                  <div className="h-2 w-[1px] bg-slate-600" />
                  <span className="-translate-x-1/2 mt-0.5">
                    {sec % 2 === 0 ? `${sec}s` : ""}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Red Scrubhead / Playhead Line */}
          <div
            className="absolute top-0 bottom-0 z-30 pointer-events-none transition-none"
            style={{ left: `${playheadPercent}%` }}
          >
            <div className="w-[2px] h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            <div className="w-3 h-3 bg-cyan-400 rounded-sm -translate-x-1.5 -translate-y-1 rotate-45 shadow-md" />
          </div>

          {/* TRACK 1: V1 VIDEO CLIPS */}
          <div className="h-14 border-b border-editor-border relative bg-editor-bg/60 p-1 flex">
            {timeline.clips.map((clip) => {
              const leftPct = (clip.start_time / totalDuration) * 100;
              const widthPct = (clip.duration / totalDuration) * 100;
              const isSelected = activeClip?.id === clip.id;

              return (
                <div
                  key={clip.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClip(clip);
                    onSeek(clip.start_time);
                  }}
                  className={`absolute top-1 bottom-1 rounded-md overflow-hidden border cursor-pointer transition shadow-sm flex flex-col justify-between p-1.5 ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-950/80 shadow-[0_0_10px_rgba(6,182,212,0.3)] z-10"
                      : "border-blue-500/40 bg-blue-950/40 hover:border-blue-400"
                  }`}
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                >
                  <div className="flex items-center justify-between text-[10px] text-white font-medium leading-none truncate">
                    <span className="truncate">Shot {String(clip.index).padStart(2, "0")}</span>
                    <span className="font-mono text-[9px] text-blue-300/80 ml-1">
                      {clip.duration.toFixed(1)}s
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 text-[9px] text-editor-muted">
                    <span className="px-1 py-0.2 rounded bg-black/40 text-cyan-300 font-mono">
                      {clip.visual_summary.shot_type}
                    </span>
                    {clip.transition_in !== "cut" && (
                      <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">
                        {clip.transition_in}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TRACK 2: V2 TEXT & TITLES */}
          <div className="h-10 border-b border-editor-border relative bg-editor-bg/40 p-1">
            {timeline.tracks
              .find((t) => t.type === "text")
              ?.events.map((evt) => {
                const leftPct = (evt.start_time / totalDuration) * 100;
                const widthPct = Math.max(2, (evt.duration / totalDuration) * 100);
                return (
                  <div
                    key={evt.id}
                    className="absolute top-1 bottom-1 rounded bg-amber-500/20 border border-amber-500/40 px-2 flex items-center text-[10px] text-amber-300 font-medium truncate"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={evt.title}
                  >
                    <span className="truncate">{evt.title}</span>
                  </div>
                );
              })}
          </div>

          {/* TRACK 3: A1 AUDIO & SPEECH */}
          <div className="h-10 border-b border-editor-border relative bg-editor-bg/40 p-1">
            {/* Visual Beat Markers on Audio Track */}
            {timeline.audio_analysis.beats.map((beat, bIdx) => {
              const bLeft = (beat.time_sec / totalDuration) * 100;
              return (
                <div
                  key={bIdx}
                  className="absolute top-0 bottom-0 w-[1px] bg-emerald-500/40 pointer-events-none"
                  style={{ left: `${bLeft}%` }}
                  title={`Beat ${bIdx + 1}: ${beat.time_sec}s`}
                />
              );
            })}

            {timeline.tracks
              .find((t) => t.type === "audio")
              ?.events.map((evt) => {
                const leftPct = (evt.start_time / totalDuration) * 100;
                const widthPct = Math.max(3, (evt.duration / totalDuration) * 100);
                return (
                  <div
                    key={evt.id}
                    className="absolute top-1 bottom-1 rounded bg-emerald-500/20 border border-emerald-500/40 px-2 flex items-center text-[10px] text-emerald-300 font-medium truncate z-10"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={evt.title}
                  >
                    <span className="truncate">{evt.title}</span>
                  </div>
                );
              })}
          </div>

          {/* TRACK 4: FX CAMERA & MOTION */}
          <div className="h-10 border-b border-editor-border relative bg-editor-bg/40 p-1">
            {timeline.tracks
              .find((t) => t.type === "effects")
              ?.events.map((evt) => {
                const leftPct = (evt.start_time / totalDuration) * 100;
                const widthPct = Math.max(3, (evt.duration / totalDuration) * 100);
                return (
                  <div
                    key={evt.id}
                    className="absolute top-1 bottom-1 rounded bg-purple-500/20 border border-purple-500/40 px-2 flex items-center text-[10px] text-purple-300 font-medium truncate"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    title={evt.title}
                  >
                    <span className="truncate">{evt.title}</span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
