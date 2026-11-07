"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { EditorProject, EditorClip, ClipTransform } from "./types";

interface EditorPlayerProps {
  project: EditorProject;
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  selectedClip: EditorClip | null;
}

export const EditorPlayer: React.FC<EditorPlayerProps> = ({
  project,
  currentTime,
  isPlaying,
  onTogglePlay,
  onSeek,
  selectedClip,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find active video/image clip on V1 or V2 at currentTime
  const activeVideoClip = project.tracks
    .filter((t) => !t.is_muted && t.type !== "audio")
    .flatMap((t) => t.clips)
    .find((c) => currentTime >= c.start_time && currentTime <= c.start_time + c.duration && c.media_type !== "text");

  // Find active text overlay clips at currentTime
  const activeTextClips = project.tracks
    .filter((t) => !t.is_muted)
    .flatMap((t) => t.clips)
    .filter((c) => c.media_type === "text" && currentTime >= c.start_time && currentTime <= c.start_time + c.duration);

  // Sync HTML5 video element time to timeline currentTime
  useEffect(() => {
    if (!videoRef.current || !activeVideoClip || activeVideoClip.media_type !== "video") return;
    const clipOffset = currentTime - activeVideoClip.start_time;
    const targetVideoTime = (activeVideoClip.trim_in || 0) + clipOffset;

    if (Math.abs(videoRef.current.currentTime - targetVideoTime) > 0.25) {
      videoRef.current.currentTime = Math.max(0, targetVideoTime);
    }
  }, [currentTime, activeVideoClip]);

  // Sync play/pause
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  // Keyframe Interpolation Math
  const computedTransform = useMemo<ClipTransform>(() => {
    if (!activeVideoClip) {
      return { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
    }

    const base = { ...activeVideoClip.transform };
    if (!activeVideoClip.keyframes || activeVideoClip.keyframes.length === 0) {
      return base;
    }

    const offset = currentTime - activeVideoClip.start_time;

    // Interpolate each property
    for (const prop of ["scale", "x", "y", "rotation", "opacity"] as const) {
      const propKfs = activeVideoClip.keyframes
        .filter((k) => k.property === prop)
        .sort((a, b) => a.time_offset - b.time_offset);

      if (propKfs.length === 0) continue;

      if (offset <= propKfs[0].time_offset) {
        base[prop] = propKfs[0].value;
      } else if (offset >= propKfs[propKfs.length - 1].time_offset) {
        base[prop] = propKfs[propKfs.length - 1].value;
      } else {
        // Find interval
        for (let i = 0; i < propKfs.length - 1; i++) {
          const kfA = propKfs[i];
          const kfB = propKfs[i + 1];
          if (offset >= kfA.time_offset && offset <= kfB.time_offset) {
            const factor = (offset - kfA.time_offset) / Math.max(0.01, kfB.time_offset - kfA.time_offset);
            base[prop] = kfA.value + (kfB.value - kfA.value) * factor;
            break;
          }
        }
      }
    }

    return base;
  }, [activeVideoClip, currentTime]);

  // Color Grading CSS Filter String
  const computedFilterString = useMemo(() => {
    if (!activeVideoClip || !activeVideoClip.color_adjustments) return "none";
    const ca = activeVideoClip.color_adjustments;
    const brightness = 1 + (ca.brightness || 0) / 100;
    const contrast = ca.contrast || 1;
    const saturate = ca.saturation || 1;
    const hue = ca.tint || 0;

    return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) hue-rotate(${hue}deg)`;
  }, [activeVideoClip]);

  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const frames = Math.floor((sec % 1) * 30);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
  };

  const getAspectClass = () => {
    switch (project.aspect_ratio) {
      case "9:16":
        return "aspect-[9/16] max-h-[460px] w-auto";
      case "1:1":
        return "aspect-square max-h-[460px] w-auto";
      case "4:5":
        return "aspect-[4/5] max-h-[460px] w-auto";
      case "21:9":
        return "aspect-[21/9] w-full max-w-[700px]";
      default:
        return "aspect-video w-full max-w-[720px]";
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-editor-bg border-r border-editor-border relative select-none">
      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-4 bg-gradient-to-b from-[#0b0f19] to-[#080b11] relative overflow-hidden"
      >
        <div
          className={`relative bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center ${getAspectClass()}`}
        >
          {/* Active Clip Render */}
          {activeVideoClip ? (
            activeVideoClip.media_type === "image" ? (
              <img
                src={activeVideoClip.media_url || activeVideoClip.file_path}
                alt={activeVideoClip.name}
                className="w-full h-full object-contain pointer-events-none transition-transform duration-75"
                style={{
                  transform: `scale(${computedTransform.scale}) translate(${computedTransform.x}px, ${computedTransform.y}px) rotate(${computedTransform.rotation}deg)`,
                  opacity: computedTransform.opacity,
                  filter: computedFilterString,
                }}
              />
            ) : (
              <video
                ref={videoRef}
                src={activeVideoClip.media_url}
                className="w-full h-full object-contain pointer-events-none transition-transform duration-75"
                playsInline
                muted={activeVideoClip.is_muted}
                style={{
                  transform: `scale(${computedTransform.scale}) translate(${computedTransform.x}px, ${computedTransform.y}px) rotate(${computedTransform.rotation}deg)`,
                  opacity: computedTransform.opacity,
                  filter: computedFilterString,
                }}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-600 space-y-2 p-6 text-center">
              <div className="w-12 h-12 rounded-full border border-slate-800 flex items-center justify-center text-slate-500">
                <Play className="w-5 h-5 ml-0.5 opacity-50" />
              </div>
              <p className="text-xs font-medium text-slate-500">No media at {formatTimecode(currentTime)}</p>
              <p className="text-[10px] text-slate-600">Drag media onto Track V1 or V2 to begin editing</p>
            </div>
          )}

          {/* Active Text Overlays */}
          {activeTextClips.map((tc) => (
            <div
              key={tc.id}
              className="absolute inset-0 flex items-center justify-center pointer-events-none px-6"
              style={{
                textAlign: tc.text_properties?.alignment || "center",
              }}
            >
              <span
                style={{
                  color: tc.text_properties?.font_color || "#ffffff",
                  fontSize: `${(tc.text_properties?.font_size || 48) * 0.5}px`,
                  fontFamily: tc.text_properties?.font_family || "sans-serif",
                  textShadow: tc.text_properties?.shadow_color
                    ? `0 2px ${tc.text_properties.shadow_blur || 8}px ${tc.text_properties.shadow_color}`
                    : "0 2px 8px rgba(0,0,0,0.8)",
                  backgroundColor: tc.text_properties?.background_color || "transparent",
                  transform: `scale(${tc.transform.scale}) translate(${tc.transform.x}px, ${tc.transform.y}px)`,
                  opacity: tc.transform.opacity,
                }}
                className="font-bold tracking-wide select-none"
              >
                {tc.text_properties?.text}
              </span>
            </div>
          ))}

          {/* Aspect & Active Filter Badges */}
          <div className="absolute top-2 left-2 flex items-center space-x-1.5">
            <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur border border-white/10 text-[10px] font-mono text-cyan-400">
              {project.aspect_ratio} &bull; {project.width}x{project.height}
            </span>
            {activeVideoClip?.chroma_key?.enabled && (
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-600/50 text-[10px] font-mono text-emerald-300">
                Chroma Key
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Playback Controls Transport Bar */}
      <div className="h-12 bg-editor-card border-t border-editor-border px-4 flex items-center justify-between">
        {/* Timecode */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-cyan-400 font-bold">{formatTimecode(currentTime)}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">{formatTimecode(project.total_duration_sec)}</span>
        </div>

        {/* Playback Transport Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 1 / 30))}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-editor-panel transition"
            title="Step Back 1 Frame"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-8 h-8 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-600/30 transition"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={() => onSeek(Math.min(project.total_duration_sec, currentTime + 1 / 30))}
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-editor-panel transition"
            title="Step Forward 1 Frame"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Framerate Indicator */}
        <div className="flex items-center space-x-2 text-slate-400 font-mono text-[11px]">
          <span>{project.fps} FPS</span>
        </div>
      </div>
    </div>
  );
};
