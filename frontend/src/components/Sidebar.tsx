"use client";

import React from "react";
import {
  Film,
  LayoutGrid,
  FileText,
  Type,
  Activity,
  UploadCloud,
  Sliders,
  Sparkles,
  ArrowRight,
} from "lucide-react";

export type ActiveTab = "editor" | "storyboard" | "transcript" | "ocr" | "system";

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onUploadClick: () => void;
  hasVideo: boolean;
  hasTimeline: boolean;
  totalClips?: number;
  totalText?: number;
  totalTranscript?: number;
  onSwitchToMakeEdit?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onUploadClick,
  hasVideo,
  hasTimeline,
  totalClips = 0,
  totalText = 0,
  totalTranscript = 0,
  onSwitchToMakeEdit,
}) => {
  const tabs = [
    {
      id: "editor" as ActiveTab,
      label: "Timeline",
      sublabel: "Multitrack",
      icon: Film,
      badge: hasTimeline ? `${totalClips}` : undefined,
    },
    {
      id: "storyboard" as ActiveTab,
      label: "Storyboard",
      sublabel: "Shot Inventory",
      icon: LayoutGrid,
      badge: hasTimeline ? `${totalClips}` : undefined,
    },
    {
      id: "transcript" as ActiveTab,
      label: "Speech",
      sublabel: "Whisper VAD",
      icon: FileText,
      badge: totalTranscript > 0 ? `${totalTranscript}` : undefined,
    },
    {
      id: "ocr" as ActiveTab,
      label: "Text & Titles",
      sublabel: "PP-OCR",
      icon: Type,
      badge: totalText > 0 ? `${totalText}` : undefined,
    },
    {
      id: "system" as ActiveTab,
      label: "Engine Specs",
      sublabel: "Local Hardware",
      icon: Activity,
    },
  ];

  return (
    <aside className="w-16 md:w-56 bg-editor-card border-r border-editor-border flex flex-col justify-between select-none py-3 z-10">
      <div className="space-y-4 px-2">
        {/* Upload Button */}
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center md:justify-start space-x-2.5 bg-gradient-to-r from-cyan-600/90 to-blue-600/90 hover:from-cyan-500 hover:to-blue-500 text-white p-2.5 rounded-lg border border-cyan-400/30 shadow-md shadow-cyan-600/10 transition group"
        >
          <UploadCloud className="w-5 h-5 flex-shrink-0 text-cyan-200 group-hover:scale-110 transition" />
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold">Upload Media</div>
            <div className="text-[10px] text-cyan-200/80">MP4 / MOV / MKV</div>
          </div>
        </button>

        {/* Navigation Tabs */}
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                    : "text-editor-muted hover:text-white hover:bg-editor-panel border border-transparent"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                  <div className="hidden md:block">
                    <div className="text-xs font-medium leading-none">{tab.label}</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{tab.sublabel}</div>
                  </div>
                </div>

                {tab.badge && (
                  <span className="hidden md:inline-block text-[10px] px-1.5 py-0.2 rounded font-mono bg-editor-panel text-slate-300 border border-editor-border">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Make Your Edit Module Switcher Item */}
      {onSwitchToMakeEdit && (
        <div className="px-2 mb-3">
          <button
            onClick={onSwitchToMakeEdit}
            className="w-full flex items-center justify-between p-2 rounded-lg text-left bg-purple-950/20 hover:bg-purple-900/40 border border-purple-500/30 hover:border-purple-500/60 text-purple-300 transition group shadow-md shadow-purple-950/20"
            title="Switch to Make Your Edit module"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition flex-shrink-0" />
              <div className="hidden md:block truncate">
                <div className="text-xs font-semibold text-purple-200">Make Your Edit</div>
                <div className="text-[10px] text-purple-400/80">Reconstruct & Remix</div>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 hidden md:block text-purple-400 group-hover:translate-x-0.5 transition flex-shrink-0 ml-1" />
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="px-3 hidden md:block text-[10px] text-slate-500 space-y-1 border-t border-editor-border pt-3">
        <div className="flex items-center justify-between">
          <span>Engine:</span>
          <span className="text-cyan-400 font-mono">CPU-Only</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Mode:</span>
          <span className="text-emerald-400 font-mono">100% Offline</span>
        </div>
      </div>
    </aside>
  );
};
