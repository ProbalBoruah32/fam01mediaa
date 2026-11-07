"use client";

import React from "react";
import {
  Film,
  Download,
  Settings as SettingsIcon,
  Plus,
  Cpu,
  HardDrive,
  Layers,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { Project, HardwareInfo } from "../lib/types";

interface HeaderProps {
  currentProject: Project | null;
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  hardware: HardwareInfo | null;
  workspaceMode?: "dashboard" | "landing" | "reverse" | "make-edit" | "editor";
  onWorkspaceModeChange?: (mode: "dashboard" | "landing" | "reverse" | "make-edit" | "editor") => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  projects,
  onSelectProject,
  onNewProject,
  onOpenExport,
  onOpenSettings,
  hardware,
  workspaceMode,
  onWorkspaceModeChange,
}) => {
  return (
    <header className="h-14 bg-editor-card border-b border-editor-border px-4 flex items-center justify-between select-none z-20">
      {/* Brand & Project Selector */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => onWorkspaceModeChange?.("dashboard")}
          className="flex items-center space-x-2 text-left group"
          title="Return to Dashboard"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Film className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent group-hover:text-cyan-300">
                FAMONEMEDIA
              </span>
            </div>
          </div>
        </button>

        {/* Workspace Switcher */}
        {onWorkspaceModeChange && (
          <div className="flex items-center bg-editor-panel p-0.5 rounded-lg border border-editor-border">
            <button
              onClick={() => onWorkspaceModeChange("dashboard")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                workspaceMode === "dashboard"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => onWorkspaceModeChange("reverse")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                workspaceMode === "reverse"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Reverse Studio</span>
            </button>
            <button
              onClick={() => onWorkspaceModeChange("make-edit")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                workspaceMode === "make-edit"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
                  : "text-purple-300 hover:text-white"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Make Your Edit</span>
            </button>
            <button
              onClick={() => onWorkspaceModeChange("editor")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold transition ${
                workspaceMode === "editor"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm"
                  : "text-cyan-300 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Creative Editor</span>
            </button>
          </div>
        )}

        <div className="h-4 w-[1px] bg-editor-border" />

        {/* Project Dropdown */}
        <div className="flex items-center space-x-2">
          <div className="relative group">
            <select
              value={currentProject?.id || ""}
              onChange={(e) => onSelectProject(e.target.value)}
              className="appearance-none bg-editor-panel border border-editor-border hover:border-editor-muted/50 text-xs text-white rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.timeline ? `(${p.timeline.total_clips} shots)` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-editor-muted absolute right-2.5 top-2 pointer-events-none" />
          </div>

          <button
            onClick={onNewProject}
            className="flex items-center space-x-1 text-xs bg-editor-panel hover:bg-editor-hover border border-editor-border text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md transition"
            title="Create new reverse engineering project"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Middle Notice */}
      <div className="hidden lg:flex items-center space-x-3 text-xs text-editor-muted">
        <span className="flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Local CPU Engine Active</span>
        </span>
        <span className="text-[11px] text-slate-400">
          TransNetV2 • PySceneDetect • RapidOCR • Whisper • Librosa
        </span>
      </div>

      {/* Right Controls & Hardware Specs */}
      <div className="flex items-center space-x-3">
        {hardware && (
          <div className="hidden md:flex items-center space-x-3 text-[11px] text-editor-muted bg-editor-panel/70 border border-editor-border px-2.5 py-1 rounded-md font-mono">
            <div className="flex items-center space-x-1" title="Logical CPU threads">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>{hardware.cpu_count_logical}T ({hardware.cpu_percent}%)</span>
            </div>
            <div className="h-3 w-[1px] bg-editor-border" />
            <div className="flex items-center space-x-1" title="Free physical RAM">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>{hardware.ram_available_gb}GB Free</span>
            </div>
            <div className="h-3 w-[1px] bg-editor-border" />
            <div className="flex items-center space-x-1" title="Free disk storage">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>{hardware.disk_free_gb}GB</span>
            </div>
          </div>
        )}

        {currentProject?.timeline && (
          <button
            onClick={onOpenExport}
            className="flex items-center space-x-1.5 text-xs bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium px-3 py-1.5 rounded-md shadow-md shadow-cyan-600/20 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Timeline</span>
          </button>
        )}

        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-md bg-editor-panel hover:bg-editor-hover border border-editor-border text-slate-300 hover:text-white transition"
          title="Hardware specs & local model status"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
