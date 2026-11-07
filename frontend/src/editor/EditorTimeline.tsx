"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Film,
  Type,
  Music,
  Scissors,
  Trash2,
  Copy,
  Magnet,
  Flag,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  FastForward,
  Diamond,
  Layers,
  Snowflake,
} from "lucide-react";
import { EditorProject, EditorTrack, EditorClip, TimelineMarker } from "./types";

interface EditorTimelineProps {
  project: EditorProject;
  currentTime: number;
  onSeek: (time: number) => void;
  selectedClip: EditorClip | null;
  onSelectClip: (clip: EditorClip | null) => void;
  onUpdateClip: (clipId: string, partial: Partial<EditorClip>) => void;
  onDeleteClip: (clipId: string) => void;
  onRippleDeleteClip: (clipId: string) => void;
  onDuplicateClip: (clipId: string) => void;
  onFreezeFrame?: (clipId: string, freezeTime: number) => void;
  onSplitClip: (clipId: string, splitTime: number) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackLock: (trackId: string) => void;
  onAddMarker: (time: number, label?: string) => void;
  onDeleteMarker: (markerId: string) => void;
}

export const EditorTimeline: React.FC<EditorTimelineProps> = ({
  project,
  currentTime,
  onSeek,
  selectedClip,
  onSelectClip,
  onUpdateClip,
  onDeleteClip,
  onRippleDeleteClip,
  onDuplicateClip,
  onFreezeFrame,
  onSplitClip,
  onToggleTrackMute,
  onToggleTrackLock,
  onAddMarker,
  onDeleteMarker,
}) => {
  const [zoomLevel, setZoomLevel] = useState(40); // pixels per second
  const [isSnapping, setIsSnapping] = useState(true);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState<{
    clipId: string;
    edge: "left" | "right";
    initialX: number;
    initialStart: number;
    initialDuration: number;
  } | null>(null);

  const duration = Math.max(project.total_duration_sec, 20);
  const totalWidth = duration * zoomLevel + 300;

  // Snapping helper: find nearest snap point (other clip edges, playhead, markers) within tolerance
  const getSnappedTime = (time: number, tolerancePx: number = 8) => {
    if (!isSnapping) return time;
    const snapToleranceSec = tolerancePx / zoomLevel;
    const snapPoints = [0.0, currentTime];

    if (project.markers) {
      snapPoints.push(...project.markers.map((m) => m.time));
    }

    for (const track of project.tracks) {
      for (const clip of track.clips) {
        snapPoints.push(clip.start_time);
        snapPoints.push(clip.start_time + clip.duration);
      }
    }

    for (const pt of snapPoints) {
      if (Math.abs(time - pt) <= snapToleranceSec) {
        return pt;
      }
    }
    return time;
  };

  // Keyboard shortcut listener on timeline: M (Marker), C (Split), Del (Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        onAddMarker(currentTime, `Cue ${Math.floor(currentTime)}s`);
      } else if (e.key === "c" || e.key === "C") {
        if (selectedClip && currentTime > selectedClip.start_time && currentTime < selectedClip.start_time + selectedClip.duration) {
          e.preventDefault();
          onSplitClip(selectedClip.id, currentTime);
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedClip) {
          e.preventDefault();
          if (e.shiftKey) {
            onRippleDeleteClip(selectedClip.id);
          } else {
            onDeleteClip(selectedClip.id);
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
        if (selectedClip) {
          e.preventDefault();
          onDuplicateClip(selectedClip.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTime, selectedClip, onAddMarker, onSplitClip, onDeleteClip, onRippleDeleteClip, onDuplicateClip]);

  // Handle timeline seek clicking/scrubbing
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
    let seekTime = Math.max(0, clickX / zoomLevel);
    seekTime = getSnappedTime(seekTime);
    onSeek(Math.min(seekTime, duration));
  };

  // Trimming handlers with magnetic snapping
  const handleStartResize = (
    e: React.MouseEvent,
    clip: EditorClip,
    edge: "left" | "right"
  ) => {
    e.stopPropagation();
    setResizing({
      clipId: clip.id,
      edge,
      initialX: e.clientX,
      initialStart: clip.start_time,
      initialDuration: clip.duration,
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - e.clientX;
      const deltaTime = deltaX / zoomLevel;

      if (edge === "left") {
        let newStart = Math.max(0, clip.start_time + deltaTime);
        newStart = getSnappedTime(newStart);
        const newDur = Math.max(0.2, (clip.start_time + clip.duration) - newStart);
        onUpdateClip(clip.id, { start_time: newStart, duration: newDur });
      } else {
        let newEnd = clip.start_time + clip.duration + deltaTime;
        newEnd = getSnappedTime(newEnd);
        const newDur = Math.max(0.2, newEnd - clip.start_time);
        onUpdateClip(clip.id, { duration: newDur });
      }
    };

    const handleMouseUp = () => {
      setResizing(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const getTrackIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Film className="w-3.5 h-3.5 text-cyan-400" />;
      case "overlay":
      case "text":
        return <Type className="w-3.5 h-3.5 text-purple-400" />;
      case "audio":
        return <Music className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Film className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getClipBg = (clip: EditorClip, isSelected: boolean) => {
    const border = isSelected ? "ring-2 ring-cyan-400 border-white shadow-xl scale-[1.005] z-20" : "border-slate-700/60";
    switch (clip.media_type) {
      case "video":
        return `bg-gradient-to-r from-cyan-950/90 via-blue-950/80 to-slate-900 text-cyan-200 ${border}`;
      case "text":
        return `bg-gradient-to-r from-purple-950/90 via-fuchsia-950/80 to-slate-900 text-purple-200 ${border}`;
      case "audio":
        return `bg-gradient-to-r from-amber-950/90 via-orange-950/80 to-slate-900 text-amber-200 ${border}`;
      case "image":
        return `bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-slate-900 text-emerald-200 ${border}`;
      default:
        return `bg-slate-800 text-slate-200 ${border}`;
    }
  };

  return (
    <div className="h-68 bg-editor-panel border-t border-editor-border flex flex-col select-none relative">
      {/* CapCut Timeline Controls Header */}
      <div className="h-11 bg-editor-card border-b border-editor-border px-4 flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          {/* Split at playhead */}
          <button
            onClick={() => {
              if (selectedClip) onSplitClip(selectedClip.id, currentTime);
            }}
            disabled={!selectedClip || currentTime <= selectedClip.start_time || currentTime >= selectedClip.start_time + selectedClip.duration}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-editor-panel hover:bg-slate-700 text-xs text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Split Clip at Playhead (C)"
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span>Split (C)</span>
          </button>

          {/* Delete clip */}
          <button
            onClick={() => {
              if (selectedClip) onDeleteClip(selectedClip.id);
            }}
            disabled={!selectedClip}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-editor-panel hover:bg-rose-950/60 text-xs text-rose-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Delete Selected Clip (Del)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete</span>
          </button>

          {/* Ripple Delete */}
          <button
            onClick={() => {
              if (selectedClip) onRippleDeleteClip(selectedClip.id);
            }}
            disabled={!selectedClip}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-editor-panel hover:bg-amber-950/60 text-xs text-amber-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Ripple Delete: remove gap and pull subsequent clips (Shift+Del)"
          >
            <FastForward className="w-3.5 h-3.5 text-amber-400" />
            <span>Ripple Del</span>
          </button>

          {/* Duplicate clip */}
          <button
            onClick={() => {
              if (selectedClip) onDuplicateClip(selectedClip.id);
            }}
            disabled={!selectedClip}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-editor-panel hover:bg-slate-700 text-xs text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Duplicate Selected Clip (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
            <span>Duplicate</span>
          </button>

          {/* Freeze Frame */}
          <button
            onClick={() => {
              if (selectedClip && onFreezeFrame) onFreezeFrame(selectedClip.id, currentTime);
            }}
            disabled={!selectedClip || currentTime <= selectedClip.start_time || currentTime >= selectedClip.start_time + selectedClip.duration}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-editor-panel hover:bg-cyan-950/60 text-xs text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Freeze Frame at Playhead (3s hold)"
          >
            <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
            <span>Freeze</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-700 mx-1" />

          {/* Add Cue Marker */}
          <button
            onClick={() => onAddMarker(currentTime, `Cue ${Math.floor(currentTime)}s`)}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-editor-panel hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition"
            title="Add Timeline Cue Marker (M)"
          >
            <Flag className="w-3.5 h-3.5 text-cyan-400" />
            <span>Marker (M)</span>
          </button>

          {/* Snapping Toggle */}
          <button
            onClick={() => setIsSnapping((s) => !s)}
            className={`p-1.5 rounded transition ${
              isSnapping ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/50" : "text-slate-500 hover:text-slate-300 bg-editor-panel"
            }`}
            title={isSnapping ? "Magnetic Snapping ON" : "Magnetic Snapping OFF"}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Level */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoomLevel((z) => Math.max(15, z - 10))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-editor-panel"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 w-12 text-center">{zoomLevel} px/s</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(120, z + 10))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-editor-panel"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Multitrack Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Control Headers */}
        <div className="w-44 bg-editor-card border-r border-editor-border flex flex-col shrink-0 z-10">
          <div className="h-7 border-b border-editor-border bg-editor-panel/50 px-3 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Layers</span>
            <span className="text-[9px] font-mono">{project.tracks.length} Tracks</span>
          </div>

          {project.tracks.map((track) => (
            <div
              key={track.id}
              className="h-16 border-b border-editor-border px-3 flex items-center justify-between group hover:bg-slate-800/40"
            >
              <div className="flex items-center space-x-2 truncate">
                {getTrackIcon(track.type)}
                <span className="text-xs font-semibold text-slate-200 truncate">{track.name}</span>
              </div>
              <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100">
                <button
                  onClick={() => onToggleTrackMute(track.id)}
                  className={`p-1 rounded ${track.is_muted ? "text-rose-400 bg-rose-950/50" : "text-slate-400 hover:text-white"}`}
                  title={track.is_muted ? "Unmute Track" : "Mute Track"}
                >
                  {track.is_muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => onToggleTrackLock(track.id)}
                  className={`p-1 rounded ${track.is_locked ? "text-amber-400 bg-amber-950/50" : "text-slate-400 hover:text-white"}`}
                  title={track.is_locked ? "Unlock Track" : "Lock Track"}
                >
                  {track.is_locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Tracks Canvas */}
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#090d16] cursor-pointer"
        >
          {/* Time Ruler with Markers */}
          <div
            className="h-7 border-b border-editor-border bg-editor-panel/40 relative flex items-center"
            style={{ width: `${totalWidth}px` }}
          >
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, sec) => (
              <div
                key={sec}
                className="absolute top-0 bottom-0 border-l border-slate-700/50 flex flex-col justify-end pb-0.5 pl-1"
                style={{ left: `${sec * zoomLevel}px` }}
              >
                <span className="text-[9px] font-mono text-slate-400 pointer-events-none">{sec}s</span>
              </div>
            ))}

            {/* Cue Markers */}
            {project.markers?.map((marker) => (
              <div
                key={marker.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(marker.time);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDeleteMarker(marker.id);
                }}
                className="absolute top-0 bottom-0 z-20 flex flex-col items-center cursor-pointer group"
                style={{ left: `${marker.time * zoomLevel}px` }}
                title={`${marker.label} (${marker.time.toFixed(1)}s) • Click to seek, right-click to delete`}
              >
                <div
                  className="w-2.5 h-2.5 rotate-45 shadow-sm"
                  style={{ backgroundColor: marker.color }}
                />
                <span className="text-[8px] font-mono px-1 rounded bg-black/80 text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap -mt-0.5">
                  {marker.label}
                </span>
              </div>
            ))}
          </div>

          {/* Red Playhead Line */}
          <div
            className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
            style={{ left: `${currentTime * zoomLevel}px` }}
          >
            <div className="w-3 h-3 bg-rose-500 rotate-45 -mt-1 shadow-md shadow-rose-500/50" />
            <div className="w-[2px] flex-1 bg-rose-500 shadow-lg shadow-rose-500/80" />
          </div>

          {/* Tracks Container */}
          <div style={{ width: `${totalWidth}px` }}>
            {project.tracks.map((track) => (
              <div
                key={track.id}
                className={`h-16 border-b border-editor-border/60 relative ${track.is_locked ? "opacity-60 pointer-events-none" : ""}`}
              >
                <div className="absolute inset-0 bg-slate-900/20" />

                {/* Clips in this track */}
                {track.clips.map((clip) => {
                  const isSelected = selectedClip?.id === clip.id;
                  const clipLeft = clip.start_time * zoomLevel;
                  const clipWidth = Math.max(16, clip.duration * zoomLevel);

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip);
                      }}
                      className={`absolute top-2 bottom-2 rounded-md border flex items-center px-2 cursor-pointer transition-all overflow-hidden ${getClipBg(clip, isSelected)}`}
                      style={{
                        left: `${clipLeft}px`,
                        width: `${clipWidth}px`,
                      }}
                    >
                      {/* Left Trim Handle */}
                      <div
                        onMouseDown={(e) => handleStartResize(e, clip, "left")}
                        className="absolute left-0 top-0 bottom-0 w-2 hover:w-3 bg-white/20 hover:bg-cyan-400 cursor-ew-resize transition-all z-10"
                        title="Drag to trim start"
                      />

                      {/* Content Label & Icons */}
                      <div className="flex items-center space-x-1.5 truncate pointer-events-none px-1 relative z-10">
                        {clip.media_type === "video" && <Film className="w-3 h-3 shrink-0" />}
                        {clip.media_type === "text" && <Type className="w-3 h-3 shrink-0" />}
                        {clip.media_type === "audio" && <Music className="w-3 h-3 shrink-0" />}
                        <span className="text-xs font-medium truncate">{clip.name}</span>
                        <span className="text-[10px] opacity-60 font-mono">({clip.duration.toFixed(1)}s)</span>
                      </div>

                      {/* Waveform Visualization inside Audio Clips */}
                      {clip.media_type === "audio" && (
                        <div className="absolute inset-0 flex items-center justify-between px-2 opacity-30 pointer-events-none">
                          {Array.from({ length: Math.min(30, Math.floor(clipWidth / 4)) }).map((_, i) => (
                            <div
                              key={i}
                              className="w-[2px] bg-amber-400 rounded-full"
                              style={{ height: `${20 + ((i * 17) % 60)}%` }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Keyframe Diamonds Overlay */}
                      {clip.keyframes && clip.keyframes.length > 0 && (
                        <div className="absolute top-1 right-2 flex items-center space-x-1 z-10 pointer-events-none">
                          {clip.keyframes.map((kf, kfIdx) => (
                            <div
                              key={kfIdx}
                              className="w-2 h-2 rotate-45 bg-amber-400 border border-white shadow-sm"
                              title={`Keyframe: ${kf.property} at +${kf.time_offset.toFixed(1)}s`}
                            />
                          ))}
                        </div>
                      )}

                      {/* Right Trim Handle */}
                      <div
                        onMouseDown={(e) => handleStartResize(e, clip, "right")}
                        className="absolute right-0 top-0 bottom-0 w-2 hover:w-3 bg-white/20 hover:bg-cyan-400 cursor-ew-resize transition-all z-10"
                        title="Drag to trim end"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
