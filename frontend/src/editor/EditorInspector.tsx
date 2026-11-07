"use client";

import React, { useState } from "react";
import {
  Sliders,
  Type,
  Volume2,
  Gauge,
  Maximize2,
  Trash2,
  Palette,
  Sparkles,
  Key,
  Diamond,
  RotateCw,
  Eye,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Shield,
  Layers,
  FastForward,
} from "lucide-react";
import { EditorClip, ClipTransform, ColorAdjustments, ChromaKeySettings, ClipKeyframe, TextProperties } from "./types";

interface EditorInspectorProps {
  clip: EditorClip | null;
  currentTime: number;
  onUpdateClip: (clipId: string, partial: Partial<EditorClip>) => void;
  onDeleteClip: (clipId: string) => void;
}

export const EditorInspector: React.FC<EditorInspectorProps> = ({
  clip,
  currentTime,
  onUpdateClip,
  onDeleteClip,
}) => {
  const [activeTab, setActiveTab] = useState<"basic" | "keyframes" | "color" | "chroma" | "audio">("basic");

  if (!clip) {
    return (
      <div className="w-80 bg-editor-card border-l border-editor-border p-6 flex flex-col items-center justify-center text-center select-none">
        <Sliders className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-xs font-semibold text-slate-400">Clip Inspector</p>
        <p className="text-[11px] text-slate-600 mt-1">Select a clip on the timeline to customize transform, keyframes, color grading, or audio</p>
      </div>
    );
  }

  const offset = Math.max(0, currentTime - clip.start_time);

  // Transform Update Helper
  const handleTransformChange = (key: keyof ClipTransform, value: number) => {
    onUpdateClip(clip.id, {
      transform: {
        ...clip.transform,
        [key]: value,
      },
    });
  };

  // Color Adjustment Helper
  const handleColorChange = (key: keyof ColorAdjustments, value: number) => {
    onUpdateClip(clip.id, {
      color_adjustments: {
        ...(clip.color_adjustments || {
          brightness: 0,
          contrast: 1,
          saturation: 1,
          temperature: 0,
          tint: 0,
          exposure: 0,
          sharpen: 0,
          vignette: 0,
        }),
        [key]: value,
      },
    });
  };

  // Chroma Key Helper
  const handleChromaChange = (partial: Partial<ChromaKeySettings>) => {
    onUpdateClip(clip.id, {
      chroma_key: {
        ...(clip.chroma_key || {
          enabled: false,
          target_color: "#00ff00",
          similarity: 0.4,
          smoothness: 0.1,
          spill: 0.1,
        }),
        ...partial,
      },
    });
  };

  // Audio Settings Helper
  const handleAudioChange = (key: string, value: any) => {
    onUpdateClip(clip.id, {
      audio_settings: {
        ...(clip.audio_settings || {
          volume: clip.volume || 1.0,
          fade_in: 0.0,
          fade_out: 0.0,
          is_muted: clip.is_muted || false,
          pitch_preserved: true,
        }),
        [key]: value,
      },
    });
  };

  // Keyframe Management
  const handleToggleKeyframe = (prop: "scale" | "x" | "y" | "rotation" | "opacity") => {
    const existingKfs = clip.keyframes || [];
    const matched = existingKfs.find((k) => k.property === prop && Math.abs(k.time_offset - offset) < 0.2);

    let nextKfs: ClipKeyframe[];
    if (matched) {
      // Remove keyframe
      nextKfs = existingKfs.filter((k) => k !== matched);
    } else {
      // Add keyframe at current offset with current value
      const val = clip.transform[prop];
      nextKfs = [
        ...existingKfs,
        {
          id: `kf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          time_offset: offset,
          property: prop,
          value: val,
          easing: "ease_in_out",
        },
      ];
    }
    onUpdateClip(clip.id, { keyframes: nextKfs });
  };

  const isKeyframedAtCurrentTime = (prop: "scale" | "x" | "y" | "rotation" | "opacity") => {
    return Boolean(clip.keyframes?.some((k) => k.property === prop && Math.abs(k.time_offset - offset) < 0.2));
  };

  return (
    <div className="w-80 bg-editor-card border-l border-editor-border flex flex-col overflow-y-auto select-none text-xs">
      {/* Top Header */}
      <div className="p-3.5 border-b border-editor-border flex items-center justify-between bg-editor-panel/40">
        <div className="truncate">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{clip.media_type}</span>
          <h3 className="font-bold text-white text-xs truncate">{clip.name}</h3>
        </div>
        <button
          onClick={() => onDeleteClip(clip.id)}
          className="p-1.5 rounded bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 transition"
          title="Delete Clip"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inspector Navigation Tabs */}
      <div className="grid grid-cols-5 border-b border-editor-border bg-editor-panel/50 text-[10px] font-semibold text-slate-400">
        <button
          onClick={() => setActiveTab("basic")}
          className={`py-2 text-center border-b-2 transition ${
            activeTab === "basic" ? "border-cyan-500 text-cyan-300 bg-slate-800/40" : "border-transparent hover:text-white"
          }`}
        >
          Basic
        </button>
        <button
          onClick={() => setActiveTab("keyframes")}
          className={`py-2 text-center border-b-2 transition ${
            activeTab === "keyframes" ? "border-cyan-500 text-cyan-300 bg-slate-800/40" : "border-transparent hover:text-white"
          }`}
        >
          Keyframes
        </button>
        <button
          onClick={() => setActiveTab("color")}
          className={`py-2 text-center border-b-2 transition ${
            activeTab === "color" ? "border-cyan-500 text-cyan-300 bg-slate-800/40" : "border-transparent hover:text-white"
          }`}
        >
          Color
        </button>
        <button
          onClick={() => setActiveTab("chroma")}
          className={`py-2 text-center border-b-2 transition ${
            activeTab === "chroma" ? "border-cyan-500 text-cyan-300 bg-slate-800/40" : "border-transparent hover:text-white"
          }`}
        >
          Chroma
        </button>
        <button
          onClick={() => setActiveTab("audio")}
          className={`py-2 text-center border-b-2 transition ${
            activeTab === "audio" ? "border-cyan-500 text-cyan-300 bg-slate-800/40" : "border-transparent hover:text-white"
          }`}
        >
          Audio
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* BASIC TAB */}
        {activeTab === "basic" && (
          <div className="space-y-4">
            {/* Speed & Reverse */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Playback Speed</span>
                </span>
                <span className="font-mono text-cyan-300 font-bold">{clip.speed}x</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[0.5, 1.0, 1.5, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateClip(clip.id, { speed: s })}
                    className={`py-1 rounded font-mono text-[11px] border transition ${
                      clip.speed === s ? "bg-cyan-600 border-cyan-500 text-white" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>

              {/* Reverse Playback Toggle */}
              <button
                onClick={() => onUpdateClip(clip.id, { is_reversed: !clip.is_reversed })}
                className={`w-full mt-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                  clip.is_reversed ? "bg-purple-950/60 border-purple-500 text-purple-300" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <FastForward className="w-3.5 h-3.5 rotate-180" />
                <span>{clip.is_reversed ? "Reversed (50%–200%)" : "Normal Direction"}</span>
              </button>
            </div>

            {/* Transform Controls */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Scale & Position</span>
              </span>

              {/* Scale */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Scale Multiplier</span>
                  <span className="font-mono text-slate-300">{clip.transform.scale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.05"
                  value={clip.transform.scale}
                  onChange={(e) => handleTransformChange("scale", parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* Rotation */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Rotation</span>
                  <span className="font-mono text-slate-300">{clip.transform.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={clip.transform.rotation}
                  onChange={(e) => handleTransformChange("rotation", parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* Opacity */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Opacity</span>
                  <span className="font-mono text-slate-300">{Math.round(clip.transform.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={clip.transform.opacity}
                  onChange={(e) => handleTransformChange("opacity", parseFloat(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>

            {/* Text Properties if Text Clip */}
            {clip.media_type === "text" && clip.text_properties && (
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                  <Type className="w-3.5 h-3.5 text-purple-400" />
                  <span>Typography</span>
                </span>
                <textarea
                  rows={2}
                  value={clip.text_properties.text}
                  onChange={(e) =>
                    onUpdateClip(clip.id, {
                      text_properties: { ...clip.text_properties!, text: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white text-xs outline-none focus:border-purple-500"
                />
              </div>
            )}
          </div>
        )}

        {/* KEYFRAMES TAB */}
        {activeTab === "keyframes" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Diamond className="w-3.5 h-3.5 text-amber-400" />
                <span>Animation Keyframing</span>
              </h4>
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Click diamond button to set a keyframe at current playhead (+{offset.toFixed(2)}s). Values will smoothly interpolate.
              </p>
            </div>

            {/* Keyframe Property Triggers */}
            <div className="space-y-2">
              {(["scale", "opacity", "rotation"] as const).map((prop) => {
                const isSet = isKeyframedAtCurrentTime(prop);
                return (
                  <div
                    key={prop}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-xs text-slate-200 capitalize">{prop}</span>
                      <p className="text-[10px] text-slate-500 font-mono">Current: {clip.transform[prop]}</p>
                    </div>
                    <button
                      onClick={() => handleToggleKeyframe(prop)}
                      className={`p-1.5 rounded-lg border flex items-center space-x-1 transition ${
                        isSet
                          ? "bg-amber-500 text-black border-amber-400 font-bold shadow-md shadow-amber-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      <Diamond className="w-3.5 h-3.5" />
                      <span className="text-[10px]">{isSet ? "Active" : "+ Key"}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Active Keyframes List */}
            {clip.keyframes && clip.keyframes.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Timeline Keyframes ({clip.keyframes.length})
                </span>
                {clip.keyframes.map((kf, i) => (
                  <div
                    key={kf.id || i}
                    className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]"
                  >
                    <span className="text-amber-300 font-mono font-bold capitalize">{kf.property}</span>
                    <span className="text-slate-400 font-mono">+{kf.time_offset.toFixed(1)}s = {kf.value.toFixed(1)}</span>
                    <button
                      onClick={() => {
                        const next = clip.keyframes?.filter((_, idx) => idx !== i);
                        onUpdateClip(clip.id, { keyframes: next });
                      }}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COLOR GRADING TAB */}
        {activeTab === "color" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span>Color Grading</span>
              </span>
              <button
                onClick={() =>
                  onUpdateClip(clip.id, {
                    color_adjustments: {
                      brightness: 0,
                      contrast: 1,
                      saturation: 1,
                      temperature: 0,
                      tint: 0,
                      exposure: 0,
                      sharpen: 0,
                      vignette: 0,
                    },
                  })
                }
                className="text-[10px] text-slate-500 hover:text-cyan-400 transition"
              >
                Reset
              </button>
            </div>

            {/* Brightness */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Brightness</span>
                <span className="font-mono text-slate-300">{clip.color_adjustments?.brightness || 0}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={clip.color_adjustments?.brightness || 0}
                onChange={(e) => handleColorChange("brightness", parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Contrast</span>
                <span className="font-mono text-slate-300">{clip.color_adjustments?.contrast || 1}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={clip.color_adjustments?.contrast || 1}
                onChange={(e) => handleColorChange("contrast", parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Saturation</span>
                <span className="font-mono text-slate-300">{clip.color_adjustments?.saturation || 1}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.5"
                step="0.05"
                value={clip.color_adjustments?.saturation || 1}
                onChange={(e) => handleColorChange("saturation", parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Temperature */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Temperature (Cool / Warm)</span>
                <span className="font-mono text-slate-300">{clip.color_adjustments?.temperature || 0}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={clip.color_adjustments?.temperature || 0}
                onChange={(e) => handleColorChange("temperature", parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Sharpen */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Sharpen Detail</span>
                <span className="font-mono text-slate-300">{Math.round((clip.color_adjustments?.sharpen || 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={clip.color_adjustments?.sharpen || 0}
                onChange={(e) => handleColorChange("sharpen", parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>
        )}

        {/* CHROMA KEY TAB */}
        {activeTab === "chroma" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Chroma Key (Green Screen)</span>
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Remove solid color backdrop</p>
              </div>
              <input
                type="checkbox"
                checked={clip.chroma_key?.enabled || false}
                onChange={(e) => handleChromaChange({ enabled: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>

            {clip.chroma_key?.enabled && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Key Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={clip.chroma_key.target_color}
                      onChange={(e) => handleChromaChange({ target_color: e.target.value })}
                      className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-xs text-white">{clip.chroma_key.target_color}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Similarity Threshold</span>
                    <span className="font-mono text-slate-300">{Math.round(clip.chroma_key.similarity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.02"
                    value={clip.chroma_key.similarity}
                    onChange={(e) => handleChromaChange({ similarity: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Edge Smoothness</span>
                    <span className="font-mono text-slate-300">{Math.round(clip.chroma_key.smoothness * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.5"
                    step="0.01"
                    value={clip.chroma_key.smoothness}
                    onChange={(e) => handleChromaChange({ smoothness: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* AUDIO TAB */}
        {activeTab === "audio" && (
          <div className="space-y-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Volume & Fades</span>
            </span>

            {/* Volume */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Audio Gain</span>
                <span className="font-mono text-amber-300 font-bold">{Math.round(clip.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="2.5"
                step="0.05"
                value={clip.volume}
                onChange={(e) => onUpdateClip(clip.id, { volume: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Fade In */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Fade In</span>
                <span className="font-mono text-slate-300">{clip.audio_settings?.fade_in || 0}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.2"
                value={clip.audio_settings?.fade_in || 0}
                onChange={(e) => handleAudioChange("fade_in", parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Fade Out */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>Fade Out</span>
                <span className="font-mono text-slate-300">{clip.audio_settings?.fade_out || 0}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.2"
                value={clip.audio_settings?.fade_out || 0}
                onChange={(e) => handleAudioChange("fade_out", parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
