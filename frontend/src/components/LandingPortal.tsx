"use client";

import React from "react";
import {
  Film,
  Sparkles,
  Layers,
  FileCode,
  Cpu,
  ArrowRight,
  HardDrive,
  CheckCircle2,
  Sliders,
  Scissors,
  Music,
  Type,
} from "lucide-react";
import { HardwareInfo } from "../lib/types";

interface LandingPortalProps {
  onSelectReverseEngine: () => void;
  onSelectEditor: () => void;
  onSelectMakeEdit: () => void;
  onSelectDashboard?: () => void;
  hardware: HardwareInfo | null;
}

export const LandingPortal: React.FC<LandingPortalProps> = ({
  onSelectReverseEngine,
  onSelectEditor,
  onSelectMakeEdit,
  onSelectDashboard,
  hardware,
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#07090e] text-white select-none relative overflow-y-auto">
      {/* Background Decorative Gradients & Mesh */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Navigation Bar */}
      <nav className="h-16 border-b border-white/5 px-8 flex items-center justify-between z-10 bg-black/30 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold tracking-wider text-base bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
              FAMONEMEDIA
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">UNIFIED CREATIVE PLATFORM</p>
          </div>
        </div>

        {/* Dashboard & Hardware Status */}
        <div className="flex items-center space-x-3">
          {onSelectDashboard && (
            <button
              onClick={onSelectDashboard}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition"
            >
              Open Dashboard
            </button>
          )}

          {hardware && (
            <div className="flex items-center space-x-4 text-xs font-mono text-slate-400 bg-slate-900/60 px-3.5 py-1.5 rounded-full border border-slate-800">
              <div className="flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>{hardware.cpu_count_logical} Logical CPUs</span>
              </div>
              <span className="text-slate-600">•</span>
              <div className="flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>{hardware.ram_available_gb} GB RAM Free</span>
              </div>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 font-bold">100% Local CPU</span>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Header */}
      <div className="max-w-4xl mx-auto px-6 pt-12 pb-8 text-center z-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 text-xs font-semibold mb-5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Next-Generation Local Video Creation</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          How would you like to create today?
        </h2>
        <p className="text-sm md:text-base text-slate-400 mt-3 max-w-2xl mx-auto leading-relaxed">
          Choose your creation workflow. Reverse-engineer reference videos with AI deconstruction or build custom multitrack edits with browser timeline editing and Shotcut Desktop export.
        </p>
      </div>

      {/* Primary Choices Grid (2 Main Buttons / Option Cards) */}
      <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-8 z-10 w-full mb-12">
        {/* OPTION 1: REVERSE ENGINE & MAKE YOUR EDIT */}
        <div className="relative group rounded-3xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 p-8 flex flex-col justify-between shadow-2xl hover:shadow-cyan-500/10">
          <div className="space-y-6">
            {/* Header / Badges */}
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center text-cyan-400 shadow-lg group-hover:scale-105 transition-transform">
                <Sparkles className="w-7 h-7" />
              </div>
              <span className="px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 text-[11px] font-mono font-bold">
                AI Reverse & Recreate
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h3 className="text-2xl font-black text-white group-hover:text-cyan-300 transition-colors">
                Reverse Engine
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Reverse Studio &bull; Make Your Edit
              </p>
              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                Upload any reference MP4/MOV. Reverse AI deconstructs shot boundaries, camera motion, on-screen OCR text, speech, and beat rhythm. Then use Make Your Edit to replace detected slots with your own media and render an updated version.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>TransNetV2 & PySceneDetect shot detection</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>PP-OCRv6 on-screen text & typography recognition</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Whisper.cpp speech transcription & Librosa beat analysis</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>7-category component manifest & slot replacement</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-8 space-y-2.5">
            <button
              onClick={onSelectReverseEngine}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 flex items-center justify-center space-x-2 transition group-hover:shadow-cyan-500/40"
            >
              <span>Launch Reverse Engine</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onSelectMakeEdit}
              className="w-full py-2.5 px-4 rounded-xl bg-editor-panel hover:bg-slate-800 border border-editor-border hover:border-purple-500/50 text-purple-300 hover:text-white text-xs font-semibold flex items-center justify-center space-x-2 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Go directly to Make Your Edit</span>
            </button>
          </div>
        </div>

        {/* OPTION 2: CAPCUT + SHOTCUT COMBINED VIDEO EDITOR */}
        <div className="relative group rounded-3xl bg-gradient-to-b from-slate-900/80 to-slate-950/80 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 p-8 flex flex-col justify-between shadow-2xl hover:shadow-blue-500/10">
          <div className="space-y-6">
            {/* Header / Badges */}
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-2xl bg-blue-950/60 border border-blue-800/50 flex items-center justify-center text-blue-400 shadow-lg group-hover:scale-105 transition-transform">
                <Layers className="w-7 h-7" />
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-950/80 border border-blue-700/60 text-blue-300 text-[11px] font-mono font-bold">
                Browser + Desktop Interchange
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h3 className="text-2xl font-black text-white group-hover:text-blue-300 transition-colors">
                CapCut + Shotcut Video Editor
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Unified Creative Multitrack Editing Tool
              </p>
              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                Full-featured creative video editor combining CapCut-style responsive browser multitrack editing with Shotcut desktop engine project export. Trim, split, arrange media, adjust speed and typography, then render locally or export to Shotcut.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <Scissors className="w-4 h-4 text-blue-400 shrink-0" />
                <span>CapCut-style multitrack timeline (V1, V2, A1, trim & split)</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <Sliders className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Real-time transforms (scale, opacity, speed 0.5x-2x, audio volume)</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Shotcut Desktop MLT XML export & portable media .zip bundle</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <Film className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Direct CPU FFmpeg rendering to production MP4 (16:9, 9:16, 1:1)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-8 space-y-2.5">
            <button
              onClick={onSelectEditor}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition group-hover:shadow-blue-500/40"
            >
              <span>Launch CapCut + Shotcut Editor</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="py-2.5 px-4 rounded-xl bg-editor-panel/50 border border-editor-border text-center text-slate-400 text-xs font-mono">
              Includes 1-Click Reverse AI Clips Import
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <footer className="mt-auto border-t border-white/5 py-4 px-8 text-center text-xs text-slate-500 z-10">
        FAMONEMEDIA &bull; Local Windows CPU Video Reverse-Engineering & Creative Platform &bull; Zero Paid Cloud APIs
      </footer>
    </div>
  );
};
