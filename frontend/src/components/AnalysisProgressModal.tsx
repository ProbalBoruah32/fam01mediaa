"use client";

import React, { useEffect, useRef } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Terminal,
  Activity,
} from "lucide-react";
import { JobStatus } from "../lib/types";
import { cancelJob } from "../lib/api";

interface AnalysisProgressModalProps {
  job: JobStatus | null;
  isOpen: boolean;
  onClose: () => void;
}

const STAGES = [
  "Media Ingestion",
  "Stream Probing",
  "Shot Boundary Detection",
  "Frame Snapping",
  "Clip Inventory",
  "Visual & OCR Understanding",
  "Whisper Speech & Librosa Beats",
  "Camera Motion & Transitions",
  "Unified Timeline Assembly",
  "OpenTimelineIO & EDL Exports",
];

export const AnalysisProgressModal: React.FC<AnalysisProgressModalProps> = ({
  job,
  isOpen,
  onClose,
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [job?.logs]);

  if (!isOpen || !job) return null;

  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";
  const isCancelled = job.status === "cancelled";

  const handleCancel = async () => {
    if (confirm("Are you sure you want to cancel the reverse engineering analysis?")) {
      await cancelJob(job.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-editor-card border border-editor-border rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-editor-border bg-editor-panel/50">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${
              isCompleted ? "bg-emerald-500/20 text-emerald-400" :
              isFailed ? "bg-rose-500/20 text-rose-400" :
              "bg-cyan-500/20 text-cyan-400"
            }`}>
              {isCompleted ? <CheckCircle2 className="w-5 h-5" /> :
               isFailed ? <AlertTriangle className="w-5 h-5" /> :
               <Activity className="w-5 h-5 animate-pulse" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {isCompleted ? "Reverse Engineering Complete" :
                 isFailed ? "Analysis Failed" :
                 isCancelled ? "Analysis Cancelled" :
                 "Deconstructing Video Timeline..."}
              </h3>
              <p className="text-[11px] text-editor-muted">
                Stage {job.current_stage}/10: {job.stage_name}
              </p>
            </div>
          </div>

          <div className="text-right font-mono">
            <span className="text-xl font-bold text-cyan-400">{job.progress}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-editor-panel h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isCompleted ? "bg-emerald-500" :
              isFailed ? "bg-rose-500" :
              "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"
            }`}
            style={{ width: `${job.progress}%` }}
          />
        </div>

        {/* Body: Stage Grid & Terminal Logs */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* 10-Step Horizontal/Grid Stages */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
            {STAGES.map((name, idx) => {
              const stageNum = idx + 1;
              const isDone = job.current_stage > stageNum || isCompleted;
              const isCurrent = job.current_stage === stageNum && !isCompleted && !isFailed;
              return (
                <div
                  key={name}
                  className={`p-2 rounded-lg border transition ${
                    isDone
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : isCurrent
                      ? "bg-cyan-500/15 border-cyan-400/40 text-cyan-300 font-medium"
                      : "bg-editor-panel/40 border-editor-border text-slate-500"
                  }`}
                >
                  <div className="flex items-center space-x-1.5 mb-1">
                    <span className="font-mono text-[10px]">
                      {isDone ? "✓" : `${stageNum}.`}
                    </span>
                    {isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    )}
                  </div>
                  <div className="line-clamp-2 leading-tight">{name}</div>
                </div>
              );
            })}
          </div>

          {/* Terminal Logs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-editor-muted">
              <span className="flex items-center space-x-1 font-mono">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Execution Logs</span>
              </span>
              <span className="text-[10px] text-slate-500">{job.logs.length} entries</span>
            </div>

            <div
              ref={logContainerRef}
              className="bg-black/60 border border-editor-border rounded-lg p-3 font-mono text-[11px] text-slate-300 h-44 overflow-y-auto space-y-1"
            >
              {job.logs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  {log.includes("ERROR") ? (
                    <span className="text-rose-400">{log}</span>
                  ) : log.includes("Stage") ? (
                    <span className="text-cyan-300">{log}</span>
                  ) : (
                    <span className="text-slate-400">{log}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-editor-border bg-editor-panel/40 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Local Windows CPU Inference • Zero Cloud Dependencies
          </div>
          <div className="flex items-center space-x-2">
            {!isCompleted && !isFailed && !isCancelled && (
              <button
                onClick={handleCancel}
                className="px-3.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 rounded-md transition"
              >
                Cancel Analysis
              </button>
            )}
            {(isCompleted || isFailed || isCancelled) && (
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-md transition"
              >
                Close & View Timeline
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
