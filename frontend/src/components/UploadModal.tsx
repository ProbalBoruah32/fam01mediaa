"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileVideo, X, AlertCircle, CheckCircle, Sparkles } from "lucide-react";
import { uploadVideo, analyzeProject } from "../lib/api";

interface UploadModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onAnalysisStarted: (jobId: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  projectId,
  isOpen,
  onClose,
  onAnalysisStarted,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      const ext = dropped.name.split(".").pop()?.toLowerCase();
      if (["mp4", "mov", "mkv", "avi", "webm"].includes(ext || "")) {
        setFile(dropped);
      } else {
        setError("Unsupported format. Please select an MP4, MOV, MKV, AVI, or WEBM file.");
      }
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      // 1. Upload video
      await uploadVideo(projectId, file);

      // 2. Trigger analysis job
      const analyzeRes = await analyzeProject(projectId);
      onAnalysisStarted(analyzeRes.job_id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to upload or trigger analysis");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-editor-card border border-editor-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-editor-border bg-editor-panel/50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Upload Reference Video</h3>
              <p className="text-[11px] text-editor-muted">Ingest media for editing timeline reconstruction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-editor-muted hover:text-white p-1 rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
              dragOver
                ? "border-cyan-400 bg-cyan-500/10"
                : "border-editor-border hover:border-slate-500 bg-editor-panel/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".mp4,.mov,.mkv,.avi,.webm"
              className="hidden"
              onChange={handleSelect}
            />

            {file ? (
              <div className="flex flex-col items-center space-y-2 text-cyan-400">
                <FileVideo className="w-10 h-10" />
                <div className="text-sm font-medium text-white">{file.name}</div>
                <div className="text-xs text-editor-muted">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB • Ready to analyze
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-editor-panel flex items-center justify-center text-slate-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-sm font-medium text-white">Drag & drop reference video here</div>
                <div className="text-xs text-editor-muted">or click to browse your computer</div>
                <div className="text-[10px] text-slate-500 pt-1">
                  Supported: MP4, MOV, MKV, AVI, WEBM • Up to 4K resolution
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-editor-panel/50 border border-editor-border p-3 rounded-lg text-xs space-y-1.5 text-slate-300">
            <div className="font-medium text-slate-200 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Automated 10-Step Reverse Pipeline:</span>
            </div>
            <ul className="text-[11px] text-editor-muted space-y-0.5 list-disc list-inside">
              <li>Shot cuts detection with TransNetV2 & PySceneDetect</li>
              <li>Frame-accurate boundary snapping & representative frame extraction</li>
              <li>Camera motion classification (Pan, Tilt, Zoom, Static, Handheld)</li>
              <li>PP-OCR text detection & Whisper speech transcription</li>
              <li>Librosa musical beat alignment & OTIO/EDL timeline export</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-editor-border bg-editor-panel/40 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-3.5 py-1.5 text-xs text-editor-muted hover:text-white rounded-md transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="flex items-center space-x-1.5 text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white font-medium px-4 py-1.5 rounded-md shadow-md shadow-cyan-600/20 transition"
          >
            {uploading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing Media...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start Reverse AI</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
