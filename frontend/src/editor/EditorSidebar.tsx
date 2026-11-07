"use client";

import React, { useState, useEffect } from "react";
import {
  FolderOpen,
  Upload,
  Type,
  Music,
  Sparkles,
  Plus,
  Film,
  Layers,
  ArrowRight,
  Check,
  Subtitles,
  Shuffle,
  Wand2,
  Smile,
  Volume2,
  Play,
  Loader2,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import {
  UploadedMediaAsset,
  EditorProject,
  EditorClip,
  EditorTransition,
  ColorAdjustments,
} from "./types";
import { uploadEditorMedia, importReverseProject, generateAutoCaptions } from "./api";
import { listProjects } from "../lib/api";
import { Project } from "../lib/types";

interface EditorSidebarProps {
  project: EditorProject;
  onAddClipToTrack: (clip: EditorClip) => void;
  onProjectUpdated: (proj: EditorProject) => void;
}

type SidebarTab = "media" | "captions" | "transitions" | "effects" | "text" | "stickers" | "audio" | "reverse";

// Web Audio synthesizer for lossless royalty-free sound effects
async function synthesizeSfx(type: string): Promise<string> {
  const sampleRate = 44100;
  const duration =
    type === "hit" ? 1.5 : type === "whoosh" ? 0.7 : type === "ding" ? 1.2 : 0.35;
  const length = Math.floor(sampleRate * duration);

  const OfflineCtx =
    window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtx) return "";

  const ctx = new OfflineCtx(1, length, sampleRate);

  if (type === "whoosh") {
    // Filtered white noise sweep
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 3.0;
    filter.frequency.setValueAtTime(200, 0);
    filter.frequency.exponentialRampToValueAtTime(1600, duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(300, duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, 0);
    gain.gain.linearRampToValueAtTime(0.8, duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(0);
  } else if (type === "hit") {
    // Sub-bass cinematic impact
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, 0);
    osc.frequency.exponentialRampToValueAtTime(30, duration);

    gain.gain.setValueAtTime(1.0, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
  } else if (type === "ding") {
    // High crystal bell
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1200, 0);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(2400, 0);

    gain.gain.setValueAtTime(0.6, 0);
    gain.gain.exponentialRampToValueAtTime(0.0001, duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(0);
    osc2.start(0);
  } else if (type === "pop") {
    // Bubble pop
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, 0);
    osc.frequency.exponentialRampToValueAtTime(180, duration);

    gain.gain.setValueAtTime(0.8, 0);
    gain.gain.exponentialRampToValueAtTime(0.01, duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
  } else if (type === "shutter") {
    // Camera shutter click
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 800);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.connect(ctx.destination);
    noise.start(0);
  } else {
    // Default 8-bit blip
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(440, 0);
    osc.frequency.setValueAtTime(880, 0.08);

    gain.gain.setValueAtTime(0.3, 0);
    gain.gain.exponentialRampToValueAtTime(0.001, duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
  }

  const renderedBuffer = await ctx.startRendering();

  // Convert AudioBuffer to WAV Data URL
  const numChannels = 1;
  const samples = renderedBuffer.getChannelData(0);
  const dataSize = samples.length * 2;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  const blob = new Blob([view], { type: "audio/wav" });
  return URL.createObjectURL(blob);
}

// Built-in SVG overlay stickers
const STICKER_LIBRARY = [
  {
    id: "sub",
    name: "Subscribe Badge",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"><rect width="240" height="60" rx="30" fill="#dc2626"/><text x="120" y="38" font-family="Arial, sans-serif" font-weight="900" font-size="20" fill="#ffffff" text-anchor="middle">SUBSCRIBE</text></svg>`,
  },
  {
    id: "like",
    name: "Like Thumb",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#0284c7"/><path d="M35 55v15h10v-15h-10zm12 15h18c3 0 5-2 5-5l3-12c0-1-1-3-3-3h-12l2-10c0-2-2-4-4-4l-9 14v20z" fill="#ffffff"/></svg>`,
  },
  {
    id: "arrow",
    name: "Red Pointer Arrow",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><path d="M20 60h60v20l35-30-35-30v20H20z" fill="#ef4444" stroke="#ffffff" stroke-width="4"/></svg>`,
  },
  {
    id: "verified",
    name: "Verified Checkmark",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#3b82f6"/><path d="M32 50l12 12 26-26" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  },
  {
    id: "fire",
    name: "Fire Emoji",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 15c-3 10-10 16-16 26-6 11-8 20-8 30 0 18 14 31 32 31s32-13 32-31c0-18-12-32-22-44-2 10-6 16-10 20 0-12-3-22-8-32z" fill="#f97316"/><path d="M50 48c-2 6-6 10-10 16-4 7-5 12-5 18 0 11 8 19 19 19s19-8 19-19c0-11-7-19-13-26-1 6-4 10-6 12 0-8-2-14-4-20z" fill="#facc15"/></svg>`,
  },
  {
    id: "alert",
    name: "Warning Badge",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,10 95,90 5,90" fill="#eab308" stroke="#ffffff" stroke-width="3"/><rect x="46" y="38" width="8" height="26" rx="4" fill="#000000"/><circle cx="50" cy="74" r="5" fill="#000000"/></svg>`,
  },
];

// Color grading filter presets
const FILTER_PRESETS: { name: string; desc: string; adjustments: ColorAdjustments }[] = [
  {
    name: "Cinematic Teal & Orange",
    desc: "Hollywood blockbuster high contrast look",
    adjustments: {
      brightness: 0,
      contrast: 1.25,
      saturation: 1.2,
      temperature: 18,
      tint: -12,
      exposure: 0,
      sharpen: 0.25,
      vignette: 0.2,
    },
  },
  {
    name: "Vintage Film Grain",
    desc: "Warm nostalgic 90s camcorder aesthetic",
    adjustments: {
      brightness: 4,
      contrast: 1.1,
      saturation: 0.85,
      temperature: 14,
      tint: 4,
      exposure: 0.1,
      sharpen: 0.1,
      vignette: 0.35,
    },
  },
  {
    name: "Cyberpunk Neon",
    desc: "Vibrant electric magenta & blue grade",
    adjustments: {
      brightness: -2,
      contrast: 1.4,
      saturation: 1.5,
      temperature: -22,
      tint: 28,
      exposure: 0,
      sharpen: 0.4,
      vignette: 0.25,
    },
  },
  {
    name: "B&W Monochrome",
    desc: "Noir dramatic high-contrast black & white",
    adjustments: {
      brightness: 2,
      contrast: 1.35,
      saturation: 0,
      temperature: 0,
      tint: 0,
      exposure: 0,
      sharpen: 0.3,
      vignette: 0.4,
    },
  },
  {
    name: "Golden Hour Sunset",
    desc: "Warm glowing sunlight radiance",
    adjustments: {
      brightness: 3,
      contrast: 1.15,
      saturation: 1.25,
      temperature: 32,
      tint: 6,
      exposure: 0.15,
      sharpen: 0.15,
      vignette: 0.15,
    },
  },
  {
    name: "Cool Arctic Blue",
    desc: "Chilly crisp Scandinavian thriller grade",
    adjustments: {
      brightness: -1,
      contrast: 1.15,
      saturation: 0.9,
      temperature: -36,
      tint: -8,
      exposure: 0,
      sharpen: 0.25,
      vignette: 0.1,
    },
  },
];

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  project,
  onAddClipToTrack,
  onProjectUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>("media");
  const [assets, setAssets] = useState<UploadedMediaAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [reverseProjects, setReverseProjects] = useState<Project[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [captionsSuccess, setCaptionsSuccess] = useState(false);
  const [sfxPreviewing, setSfxPreviewing] = useState<string | null>(null);

  // Load reverse AI projects for one-click import
  useEffect(() => {
    listProjects()
      .then((projs) => setReverseProjects(projs))
      .catch((e) => console.error(e));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const uploaded = await uploadEditorMedia(file, project.id);
      setAssets((prev) => [uploaded, ...prev]);
    } catch (err) {
      alert("Failed to upload media asset");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleAddMediaClip = (asset: UploadedMediaAsset) => {
    const targetTrackType = asset.media_type === "audio" ? "audio" : "video";
    const track = project.tracks.find((t) => t.type === targetTrackType) || project.tracks[0];
    const lastClip = track.clips[track.clips.length - 1];
    const startTime = lastClip ? lastClip.start_time + lastClip.duration : 0.0;

    const newClip: EditorClip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      track_id: track.id,
      name: asset.name,
      media_type: asset.media_type,
      file_path: asset.file_path,
      media_url: asset.media_url,
      start_time: startTime,
      duration: asset.duration || 5.0,
      trim_in: 0.0,
      speed: 1.0,
      volume: 1.0,
      is_muted: false,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
    };

    onAddClipToTrack(newClip);
  };

  const handleAddTextTemplate = (templateName: string, text: string, color: string, size: number) => {
    const v2Track =
      project.tracks.find((t) => t.type === "overlay" || t.type === "text") || project.tracks[0];
    const lastClip = v2Track.clips[v2Track.clips.length - 1];
    const startTime = lastClip ? lastClip.start_time + lastClip.duration : 0.0;

    const textClip: EditorClip = {
      id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      track_id: v2Track.id,
      name: templateName,
      media_type: "text",
      start_time: startTime,
      duration: 3.5,
      trim_in: 0.0,
      speed: 1.0,
      volume: 1.0,
      is_muted: false,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
      text_properties: {
        text,
        font_family: "Arial",
        font_size: size,
        font_color: color,
        alignment: "center",
      },
    };

    onAddClipToTrack(textClip);
  };

  const handleAddSticker = (name: string, svg: string) => {
    const overlayTrack =
      project.tracks.find((t) => t.type === "overlay" || t.type === "video") || project.tracks[0];
    const lastClip = overlayTrack.clips[overlayTrack.clips.length - 1];
    const startTime = lastClip ? lastClip.start_time + lastClip.duration : 0.0;

    const encodedSvg = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    const stickerClip: EditorClip = {
      id: `sticker_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      track_id: overlayTrack.id,
      name,
      media_type: "image",
      media_url: encodedSvg,
      start_time: startTime,
      duration: 3.0,
      trim_in: 0.0,
      speed: 1.0,
      volume: 1.0,
      is_muted: false,
      transform: { x: 0, y: 0, scale: 0.6, rotation: 0, opacity: 1 },
    };

    onAddClipToTrack(stickerClip);
  };

  const handleAddSfx = async (type: string, label: string) => {
    const audioTrack = project.tracks.find((t) => t.type === "audio") || project.tracks[0];
    const lastClip = audioTrack.clips[audioTrack.clips.length - 1];
    const startTime = lastClip ? lastClip.start_time + lastClip.duration : 0.0;

    const soundUrl = await synthesizeSfx(type);

    const sfxClip: EditorClip = {
      id: `sfx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      track_id: audioTrack.id,
      name: `SFX: ${label}`,
      media_type: "audio",
      media_url: soundUrl,
      start_time: startTime,
      duration: type === "hit" ? 1.5 : type === "whoosh" ? 0.7 : type === "ding" ? 1.2 : 0.35,
      trim_in: 0.0,
      speed: 1.0,
      volume: 1.0,
      is_muted: false,
      transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
    };

    onAddClipToTrack(sfxClip);
  };

  const handlePreviewSfx = async (type: string) => {
    setSfxPreviewing(type);
    try {
      const url = await synthesizeSfx(type);
      const audio = new Audio(url);
      audio.play();
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setSfxPreviewing(null), 800);
    }
  };

  const handleAutoCaptions = async () => {
    try {
      setIsTranscribing(true);
      setCaptionsSuccess(false);
      const updated = await generateAutoCaptions(project.id);
      onProjectUpdated(updated);
      setCaptionsSuccess(true);
      setTimeout(() => setCaptionsSuccess(false), 4000);
    } catch (err) {
      alert("Auto-captions transcription encountered an error. Please verify audio track exists.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleImportReverseAI = async (revId: string) => {
    try {
      setIsImporting(true);
      const updated = await importReverseProject(project.id, revId);
      onProjectUpdated(updated);
    } catch (err) {
      alert("Failed to import Reverse AI project");
    } finally {
      setIsImporting(false);
    }
  };

  const handleApplyFilterToSelected = (adj: ColorAdjustments) => {
    // Apply filter to first clip of primary video track or notify
    const vTrack = project.tracks.find((t) => t.type === "video");
    if (!vTrack || vTrack.clips.length === 0) {
      alert("Please add a video clip to the timeline first.");
      return;
    }
    const updatedTracks = project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => (c.media_type === "video" ? { ...c, color_adjustments: adj } : c)),
    }));
    onProjectUpdated({ ...project, tracks: updatedTracks });
  };

  return (
    <div className="w-80 bg-editor-card border-r border-editor-border flex flex-col select-none">
      {/* 8-Tab Navigation Grid */}
      <div className="grid grid-cols-4 border-b border-editor-border bg-editor-panel/50 p-1 gap-1">
        {[
          { id: "media", label: "Media", icon: FolderOpen },
          { id: "captions", label: "Captions", icon: Subtitles },
          { id: "transitions", label: "Transitions", icon: Shuffle },
          { id: "effects", label: "Effects", icon: Wand2 },
          { id: "text", label: "Text", icon: Type },
          { id: "stickers", label: "Stickers", icon: Smile },
          { id: "audio", label: "SFX Audio", icon: Music },
          { id: "reverse", label: "Reverse AI", icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SidebarTab)}
              className={`flex flex-col items-center py-2 rounded text-[10px] font-semibold transition ${
                isActive ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* MEDIA TAB */}
        {activeTab === "media" && (
          <div className="space-y-4">
            <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-slate-900/40 hover:bg-cyan-950/20 group">
              <Upload className="w-6 h-6 text-slate-500 group-hover:text-cyan-400 mb-1.5 transition" />
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                {isUploading ? "Uploading Asset..." : "Upload Media File"}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">MP4, MOV, MP3, WAV, PNG, JPG</span>
              <input
                type="file"
                accept="video/*,audio/*,image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Project Assets</span>
              {assets.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-6">No assets uploaded yet</p>
              ) : (
                assets.map((ast) => (
                  <div
                    key={ast.id}
                    className="p-2.5 rounded-lg bg-editor-panel border border-editor-border hover:border-slate-700 flex items-center justify-between group"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      {ast.media_type === "video" && <Film className="w-4 h-4 text-cyan-400 shrink-0" />}
                      {ast.media_type === "audio" && <Music className="w-4 h-4 text-amber-400 shrink-0" />}
                      {ast.media_type === "image" && <Layers className="w-4 h-4 text-emerald-400 shrink-0" />}
                      <div className="truncate">
                        <p className="text-xs font-medium text-slate-200 truncate">{ast.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {ast.duration ? `${ast.duration.toFixed(1)}s` : "Static"} • {ast.media_type}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddMediaClip(ast)}
                      className="p-1.5 rounded bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white text-xs font-medium transition shrink-0 ml-2"
                      title="Add to Timeline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* AUTO-CAPTIONS TAB */}
        {activeTab === "captions" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Subtitles className="w-4 h-4 text-cyan-400" />
                <span>1-Click Auto Captions</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Transcribe timeline speech into perfectly timed subtitle clips using local CPU faster-whisper.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-editor-panel border border-editor-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Speech Engine:</span>
                <span className="font-mono text-cyan-400 font-bold">faster-whisper (CPU)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Target Track:</span>
                <span className="font-mono text-purple-300 font-bold">Subtitles / Overlay</span>
              </div>
            </div>

            {captionsSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Auto-captions generated and added to timeline!</span>
              </div>
            )}

            <button
              onClick={handleAutoCaptions}
              disabled={isTranscribing}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transcribing with local faster-whisper...</span>
                </>
              ) : (
                <>
                  <Subtitles className="w-4 h-4" />
                  <span>Generate Auto-Captions</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TRANSITIONS TAB */}
        {activeTab === "transitions" && (
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Video Transitions</span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "cross_dissolve", name: "Cross Dissolve", desc: "Smooth blend" },
                { id: "fade_black", name: "Fade to Black", desc: "Cinematic fade" },
                { id: "fade_white", name: "Fade to White", desc: "Flash transition" },
                { id: "wipe_left", name: "Wipe Left", desc: "Horizontal wipe" },
                { id: "wipe_right", name: "Wipe Right", desc: "Horizontal wipe" },
                { id: "slide_left", name: "Slide Left", desc: "Dynamic push" },
                { id: "glitch", name: "Glitch Shift", desc: "Digital distortion" },
                { id: "zoom_in", name: "Zoom In", desc: "Impact zoom" },
              ].map((tr) => (
                <div
                  key={tr.id}
                  className="p-3 rounded-lg bg-editor-panel border border-editor-border hover:border-cyan-500/50 flex flex-col justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-200">{tr.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{tr.desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      const vTrack = project.tracks.find((t) => t.type === "video");
                      if (!vTrack || vTrack.clips.length < 2) {
                        alert("Need at least 2 adjacent clips on video track to create a transition.");
                        return;
                      }
                      const c1 = vTrack.clips[0];
                      const c2 = vTrack.clips[1];
                      const newTrans: EditorTransition = {
                        id: `trans_${Date.now()}`,
                        from_clip_id: c1.id,
                        to_clip_id: c2.id,
                        type: tr.id as any,
                        duration: 0.5,
                      };
                      onProjectUpdated({
                        ...project,
                        transitions: [...(project.transitions || []), newTrans],
                      });
                      alert(`Transition '${tr.name}' applied between clips!`);
                    }}
                    className="mt-2.5 py-1 px-2 rounded bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white text-[10px] font-semibold transition text-center"
                  >
                    + Apply Transition
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EFFECTS & FILTERS TAB */}
        {activeTab === "effects" && (
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Color & Visual Filter Presets</span>
            <div className="space-y-2">
              {FILTER_PRESETS.map((fp) => (
                <div
                  key={fp.name}
                  className="p-3 rounded-lg bg-editor-panel border border-editor-border hover:border-cyan-500/50 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-cyan-300">{fp.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{fp.desc}</p>
                  </div>
                  <button
                    onClick={() => handleApplyFilterToSelected(fp.adjustments)}
                    className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium transition shrink-0 ml-2"
                  >
                    Apply Grade
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEXT TAB */}
        {activeTab === "text" && (
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Typography Presets</span>
            <div className="space-y-2">
              <button
                onClick={() => handleAddTextTemplate("Headline Title", "BIG HEADLINE", "#ffffff", 54)}
                className="w-full p-3 rounded-lg bg-editor-panel border border-editor-border hover:border-cyan-500/50 text-left group transition"
              >
                <p className="text-sm font-black text-white group-hover:text-cyan-400">BIG HEADLINE</p>
                <p className="text-[10px] text-slate-500 mt-1">Bold central display text</p>
              </button>

              <button
                onClick={() => handleAddTextTemplate("Neon Glow", "NEON VIBES", "#00f2fe", 48)}
                className="w-full p-3 rounded-lg bg-editor-panel border border-editor-border hover:border-cyan-500/50 text-left group transition"
              >
                <p className="text-sm font-bold text-cyan-400">NEON VIBES</p>
                <p className="text-[10px] text-slate-500 mt-1">Electric cyan glow typography</p>
              </button>

              <button
                onClick={() => handleAddTextTemplate("Lower Third", "John Doe • Creative Director", "#facc15", 36)}
                className="w-full p-3 rounded-lg bg-editor-panel border border-editor-border hover:border-cyan-500/50 text-left group transition"
              >
                <p className="text-xs font-medium text-amber-300">John Doe • Creative Director</p>
                <p className="text-[10px] text-slate-500 mt-1">Interview lower-third graphic</p>
              </button>

              <button
                onClick={() => handleAddTextTemplate("Minimal Caption", "Quick subtitle caption", "#e2e8f0", 32)}
                className="w-full p-3 rounded-lg bg-editor-panel border border-editor-border hover:border-cyan-500/50 text-left group transition"
              >
                <p className="text-xs text-slate-300">Quick subtitle caption</p>
                <p className="text-[10px] text-slate-500 mt-1">Clean readable subtitle font</p>
              </button>
            </div>
          </div>
        )}

        {/* STICKERS TAB */}
        {activeTab === "stickers" && (
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overlays & Badges</span>
            <div className="grid grid-cols-2 gap-2">
              {STICKER_LIBRARY.map((stk) => (
                <div
                  key={stk.id}
                  className="p-3 rounded-lg bg-editor-panel border border-editor-border flex flex-col items-center justify-between space-y-2 hover:border-cyan-500/50 transition"
                >
                  <div
                    className="w-16 h-12 flex items-center justify-center overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: stk.svg }}
                  />
                  <span className="text-[11px] font-medium text-slate-300 text-center">{stk.name}</span>
                  <button
                    onClick={() => handleAddSticker(stk.name, stk.svg)}
                    className="w-full py-1 rounded bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white text-[10px] font-semibold transition"
                  >
                    + Add Sticker
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SFX AUDIO TAB */}
        {activeTab === "audio" && (
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sound Effects Library (SFX)</span>
            <div className="space-y-2">
              {[
                { id: "whoosh", name: "Cinematic Whoosh", desc: "Fast motion wind sweep" },
                { id: "hit", name: "Cinematic Bass Hit", desc: "Sub-woofer impact drop" },
                { id: "shutter", name: "Camera Shutter", desc: "DSLR photo snap" },
                { id: "pop", name: "Bubble Pop", desc: "Playful bubble burst" },
                { id: "ding", name: "Notification Bell", desc: "Crystal chime ding" },
                { id: "blip", name: "Retro 8-bit Beep", desc: "Arcade synth blip" },
              ].map((sfx) => (
                <div
                  key={sfx.id}
                  className="p-2.5 rounded-lg bg-editor-panel border border-editor-border flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{sfx.name}</p>
                    <p className="text-[10px] text-slate-500">{sfx.desc}</p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handlePreviewSfx(sfx.id)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Preview Sound"
                    >
                      <Play className={`w-3.5 h-3.5 ${sfxPreviewing === sfx.id ? "text-cyan-400 animate-pulse" : ""}`} />
                    </button>
                    <button
                      onClick={() => handleAddSfx(sfx.id, sfx.name)}
                      className="p-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white transition"
                      title="Add to Audio Track"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REVERSE AI IMPORT TAB */}
        {activeTab === "reverse" && (
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Import Reverse AI Shots</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Transfer scene boundary cuts, audio, and detected OCR typography directly into multitrack editing tracks.
              </p>
            </div>

            <div className="space-y-2 mt-3">
              {reverseProjects.map((rp) => (
                <div
                  key={rp.id}
                  className="p-3 rounded-lg bg-editor-panel border border-editor-border hover:border-cyan-500/50 flex flex-col space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 truncate">{rp.name}</span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                      {rp.timeline?.total_clips || 0} shots
                    </span>
                  </div>
                  <button
                    onClick={() => handleImportReverseAI(rp.id)}
                    disabled={isImporting}
                    className="w-full py-1.5 px-3 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm transition disabled:opacity-50"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>{isImporting ? "Importing Cuts..." : "Import into Timeline"}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
