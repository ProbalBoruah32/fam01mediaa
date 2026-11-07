"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Trash2,
  Type,
  Film,
  Music,
  Sparkles,
  Maximize2,
  Volume2,
  Gauge,
  Clock,
  Save,
} from "lucide-react";
import { ComponentItem, FitMode } from "./types";

interface ComponentInspectorProps {
  component: ComponentItem | null;
  onUpdateComponent?: (data: {
    component_id: string;
    asset_id?: string;
    replacement_text?: string;
    fit_mode?: FitMode;
    trim_in?: number;
    volume?: number;
    playback_speed?: number;
    font_color?: string;
  }) => void;
  onUpdateReplacement?: (comp: ComponentItem, data: any) => void;
  onResetComponent?: (compId: string) => void;
  onResetClick?: (comp: ComponentItem) => void;
  onRemoveComponent?: (compId: string) => void;
  onOpenReplaceModal?: (comp: ComponentItem) => void;
  onReplaceClick?: (comp: ComponentItem) => void;
}

export const ComponentInspector: React.FC<ComponentInspectorProps> = ({
  component,
  onUpdateComponent,
  onUpdateReplacement,
  onResetComponent,
  onResetClick,
  onRemoveComponent,
  onOpenReplaceModal,
  onReplaceClick,
}) => {
  const [fitMode, setFitMode] = useState<FitMode>("crop");
  const [trimIn, setTrimIn] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [replacementText, setReplacementText] = useState<string>("");
  const [fontColor, setFontColor] = useState<string>("#ffffff");

  useEffect(() => {
    if (component) {
      if (component.replacement) {
        setFitMode(component.replacement.fit_mode || "crop");
        setTrimIn(component.replacement.trim_in || 0);
        setVolume(component.replacement.volume ?? 1.0);
        setPlaybackSpeed(component.replacement.playback_speed || 1.0);
        setReplacementText(component.replacement.replacement_text || "");
        setFontColor(component.replacement.font_color || "#ffffff");
      } else {
        setFitMode("crop");
        setTrimIn(0);
        setVolume(1.0);
        setPlaybackSpeed(1.0);
        setReplacementText(component.intrinsic_properties?.original_text || "");
        setFontColor("#ffffff");
      }
    }
  }, [component]);

  if (!component) {
    return (
      <div className="w-80 md:w-88 bg-editor-card border-l border-editor-border p-6 flex flex-col items-center justify-center text-center text-editor-muted select-none">
        <Sliders className="w-10 h-10 text-slate-600 mb-2" />
        <div className="text-sm font-semibold text-slate-400">Component Inspector</div>
        <div className="text-xs text-slate-500 max-w-xs mt-1">
          Select any element from the library or timeline to customize content, crop, fit, text, and playback properties.
        </div>
      </div>
    );
  }

  const isReplaced = component.status === "replaced";
  const isRemoved = component.status === "removed";

  const handleApplyChanges = () => {
    const data = {
      component_id: component.id,
      asset_id: component.replacement?.asset_id,
      replacement_text: component.category === "text_component" ? replacementText : undefined,
      fit_mode: fitMode,
      trim_in: trimIn,
      volume: volume,
      playback_speed: playbackSpeed,
      font_color: fontColor,
    };
    if (onUpdateReplacement) {
      onUpdateReplacement(component, data);
    } else if (onUpdateComponent) {
      onUpdateComponent(data);
    }
  };

  const handleOpenReplace = () => {
    if (onReplaceClick) {
      onReplaceClick(component);
    } else if (onOpenReplaceModal) {
      onOpenReplaceModal(component);
    }
  };

  const handleReset = () => {
    if (onResetClick) {
      onResetClick(component);
    } else if (onResetComponent) {
      onResetComponent(component.id);
    }
  };

  return (
    <div className="w-80 md:w-88 bg-editor-card border-l border-editor-border flex flex-col justify-between overflow-y-auto select-none z-10">
      <div className="p-4 space-y-4">
        {/* Header & Status */}
        <div className="border-b border-editor-border pb-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Component Inspector
            </span>
            <span
              className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                isReplaced
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : isRemoved
                  ? "bg-rose-500/20 text-rose-400"
                  : "bg-editor-panel text-slate-400 border border-editor-border"
              }`}
            >
              {component.status}
            </span>
          </div>
          <div className="text-sm font-semibold text-white truncate">{component.title}</div>
          <div className="text-[11px] text-editor-muted">{component.description}</div>
        </div>

        {/* Diagnostics & Compatibility Warnings */}
        {component.warnings.length > 0 && (
          <div className="space-y-1.5">
            {component.warnings.map((warn, i) => (
              <div
                key={i}
                className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                  warn.severity === "error"
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                    : warn.severity === "warning"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                }`}
              >
                <div className="flex items-center space-x-1.5 font-semibold text-[11px]">
                  {warn.severity === "error" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{warn.code.replace(/_/g, " ")}</span>
                </div>
                <div className="text-[10px] leading-tight">{warn.message}</div>
                <div className="text-[10px] opacity-80 pt-0.5">
                  Action: {warn.suggested_action}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Replacement Status Box */}
        <div className="bg-editor-panel/50 border border-editor-border rounded-lg p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between font-medium text-slate-200">
            <span>Active Content:</span>
            <span className="font-mono text-cyan-400">
              {isReplaced ? "User Replacement" : "Original Detected Media"}
            </span>
          </div>

          {isReplaced && component.replacement?.original_filename && (
            <div className="text-[11px] text-emerald-400 font-mono bg-emerald-950/30 p-1.5 rounded border border-emerald-500/20 truncate">
              {component.replacement.original_filename}
            </div>
          )}

          {component.is_replaceable && !component.is_locked && (
            <button
              onClick={handleOpenReplace}
              className="w-full flex items-center justify-center space-x-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs py-1.5 rounded-md shadow transition"
            >
              <span>{isReplaced ? "Change Replacement" : "Replace This Element"}</span>
            </button>
          )}
        </div>

        {/* Text Component Typography Editor */}
        {component.category === "text_component" && (
          <div className="space-y-3 bg-editor-panel/40 border border-editor-border rounded-lg p-3">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-400">
              <Type className="w-4 h-4" />
              <span>Typography Customization</span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-300">Replacement Words</label>
              <textarea
                value={replacementText}
                onChange={(e) => setReplacementText(e.target.value)}
                placeholder="Enter customized text..."
                rows={2}
                className="w-full bg-editor-panel border border-editor-border text-xs text-white rounded-md p-2 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Font Color</span>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  className="w-7 h-7 rounded border border-editor-border bg-transparent cursor-pointer"
                />
                <span className="font-mono text-[10px] text-slate-400">{fontColor}</span>
              </div>
            </div>
          </div>
        )}

        {/* Video / Image Placement & Transform Controls */}
        {(component.category === "video_clip" || component.category === "image_graphic") && (
          <div className="space-y-3 bg-editor-panel/40 border border-editor-border rounded-lg p-3">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-cyan-400">
              <Maximize2 className="w-4 h-4" />
              <span>Placement & Crop Mode</span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-300">Canvas Fit Strategy</label>
              <select
                value={fitMode}
                onChange={(e) => setFitMode(e.target.value as FitMode)}
                className="w-full bg-editor-panel border border-editor-border text-xs text-white rounded-md p-2 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="crop">Center Crop (Fill canvas, no black bars)</option>
                <option value="fit">Fit Letterbox (Show full frame with bars)</option>
                <option value="stretch">Stretch to Dimensions</option>
                <option value="loop">Loop Media (If duration is short)</option>
              </select>
            </div>

            {/* Trim In Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>Trim In Time</span>
                <span className="font-mono text-cyan-400">{trimIn.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(10, component.duration * 2)}
                step={0.1}
                value={trimIn}
                onChange={(e) => setTrimIn(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-editor-panel rounded-lg cursor-pointer"
              />
            </div>

            {/* Playback Speed */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>Playback Speed Factor</span>
                <span className="font-mono text-cyan-400">{playbackSpeed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.25}
                max={2.0}
                step={0.25}
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-editor-panel rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Audio Volume Controls */}
        {(component.category === "audio_component" || component.category === "video_clip") && (
          <div className="space-y-2 bg-editor-panel/40 border border-editor-border rounded-lg p-3">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center space-x-1">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Audio Volume</span>
              </span>
              <span className="font-mono text-emerald-400">{(volume * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-editor-panel rounded-lg cursor-pointer"
            />
          </div>
        )}

        {/* Timeline Timing & Geometry (Read-only reference) */}
        <div className="bg-editor-panel/30 border border-editor-border rounded-lg p-2.5 text-[11px] font-mono text-slate-400 space-y-1">
          <div className="flex items-center justify-between">
            <span>Timeline In:</span>
            <span className="text-slate-200">{component.start_time.toFixed(3)}s</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Timeline Out:</span>
            <span className="text-slate-200">{component.end_time.toFixed(3)}s</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Duration:</span>
            <span className="text-slate-200">{component.duration.toFixed(3)}s</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Track:</span>
            <span className="text-cyan-400 uppercase">{component.track_id}</span>
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="p-4 border-t border-editor-border bg-editor-panel/50 space-y-2">
        <button
          onClick={handleApplyChanges}
          className="w-full flex items-center justify-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-2 rounded-md transition shadow"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {isReplaced && (
            <button
              onClick={handleReset}
              className="flex items-center justify-center space-x-1 p-1.5 rounded bg-editor-panel hover:bg-slate-700 text-slate-300 border border-editor-border"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset Original</span>
            </button>
          )}

          {onRemoveComponent && (
            <button
              onClick={() => onRemoveComponent(component.id)}
              className={`flex items-center justify-center space-x-1 p-1.5 rounded border ${
                isRemoved
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
              }`}
            >
              <Trash2 className="w-3 h-3" />
              <span>{isRemoved ? "Restore Element" : "Mute / Remove"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
