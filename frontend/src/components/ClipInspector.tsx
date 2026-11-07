"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  CheckCircle,
  HelpCircle,
  Compass,
  Palette,
  Type,
  Music,
  Gauge,
  Save,
  Clock,
  Sparkles,
} from "lucide-react";
import { ClipItem, ShotType } from "../lib/types";

interface ClipInspectorProps {
  clip: ClipItem | null;
  onUpdateClip: (updatedData: Partial<ClipItem>) => void;
}

export const ClipInspector: React.FC<ClipInspectorProps> = ({ clip, onUpdateClip }) => {
  const [shotType, setShotType] = useState<ShotType>("medium");
  const [cameraMotion, setCameraMotion] = useState("static");
  const [transitionIn, setTransitionIn] = useState("cut");
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (clip) {
      setShotType(clip.visual_summary.shot_type);
      setCameraMotion(clip.camera_motion.primary_motion);
      setTransitionIn(clip.transition_in);
      setStartTime(clip.start_time);
      setEndTime(clip.end_time);
    }
  }, [clip]);

  if (!clip) {
    return (
      <div className="w-80 bg-editor-card border-l border-editor-border p-5 flex flex-col items-center justify-center text-center text-editor-muted select-none">
        <Sliders className="w-10 h-10 text-slate-600 mb-2" />
        <div className="text-sm font-semibold text-slate-400">Clip Inspector</div>
        <div className="text-xs text-slate-500 max-w-xs mt-1">
          Click on any shot in the timeline or storyboard to inspect and refine its reverse-engineered decisions.
        </div>
      </div>
    );
  }

  const handleSave = () => {
    setIsSaving(true);
    onUpdateClip({
      start_time: startTime,
      end_time: endTime,
      transition_in: transitionIn as any,
      visual_summary: {
        ...clip.visual_summary,
        shot_type: shotType,
      },
      camera_motion: {
        ...clip.camera_motion,
        primary_motion: cameraMotion as any,
      },
      user_modified: true,
    });
    setTimeout(() => setIsSaving(false), 400);
  };

  return (
    <div className="w-80 bg-editor-card border-l border-editor-border flex flex-col justify-between overflow-y-auto select-none">
      <div className="p-4 space-y-4">
        {/* Header & Shot Badge */}
        <div className="border-b border-editor-border pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Shot {String(clip.index).padStart(2, "0")} Inspector
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-editor-panel text-slate-300 border border-editor-border">
              {clip.id}
            </span>
          </div>
          <div className="text-[11px] text-editor-muted mt-0.5">
            {clip.visual_summary.description || "Video cut segment"}
          </div>
        </div>

        {/* Boundary Facts & Evidence */}
        <div className="bg-editor-panel/50 border border-editor-border rounded-lg p-2.5 space-y-1.5 text-xs">
          <div className="flex items-center justify-between font-medium text-slate-200">
            <span className="flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Boundary Fact</span>
            </span>
            <span className="font-mono text-cyan-400">
              {(clip.boundary_confidence * 100).toFixed(0)}% Conf
            </span>
          </div>
          <div className="text-[11px] text-slate-400 leading-tight">
            Source: <span className="text-slate-300">{clip.detector_source}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1">
            <div>In: {clip.start_time.toFixed(3)}s</div>
            <div>Out: {clip.end_time.toFixed(3)}s</div>
            <div>Dur: {clip.duration.toFixed(3)}s</div>
            <div>Frames: {clip.end_frame - clip.start_frame + 1}</div>
          </div>
        </div>

        {/* Visual Understanding & Framing Override */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Shot Framing</span>
            </span>
            <span className="text-[10px] text-editor-muted font-normal">(Inferred Effect)</span>
          </label>
          <select
            value={shotType}
            onChange={(e) => setShotType(e.target.value as ShotType)}
            className="w-full bg-editor-panel border border-editor-border text-xs text-white rounded-md p-2 focus:ring-1 focus:ring-cyan-500"
          >
            <option value="extreme_wide">Extreme Wide Shot (EWS)</option>
            <option value="wide">Wide Shot (WS)</option>
            <option value="medium">Medium Shot (MS)</option>
            <option value="medium_close_up">Medium Close-Up (MCU)</option>
            <option value="close_up">Close-Up (CU)</option>
            <option value="extreme_close_up">Extreme Close-Up (ECU)</option>
          </select>
        </div>

        {/* Camera Motion Classifier */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Camera Motion</span>
            </span>
            <span className="text-[10px] text-editor-muted font-normal">
              {clip.camera_motion.motion_magnitude.toFixed(1)} px/f
            </span>
          </label>
          <select
            value={cameraMotion}
            onChange={(e) => setCameraMotion(e.target.value)}
            className="w-full bg-editor-panel border border-editor-border text-xs text-white rounded-md p-2 focus:ring-1 focus:ring-cyan-500"
          >
            <option value="static">Static Camera</option>
            <option value="pan_left">Pan Left</option>
            <option value="pan_right">Pan Right</option>
            <option value="tilt_up">Tilt Up</option>
            <option value="tilt_down">Tilt Down</option>
            <option value="zoom_in">Zoom In</option>
            <option value="zoom_out">Zoom Out</option>
            <option value="handheld">Organic Handheld / Shake</option>
            <option value="complex_movement">Complex Movement</option>
          </select>
        </div>

        {/* Color Treatment & Aesthetic Grade */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>Color Profile & Look</span>
          </label>
          <div className="bg-editor-panel/50 border border-editor-border rounded-lg p-2.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Estimated Grade:</span>
              <span className="font-medium text-amber-300">{clip.color_profile.estimated_look}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Saturation: {clip.color_profile.saturation_level}</span>
              <span>Temp: {clip.color_profile.temperature}</span>
            </div>
            {clip.color_profile.dominant_palette_hex && (
              <div className="flex items-center space-x-1.5 pt-1">
                {clip.color_profile.dominant_palette_hex.map((hex, i) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded border border-white/20 shadow-sm cursor-pointer hover:scale-110 transition"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transition Style */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Transition In</label>
          <select
            value={transitionIn}
            onChange={(e) => setTransitionIn(e.target.value)}
            className="w-full bg-editor-panel border border-editor-border text-xs text-white rounded-md p-2 focus:ring-1 focus:ring-cyan-500"
          >
            <option value="cut">Hard Cut</option>
            <option value="dissolve">Cross Dissolve</option>
            <option value="fade_black">Fade to Black</option>
            <option value="fade_white">Fade to White</option>
            <option value="wipe">Directional Wipe</option>
          </select>
        </div>

        {/* Musical Beat Synchronization */}
        <div className="bg-editor-panel/50 border border-editor-border rounded-lg p-2.5 text-xs space-y-1">
          <div className="flex items-center justify-between font-medium text-slate-300">
            <span className="flex items-center space-x-1.5">
              <Music className="w-3.5 h-3.5 text-emerald-400" />
              <span>Beat Sync Score</span>
            </span>
            <span className="font-mono text-emerald-400">
              {(clip.beat_alignment_score * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-[11px] text-editor-muted">
            Delta to nearest musical beat:{" "}
            <span className="font-mono text-slate-300">
              {(clip.nearest_beat_delta_sec * 1000).toFixed(0)} ms
            </span>
          </div>
        </div>

        {/* On-Screen Text Detected in this Clip */}
        {clip.text_overlays.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Type className="w-3.5 h-3.5 text-amber-400" />
              <span>On-Screen Text ({clip.text_overlays.length})</span>
            </label>
            <div className="space-y-1">
              {clip.text_overlays.map((txt, i) => (
                <div
                  key={i}
                  className="bg-editor-panel border border-editor-border p-2 rounded text-xs space-y-0.5"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="uppercase font-mono text-amber-400">{txt.category}</span>
                    <span className="text-slate-500">{(txt.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-slate-200 font-medium">{txt.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Manual Override Button */}
      <div className="p-4 border-t border-editor-border bg-editor-panel/40">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs py-2 rounded-md shadow-md shadow-cyan-600/20 transition"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? "Saving..." : "Save Manual Corrections"}</span>
        </button>
      </div>
    </div>
  );
};
