"use client";

import React, { useRef, useState } from "react";
import {
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Film,
  Type,
  Music,
  Sparkles,
  Layers,
  CheckCircle2,
  Volume2,
  Clock,
} from "lucide-react";
import { ComponentItem, ComponentManifest } from "./types";

interface EditTimelineProps {
  manifest: ComponentManifest;
  currentTime: number;
  onSeek: (time: number) => void;
  selectedComponent: ComponentItem | null;
  onSelectComponent: (comp: ComponentItem) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
}

export const EditTimeline: React.FC<EditTimelineProps> = ({
  manifest,
  currentTime,
  onSeek,
  selectedComponent,
  onSelectComponent,
  isPlaying = false,
  onTogglePlay,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState(50); // pixels per second

  const totalDuration = Math.max(manifest.total_duration_sec, 1);
  const totalWidth = totalDuration * zoomLevel;

  // Group components by track
  const videoClips = manifest.components.filter(
    (c) => c.category === "video_clip" || c.category === "transition"
  );
  const imageOverlays = manifest.components.filter((c) => c.category === "image_graphic");
  const textItems = manifest.components.filter((c) => c.category === "text_component");
  const audioItems = manifest.components.filter((c) => c.category === "audio_component");
  const effectItems = manifest.components.filter((c) => c.category === "effect");

  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const seekSec = Math.max(0, Math.min(totalDuration, clickX / zoomLevel));
    onSeek(seekSec);
  };

  const renderTrackItem = (comp: ComponentItem, colorClass: string) => {
    const dur = comp.duration ?? (comp as any).duration_sec ?? (comp.end_time - comp.start_time);
    const itemName = comp.title || (comp as any).name || comp.id;
    const userLabel = comp.replacement?.original_filename || (comp as any).replacement_data?.user_label || itemName;
    const left = comp.start_time * zoomLevel;
    const width = Math.max(dur * zoomLevel, 12);
    const isSelected = selectedComponent?.id === comp.id;
    const isReplaced = comp.status === "replaced";
    const isRemoved = comp.status === "removed";

    return (
      <div
        key={comp.id}
        onClick={(e) => {
          e.stopPropagation();
          onSelectComponent(comp);
          onSeek(comp.start_time);
        }}
        style={{ left: `${left}px`, width: `${width}px` }}
        className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center justify-between cursor-pointer select-none transition group text-xs overflow-hidden ${
          isSelected
            ? "ring-2 ring-purple-400 z-20 shadow-lg shadow-purple-500/30"
            : "hover:ring-1 hover:ring-white/40"
        } ${
          isReplaced
            ? "bg-emerald-950/80 border border-emerald-500/70 text-emerald-200"
            : isRemoved
            ? "bg-slate-900/60 border border-dashed border-slate-600 text-slate-500 line-through opacity-50"
            : `${colorClass} border border-white/10 text-slate-200`
        }`}
        title={`${itemName} (${comp.start_time.toFixed(2)}s - ${comp.end_time.toFixed(2)}s) - ${comp.status}`}
      >
        <div className="flex items-center space-x-1 min-w-0 truncate">
          {isReplaced && <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
          <span className="font-medium truncate text-[11px]">
            {userLabel}
          </span>
        </div>
        <span className="text-[9px] font-mono opacity-60 ml-1 flex-shrink-0">
          {dur.toFixed(1)}s
        </span>
      </div>
    );
  };

  // Generate ruler tick marks every second
  const ticks = [];
  const tickStep = zoomLevel > 70 ? 1 : zoomLevel > 30 ? 2 : 5;
  for (let sec = 0; sec <= Math.ceil(totalDuration); sec += tickStep) {
    ticks.push(sec);
  }

  return (
    <div className="bg-editor-card border-t border-editor-border flex flex-col h-64 select-none">
      {/* Timeline Controls Bar */}
      <div className="h-10 px-4 border-b border-editor-border flex items-center justify-between bg-editor-panel/70">
        <div className="flex items-center space-x-3">
          {onTogglePlay && (
            <button
              onClick={onTogglePlay}
              className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          )}

          <div className="flex items-center space-x-2 font-mono text-xs bg-editor-card px-2.5 py-1 rounded-md border border-editor-border">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-white font-bold">{formatTimecode(currentTime)}</span>
            <span className="text-editor-muted">/</span>
            <span className="text-editor-muted">{formatTimecode(totalDuration)}</span>
          </div>
        </div>

        {/* Legend / Status */}
        <div className="hidden md:flex items-center space-x-4 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-900 border border-blue-500" />
            <span className="text-slate-400">Original</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-950 border border-emerald-500" />
            <span className="text-emerald-400 font-medium">Replaced</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-dashed border-slate-500" />
            <span className="text-slate-500">Muted / Removed</span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoomLevel((z) => Math.max(15, z - 10))}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-editor-hover transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={15}
            max={150}
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="w-20 accent-purple-500 cursor-pointer h-1 bg-editor-border rounded-lg"
          />
          <button
            onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-editor-hover transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Multitrack Scroller */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers (Left fixed) */}
        <div className="w-32 bg-editor-card/90 border-r border-editor-border flex flex-col flex-shrink-0 text-xs font-semibold text-editor-muted">
          <div className="h-6 border-b border-editor-border px-2 flex items-center text-[10px] uppercase tracking-wider text-slate-500">
            Tracks
          </div>
          <div className="h-10 border-b border-editor-border/50 px-2 flex items-center space-x-1.5 text-blue-300">
            <Film className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Video</span>
          </div>
          <div className="h-10 border-b border-editor-border/50 px-2 flex items-center space-x-1.5 text-amber-300">
            <Layers className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Overlays</span>
          </div>
          <div className="h-10 border-b border-editor-border/50 px-2 flex items-center space-x-1.5 text-cyan-300">
            <Type className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Text & Titles</span>
          </div>
          <div className="h-10 border-b border-editor-border/50 px-2 flex items-center space-x-1.5 text-indigo-300">
            <Music className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Audio</span>
          </div>
          <div className="h-10 px-2 flex items-center space-x-1.5 text-purple-300">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Effects</span>
          </div>
        </div>

        {/* Tracks Content (Scrollable) */}
        <div
          ref={containerRef}
          onClick={handleTimelineClick}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-editor-bg/80 cursor-crosshair"
        >
          <div style={{ width: `${Math.max(totalWidth + 100, 600)}px` }} className="relative h-full">
            {/* Time Ruler */}
            <div className="h-6 border-b border-editor-border bg-editor-card/40 relative font-mono text-[10px] text-editor-muted">
              {ticks.map((sec) => (
                <div
                  key={sec}
                  style={{ left: `${sec * zoomLevel}px` }}
                  className="absolute top-0 bottom-0 flex flex-col items-start pl-1 border-l border-editor-border"
                >
                  <span>{sec}s</span>
                </div>
              ))}
            </div>

            {/* Playhead Vertical Line */}
            <div
              style={{ left: `${currentTime * zoomLevel}px` }}
              className="absolute top-0 bottom-0 w-0.5 bg-purple-400 z-30 pointer-events-none shadow-sm shadow-purple-500"
            >
              <div className="w-3 h-3 bg-purple-500 rounded-full -ml-[5px] -mt-1 shadow-md" />
            </div>

            {/* Track 1: Video */}
            <div className="h-10 border-b border-editor-border/50 relative bg-slate-950/20">
              {videoClips.map((comp) => renderTrackItem(comp, "bg-blue-950/60"))}
            </div>

            {/* Track 2: Overlays */}
            <div className="h-10 border-b border-editor-border/50 relative bg-slate-950/10">
              {imageOverlays.map((comp) => renderTrackItem(comp, "bg-amber-950/60"))}
            </div>

            {/* Track 3: Text */}
            <div className="h-10 border-b border-editor-border/50 relative bg-slate-950/20">
              {textItems.map((comp) => renderTrackItem(comp, "bg-cyan-950/60"))}
            </div>

            {/* Track 4: Audio */}
            <div className="h-10 border-b border-editor-border/50 relative bg-slate-950/10">
              {audioItems.map((comp) => renderTrackItem(comp, "bg-indigo-950/60"))}
            </div>

            {/* Track 5: Effects */}
            <div className="h-10 relative bg-slate-950/20">
              {effectItems.map((comp) => renderTrackItem(comp, "bg-purple-950/60"))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
