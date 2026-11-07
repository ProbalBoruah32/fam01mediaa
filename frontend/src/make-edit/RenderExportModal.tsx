"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  Video,
  Film,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Play,
  FileCode,
  Layers,
  Settings2,
  RefreshCw,
} from "lucide-react";
import { RenderJob } from "./types";
import { startRender, getRenderStatus, getOpenCutFormat } from "./api";

interface RenderExportModalProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const RenderExportModal: React.FC<RenderExportModalProps> = ({
  projectId,
  projectName,
  isOpen,
  onClose,
}) => {
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [preset, setPreset] = useState<"high" | "standard" | "draft">("standard");
  const [includeText, setIncludeText] = useState(true);
  const [includeAudio, setIncludeAudio] = useState(true);

  const [rendering, setRendering] = useState(false);
  const [job, setJob] = useState<RenderJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll render job status
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;

    const interval = setInterval(async () => {
      try {
        const updated = await getRenderStatus(projectId, job.id);
        setJob(updated);
        if (updated.status === "completed" || updated.status === "failed") {
          setRendering(false);
          if (updated.status === "failed") {
            setError(updated.error_message || "Render failed");
          }
        }
      } catch (e: any) {
        console.error("Poll error:", e);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [job, projectId]);

  if (!isOpen) return null;

  const handleStartRender = async () => {
    setRendering(true);
    setError(null);
    try {
      const newJob = await startRender(projectId, {
        aspect_ratio: aspectRatio,
        preset: preset,
        include_text_overlays: includeText,
        include_audio: includeAudio,
      });
      setJob(newJob);
    } catch (e: any) {
      setError(e.message || "Failed to start render");
      setRendering(false);
    }
  };

  const handleDownloadOpenCut = async () => {
    try {
      const data = await getOpenCutFormat(projectId);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName.toLowerCase().replace(/\s+/g, "_")}_opencut.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Failed to export OpenCut format: " + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-editor-panel border border-editor-border rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-editor-border flex items-center justify-between bg-editor-card/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Render & Export Video
              </h2>
              <p className="text-xs text-editor-muted">
                Synthesize your replaced video timeline using CPU FFmpeg rendering.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-editor-hover transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center space-x-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* If render completed, show preview */}
          {job?.status === "completed" && (job.output_filepath || (job as any).output_video_path) && (
            <div className="bg-editor-card border border-emerald-500/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Render Completed Successfully!</span>
              </div>

              <div className="aspect-video bg-black rounded-lg overflow-hidden border border-editor-border flex items-center justify-center">
                <video
                  src={`http://127.0.0.1:8000/api/make-edit/media?path=${encodeURIComponent(
                    job.output_filepath || (job as any).output_video_path
                  )}`}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <a
                  href={`http://127.0.0.1:8000/api/make-edit/media?path=${encodeURIComponent(
                    job.output_filepath || (job as any).output_video_path
                  )}`}
                  download={`${projectName.toLowerCase().replace(/\s+/g, "_")}_rendered.mp4`}
                  className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 rounded-lg transition shadow-md shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download MP4 Video</span>
                </a>

                {((job as any).output_otio_path || job.output_filepath) && (
                  <a
                    href={`http://127.0.0.1:8000/api/make-edit/projects/${projectId}/export-otio`}
                    download={`${projectName.toLowerCase().replace(/\s+/g, "_")}.otio`}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-editor-hover hover:bg-editor-panel border border-editor-border text-slate-300 hover:text-white text-xs rounded-lg transition"
                    title="Export OpenTimelineIO format for DaVinci Resolve & Premiere"
                  >
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Download .otio</span>
                  </a>
                )}

                <button
                  onClick={handleDownloadOpenCut}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-editor-hover hover:bg-editor-panel border border-editor-border text-slate-300 hover:text-white text-xs rounded-lg transition"
                  title="Export OpenCut Classic Timeline JSON format"
                >
                  <FileCode className="w-3.5 h-3.5 text-purple-400" />
                  <span>OpenCut JSON</span>
                </button>
              </div>
            </div>
          )}

          {/* Render progress */}
          {rendering && job && (
            <div className="bg-editor-card border border-purple-500/40 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-purple-300 font-semibold">
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                  <span>{job.stage || (job as any).current_step || "Rendering timeline..."}</span>
                </div>
                <span className="font-mono text-white font-bold">{job.progress}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-editor-border">
                <div
                  style={{ width: `${job.progress}%` }}
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                />
              </div>
              <p className="text-[11px] text-editor-muted">
                Processing clips, applying fit transforms, scaling, and muxing audio streams on local CPU.
              </p>
            </div>
          )}

          {/* Render Settings Form */}
          <div className="space-y-4">
            {/* Aspect Ratio */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Output Format & Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "16:9", label: "16:9 Landscape", sub: "1920x1080 (YouTube/VOD)" },
                  { id: "9:16", label: "9:16 Vertical", sub: "1080x1920 (Reels/TikTok)" },
                  { id: "1:1", label: "1:1 Square", sub: "1080x1080 (Instagram/Feed)" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAspectRatio(item.id as any)}
                    className={`p-3 rounded-xl border text-left transition ${
                      aspectRatio === item.id
                        ? "bg-purple-600/10 border-purple-500 text-white shadow-md shadow-purple-600/10"
                        : "bg-editor-card border-editor-border text-slate-400 hover:text-white hover:bg-editor-hover"
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] text-editor-muted mt-0.5">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Preset */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Quality & Encoding Speed Preset
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "high", label: "High (CRF 18)", sub: "Best visual fidelity" },
                  { id: "standard", label: "Standard (CRF 23)", sub: "Balanced speed & size" },
                  { id: "draft", label: "Draft (CRF 28)", sub: "Fastest render speed" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPreset(item.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      preset === item.id
                        ? "bg-purple-600/10 border-purple-500 text-white"
                        : "bg-editor-card border-editor-border text-slate-400 hover:text-white hover:bg-editor-hover"
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] text-editor-muted mt-0.5">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox Options */}
            <div className="bg-editor-card border border-editor-border rounded-xl p-3 space-y-2 text-xs">
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeText}
                  onChange={(e) => setIncludeText(e.target.checked)}
                  className="rounded border-editor-border accent-purple-600"
                />
                <span>Include Detected/Replaced Text & Subtitle Overlays</span>
              </label>

              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAudio}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                  className="rounded border-editor-border accent-purple-600"
                />
                <span>Include Background Music & Audio Tracks</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-editor-border bg-editor-card/40 flex items-center justify-between">
          <button
            onClick={handleDownloadOpenCut}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <FileCode className="w-3.5 h-3.5 text-purple-400" />
            <span>OpenCut JSON Only</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-editor-hover hover:bg-editor-card border border-editor-border text-slate-300 hover:text-white text-xs rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={handleStartRender}
              disabled={rendering}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg shadow-md shadow-purple-600/20 transition disabled:opacity-50"
            >
              <Video className="w-4 h-4" />
              <span>{rendering ? "Rendering..." : "Start FFmpeg Render"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
