"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Maximize2,
  Layers,
  Compass,
  Palette,
  Eye,
  Columns,
} from "lucide-react";
import { ClipItem, UnifiedTimeline } from "../lib/types";

interface VideoPlayerProps {
  projectId: string;
  timeline: UnifiedTimeline | null;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  activeClip: ClipItem | null;
  onSelectClip: (clip: ClipItem) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  projectId,
  timeline,
  currentTime,
  onTimeUpdate,
  activeClip,
  onSelectClip,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [viewMode, setViewMode] = useState<"reference" | "split" | "reconstruction">("reference");
  const [showOverlays, setShowOverlays] = useState(true);

  const fps = timeline?.fps || 24.0;
  const duration = timeline?.total_duration_sec || 1.0;

  // Sync external seek (e.g. from timeline click)
  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.15) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    onTimeUpdate(t);

    // Update active clip if changed
    if (timeline?.clips) {
      const match = timeline.clips.find((c) => t >= c.start_time && t <= c.end_time);
      if (match && match.id !== activeClip?.id) {
        onSelectClip(match);
      }
    }
  };

  const stepFrame = (deltaFrames: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + deltaFrames / fps));
    videoRef.current.currentTime = newTime;
    onTimeUpdate(newTime);
  };

  const jumpToPreviousCut = () => {
    if (!timeline?.clips) return;
    const cuts = timeline.clips.map((c) => c.start_time);
    const prev = cuts.filter((t) => t < currentTime - 0.1).pop() ?? 0;
    if (videoRef.current) {
      videoRef.current.currentTime = prev;
      onTimeUpdate(prev);
    }
  };

  const jumpToNextCut = () => {
    if (!timeline?.clips) return;
    const cuts = timeline.clips.map((c) => c.start_time);
    const next = cuts.find((t) => t > currentTime + 0.1) ?? duration;
    if (videoRef.current) {
      videoRef.current.currentTime = next;
      onTimeUpdate(next);
    }
  };

  // Format SMPTE 00:00:00:00
  const formatSMPTE = (seconds: number) => {
    const totalFrames = Math.floor(seconds * fps);
    const intFps = Math.round(fps);
    const f = totalFrames % intFps;
    const s = Math.floor(seconds) % 60;
    const m = Math.floor(seconds / 60) % 60;
    const h = Math.floor(seconds / 3600);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-black/90 border border-editor-border rounded-lg overflow-hidden select-none">
      {/* Viewport Top Bar */}
      <div className="h-9 bg-editor-card/90 border-b border-editor-border px-3 flex items-center justify-between text-xs text-editor-muted">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-200">Video Preview</span>
          {activeClip && (
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Shot {String(activeClip.index).padStart(2, "0")} • {activeClip.visual_summary.shot_type.toUpperCase()}
            </span>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-1 bg-editor-panel p-0.5 rounded-md border border-editor-border text-[11px]">
          <button
            onClick={() => setViewMode("reference")}
            className={`px-2 py-0.5 rounded transition ${
              viewMode === "reference" ? "bg-cyan-600 text-white font-medium" : "text-editor-muted hover:text-white"
            }`}
          >
            Reference
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`px-2 py-0.5 rounded transition ${
              viewMode === "split" ? "bg-cyan-600 text-white font-medium" : "text-editor-muted hover:text-white"
            }`}
          >
            Split View
          </button>
          <button
            onClick={() => setViewMode("reconstruction")}
            className={`px-2 py-0.5 rounded transition ${
              viewMode === "reconstruction" ? "bg-cyan-600 text-white font-medium" : "text-editor-muted hover:text-white"
            }`}
          >
            Reconstruction HUD
          </button>
        </div>

        <button
          onClick={() => setShowOverlays(!showOverlays)}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded border transition text-[11px] ${
            showOverlays
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
              : "bg-editor-panel text-slate-500 border-editor-border"
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>HUD Overlays</span>
        </button>
      </div>

      {/* Main Video Screen with HUD Overlay */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden group">
        <video
          ref={videoRef}
          src={`/api/media/video/${projectId}`}
          className={`max-h-full max-w-full object-contain ${
            viewMode === "split" ? "w-1/2 border-r border-cyan-500/50" : "w-full"
          }`}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          playsInline
        />

        {/* Split View Right Side (Reconstruction Simulation View) */}
        {viewMode === "split" && activeClip && (
          <div className="w-1/2 h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden border-l border-editor-border">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-black to-slate-900/40 pointer-events-none" />
            <div className="relative z-10 space-y-3 max-w-xs">
              <div className="w-16 h-16 rounded-2xl mx-auto bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xl">
                <Layers className="w-8 h-8" />
              </div>
              <div className="text-sm font-semibold text-white">Reconstructed Decision Stack</div>
              <div className="text-xs text-editor-muted">
                {activeClip.visual_summary.description || "Shot framing & motion model"}
              </div>

              {/* Color Swatches */}
              {activeClip.color_profile.dominant_palette_hex && (
                <div className="flex items-center justify-center space-x-1.5 pt-1">
                  {activeClip.color_profile.dominant_palette_hex.map((hex, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HUD Visual Overlays: Camera Motion, OCR Boxes, Beat Meter */}
        {showOverlays && activeClip && (
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
            {/* Top HUD Badges */}
            <div className="flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-slate-200">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span className="capitalize">{activeClip.camera_motion.primary_motion.replace("_", " ")}</span>
                <span className="text-editor-muted">({activeClip.camera_motion.motion_magnitude.toFixed(1)} px/f)</span>
              </div>

              <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-slate-200">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeClip.color_profile.estimated_look}</span>
              </div>
            </div>

            {/* OCR Bounding Boxes */}
            <div className="relative w-full h-full">
              {activeClip.text_overlays.map((txt, idx) => {
                const [ymin, xmin, ymax, xmax] = txt.bbox_normalized;
                return (
                  <div
                    key={idx}
                    className="absolute border-2 border-amber-400/80 bg-amber-500/10 rounded pointer-events-none"
                    style={{
                      top: `${ymin * 100}%`,
                      left: `${xmin * 100}%`,
                      width: `${(xmax - xmin) * 100}%`,
                      height: `${(ymax - ymin) * 100}%`,
                    }}
                  >
                    <span className="absolute -top-4 left-0 bg-amber-500 text-black text-[9px] font-bold px-1 rounded">
                      {txt.category.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom HUD: Beat Alignment & Confidence */}
            <div className="flex items-center justify-between text-[11px] font-mono">
              <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-emerald-400">
                <span>Beat Alignment: {(activeClip.beat_alignment_score * 100).toFixed(0)}%</span>
              </div>
              <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-cyan-400">
                <span>Boundary Conf: {(activeClip.boundary_confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Playhead & Scrub Control Bar */}
      <div className="h-12 bg-editor-card border-t border-editor-border px-4 flex items-center justify-between select-none">
        {/* Playback Transport Buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={jumpToPreviousCut}
            className="p-1.5 rounded hover:bg-editor-panel text-slate-300 hover:text-white transition"
            title="Jump to Previous Cut (A)"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => stepFrame(-1)}
            className="p-1.5 rounded hover:bg-editor-panel text-slate-300 hover:text-white transition"
            title="Step 1 Frame Backward (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlay}
            className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20 transition mx-1"
            title="Play / Pause (Space)"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
          </button>
          <button
            onClick={() => stepFrame(1)}
            className="p-1.5 rounded hover:bg-editor-panel text-slate-300 hover:text-white transition"
            title="Step 1 Frame Forward (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={jumpToNextCut}
            className="p-1.5 rounded hover:bg-editor-panel text-slate-300 hover:text-white transition"
            title="Jump to Next Cut (S)"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Monospace Timecode Display */}
        <div className="flex items-center space-x-2 font-timecode text-xs text-slate-200 bg-editor-panel px-3 py-1 rounded-md border border-editor-border">
          <span className="text-cyan-400 font-bold">{formatSMPTE(currentTime)}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{formatSMPTE(duration)}</span>
        </div>

        {/* Audio Mute & Speed */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            className="text-slate-400 hover:text-white transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
