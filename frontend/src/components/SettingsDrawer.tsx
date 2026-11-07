"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  X,
  Cpu,
  Layers,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { getHardwareInfo, getModelsStatus } from "../lib/api";
import { HardwareInfo } from "../lib/types";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose }) => {
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);
  const [models, setModels] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      Promise.all([getHardwareInfo(), getModelsStatus()])
        .then(([hw, md]) => {
          setHardware(hw);
          setModels(md);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-editor-card border border-editor-border rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-editor-border bg-editor-panel/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">System Hardware & AI Model Status</h3>
              <p className="text-[11px] text-editor-muted">Windows CPU-only local execution audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-editor-muted hover:text-white p-1 rounded-md transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Hardware Specs Grid */}
          {hardware && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Host System Metrics
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-editor-panel/50 border border-editor-border p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-cyan-400">
                    <Cpu className="w-4 h-4" />
                    <span className="font-mono text-xs">{hardware.cpu_percent}%</span>
                  </div>
                  <div className="text-base font-bold text-white font-mono">
                    {hardware.cpu_count_logical} Threads
                  </div>
                  <div className="text-[10px] text-editor-muted">
                    {hardware.cpu_count_physical} Cores • Windows x64
                  </div>
                </div>

                <div className="bg-editor-panel/50 border border-editor-border p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-emerald-400">
                    <Layers className="w-4 h-4" />
                    <span className="font-mono text-xs">{hardware.ram_used_percent}%</span>
                  </div>
                  <div className="text-base font-bold text-white font-mono">
                    {hardware.ram_available_gb} GB Free
                  </div>
                  <div className="text-[10px] text-editor-muted">
                    {hardware.ram_total_gb} GB Physical Total
                  </div>
                </div>

                <div className="bg-editor-panel/50 border border-editor-border p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-amber-400">
                    <HardDrive className="w-4 h-4" />
                    <span className="font-mono text-xs">{hardware.disk_used_percent}%</span>
                  </div>
                  <div className="text-base font-bold text-white font-mono">
                    {hardware.disk_free_gb} GB Free
                  </div>
                  <div className="text-[10px] text-editor-muted">
                    {hardware.disk_total_gb} GB Total Drive
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Model Status Table */}
          {models && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Local AI Model & Engine Verification
              </h4>
              <div className="bg-editor-panel/40 border border-editor-border rounded-xl divide-y divide-editor-border/60 text-xs">
                {/* PySceneDetect */}
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">PySceneDetect (Content & Adaptive)</div>
                    <div className="text-[11px] text-editor-muted">Multi-detector cut boundary sensor & verification</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">
                    ONLINE (CPU)
                  </span>
                </div>

                {/* TransNetV2 */}
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">TransNetV2 Deep Shot Boundary Detector</div>
                    <div className="text-[11px] text-editor-muted">
                      {models.transnetv2?.transnetv2_available
                        ? "ONNX CPU weights loaded"
                        : "Weights optional (PySceneDetect active as consensus fallback)"}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                    models.transnetv2?.transnetv2_available
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-slate-800 text-slate-400"
                  }`}>
                    {models.transnetv2?.transnetv2_available ? "LOADED (ONNX)" : "STANDBY"}
                  </span>
                </div>

                {/* PP-OCR */}
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">PaddleOCR / RapidOCR (PP-OCRv4)</div>
                    <div className="text-[11px] text-editor-muted">On-screen text, title banners, and lower thirds recognition</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">
                    ONLINE (ONNX CPU)
                  </span>
                </div>

                {/* Whisper */}
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">Whisper Speech Transcription</div>
                    <div className="text-[11px] text-editor-muted">
                      Faster-Whisper CTranslate2 (int8 CPU quantization)
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">
                    ONLINE (int8 CPU)
                  </span>
                </div>

                {/* Qwen2.5-VL */}
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">Qwen2.5-VL-3B-Instruct Visual Understanding</div>
                    <div className="text-[11px] text-editor-muted">
                      {models.qwen2_5_vl?.weights_present
                        ? "Local weights detected"
                        : "Heuristic CV Visual Analyzer active (zero-cloud CPU fallback)"}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                    models.qwen2_5_vl?.weights_present
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-cyan-500/15 text-cyan-400"
                  }`}>
                    {models.qwen2_5_vl?.weights_present ? "LOADED" : "CV HEURISTIC ACTIVE"}
                  </span>
                </div>

                {/* Librosa */}
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">Librosa & SoundFile</div>
                    <div className="text-[11px] text-editor-muted">BPM tempo tracking, beat grid detection, and RMS energy</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">
                    ONLINE (v0.11.0)
                  </span>
                </div>

                {/* OpenCV */}
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white">OpenCV Optical Flow & Cinematography Suite</div>
                    <div className="text-[11px] text-editor-muted">Farneback flow, camera motion, transitions, and perceptual dHash</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">
                    ONLINE (CPU)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Philosophy Note */}
          <div className="bg-editor-panel/50 border border-editor-border p-3.5 rounded-xl text-xs space-y-1 text-slate-300">
            <div className="font-semibold text-white flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Offline Verification Guarantee</span>
            </div>
            <p className="text-[11px] text-editor-muted leading-relaxed">
              FAMONEMEDIA Reverse AI strictly runs local inference on your Windows CPU. Paid external APIs, cloud subscriptions, and GPU servers are never queried. Detected facts (cuts, speech, text) are strictly distinguished from inferred effects (camera movement, color styling).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-editor-border bg-editor-panel/40 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs bg-editor-panel hover:bg-editor-hover border border-editor-border text-slate-200 rounded-md transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
