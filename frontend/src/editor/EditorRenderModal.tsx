"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Play,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  Sparkles,
  HardDrive,
} from "lucide-react";
import { EditorProject, EditorRenderJob } from "./types";
import { startEditorRender, getEditorRenderJob } from "./api";

interface EditorRenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: EditorProject;
}

export const EditorRenderModal: React.FC<EditorRenderModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [crf, setCrf] = useState(23);
  const [exportFormat, setExportFormat] = useState<"mp4" | "webm" | "mov" | "gif">("mp4");
  const [resolution, setResolution] = useState<"720p" | "1080p" | "2k" | "4k">("1080p");
  const [fps, setFps] = useState<number>(project.fps || 30);
  const [job, setJob] = useState<EditorRenderJob | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;

    const interval = setInterval(async () => {
      try {
        const updated = await getEditorRenderJob(job.job_id);
        setJob(updated);
      } catch (err) {
        console.error("Failed to poll render job:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [job]);

  if (!isOpen) return null;

  const handleStartRender = async () => {
    try {
      setLoading(true);
      const res = await startEditorRender(project.id, crf, exportFormat, resolution, fps);
      setJob(res);
    } catch (e) {
      alert("Failed to start timeline render");
    } finally {
      setLoading(false);
    }
  };

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-editor-card border border-editor-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-editor-border px-6 flex items-center justify-between bg-editor-panel/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-600/30">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Local CPU Timeline Renderer</h2>
              <p className="text-[10px] text-slate-400">FFmpeg Multitrack Encoding</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-editor-panel transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          {!job ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-editor-panel border border-editor-border space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Project Resolution:</span>
                  <span className="font-mono text-cyan-300 font-bold">{project.width}x{project.height} ({project.aspect_ratio})</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Framerate:</span>
                  <span className="font-mono text-slate-200">{project.fps} FPS</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Timeline Duration:</span>
                  <span className="font-mono text-slate-200">{project.total_duration_sec.toFixed(1)} seconds</span>
                </div>
              </div>

              {/* Export Container Format */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Export Format
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "mp4", label: "MP4", desc: "H.264 Universal" },
                    { id: "webm", label: "WebM", desc: "VP9 Web Stream" },
                    { id: "mov", label: "MOV", desc: "QuickTime Master" },
                    { id: "gif", label: "GIF", desc: "Animated Loop" },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      onClick={() => setExportFormat(fmt.id as any)}
                      className={`p-2 rounded-xl border text-center transition ${
                        exportFormat === fmt.id
                          ? "bg-cyan-600/30 border-cyan-500 text-cyan-300 font-bold"
                          : "bg-editor-panel border-editor-border text-slate-400 hover:text-white"
                      }`}
                    >
                      <p className="text-xs uppercase">{fmt.label}</p>
                      <p className="text-[9px] opacity-70 mt-0.5">{fmt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution & Framerate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Resolution
                  </label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as any)}
                    className="w-full bg-editor-panel border border-editor-border text-xs text-white rounded-lg p-2 font-mono outline-none focus:border-cyan-500"
                  >
                    <option value="720p">720p HD (1280x720)</option>
                    <option value="1080p">1080p Full HD (1920x1080)</option>
                    <option value="2k">2K QHD (2560x1440)</option>
                    <option value="4k">4K UHD (3840x2160)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Framerate
                  </label>
                  <select
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="w-full bg-editor-panel border border-editor-border text-xs text-white rounded-lg p-2 font-mono outline-none focus:border-cyan-500"
                  >
                    <option value={24}>24 FPS (Cinematic)</option>
                    <option value={25}>25 FPS (PAL Standard)</option>
                    <option value={30}>30 FPS (Standard)</option>
                    <option value={60}>60 FPS (Smooth Motion)</option>
                  </select>
                </div>
              </div>

              {/* Quality Preset */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Encoding Preset
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setCrf(18)}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      crf === 18 ? "bg-cyan-600/30 border-cyan-500 text-cyan-300" : "bg-editor-panel border-editor-border text-slate-400 hover:text-white"
                    }`}
                  >
                    <p className="font-bold text-xs">High Quality</p>
                    <p className="text-[10px] opacity-70 mt-0.5">CRF 18</p>
                  </button>

                  <button
                    onClick={() => setCrf(23)}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      crf === 23 ? "bg-cyan-600/30 border-cyan-500 text-cyan-300" : "bg-editor-panel border-editor-border text-slate-400 hover:text-white"
                    }`}
                  >
                    <p className="font-bold text-xs">Balanced</p>
                    <p className="text-[10px] opacity-70 mt-0.5">CRF 23 (Default)</p>
                  </button>

                  <button
                    onClick={() => setCrf(28)}
                    className={`p-2.5 rounded-xl border text-center transition ${
                      crf === 28 ? "bg-cyan-600/30 border-cyan-500 text-cyan-300" : "bg-editor-panel border-editor-border text-slate-400 hover:text-white"
                    }`}
                  >
                    <p className="font-bold text-xs">Fast Draft</p>
                    <p className="text-[10px] opacity-70 mt-0.5">CRF 28</p>
                  </button>
                </div>
              </div>

              <button
                onClick={handleStartRender}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50 mt-4"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                <span>Start CPU Render ({exportFormat.toUpperCase()} • {resolution})</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {job.status === "completed" && job.output_url ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Video rendered successfully on local CPU!</span>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video max-h-56 flex items-center justify-center">
                    <video
                      src={`${BASE_URL}${job.output_url}`}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <a
                      href={`${BASE_URL}${job.output_url}`}
                      download
                      className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center justify-center space-x-2 transition text-center"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Final MP4</span>
                    </a>

                    <button
                      onClick={() => setJob(null)}
                      className="py-2.5 px-4 rounded-xl bg-editor-panel border border-editor-border text-slate-300 hover:text-white text-xs font-semibold"
                    >
                      Render Another
                    </button>
                  </div>
                </div>
              ) : job.status === "failed" ? (
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-300 space-y-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span className="font-bold">Rendering Encountered an Error</span>
                  </div>
                  <p className="text-xs text-rose-300/80 font-mono">{job.message}</p>
                  <button
                    onClick={() => setJob(null)}
                    className="py-1.5 px-3 rounded bg-rose-900/40 text-white text-xs font-medium"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <div className="py-8 space-y-4 text-center">
                  <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
                  <div>
                    <p className="font-bold text-white text-sm">Rendering Video Timeline...</p>
                    <p className="text-slate-400 text-xs mt-1">{job.message}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400 font-bold">{job.progress}%</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
