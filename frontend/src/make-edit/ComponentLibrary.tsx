"use client";

import React, { useState } from "react";
import {
  Film,
  Image as ImageIcon,
  Type,
  Music,
  Scissors,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Trash2,
  Lock,
  Layers,
  Sliders,
  CheckSquare,
  Square,
} from "lucide-react";
import { ComponentItem, ComponentCategory, ComponentManifest } from "./types";

interface ComponentLibraryProps {
  manifest?: ComponentManifest;
  components?: ComponentItem[];
  selectedComponent: ComponentItem | null;
  onSelectComponent: (comp: ComponentItem) => void;
  onReplaceComponent?: (comp: ComponentItem) => void;
  onOpenReplaceModal?: (comp: ComponentItem) => void;
  onResetComponent?: (comp: any) => void;
  onRemoveComponent?: (comp: any) => void;
  categoryCounts?: Record<string, number>;
}

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({
  manifest,
  components: propComponents,
  selectedComponent,
  onSelectComponent,
  onReplaceComponent,
  onOpenReplaceModal,
  onResetComponent,
  onRemoveComponent,
  categoryCounts: propCategoryCounts,
}) => {
  const components = propComponents || manifest?.components || [];
  const categoryCounts = propCategoryCounts || manifest?.category_counts || {};
  const handleOpenReplace = onReplaceComponent || onOpenReplaceModal || (() => {});
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const categories: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }>; countKey: string }> = [
    { id: "all", label: "All", icon: Layers, countKey: "all" },
    { id: "video_clip", label: "Video", icon: Film, countKey: "video_clip" },
    { id: "image_graphic", label: "Images", icon: ImageIcon, countKey: "image_graphic" },
    { id: "text_component", label: "Text", icon: Type, countKey: "text_component" },
    { id: "audio_component", label: "Audio", icon: Music, countKey: "audio_component" },
    { id: "transition", label: "Transitions", icon: Scissors, countKey: "transition" },
    { id: "effect", label: "Effects", icon: Sparkles, countKey: "effect" },
  ];

  const totalAllCount = components.length;

  const filtered = components.filter((c) => {
    if (activeCategory !== "all" && c.category !== activeCategory) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleSelectId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((c) => c.id));
    }
  };

  return (
    <div className="w-80 md:w-96 bg-editor-card border-r border-editor-border flex flex-col justify-between overflow-hidden select-none z-10">
      {/* Top Header & Search */}
      <div className="p-3 border-b border-editor-border space-y-2 bg-editor-panel/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Component Library
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-editor-panel text-slate-300 border border-editor-border">
            {filtered.length} / {totalAllCount}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search detected elements..."
            className="w-full bg-editor-panel border border-editor-border text-xs text-white rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            const count = cat.id === "all" ? totalAllCount : (categoryCounts[cat.countKey] || 0);
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center space-x-1 px-2 py-1 rounded-md transition flex-shrink-0 ${
                  isActive
                    ? "bg-cyan-600 text-white font-medium shadow-sm"
                    : "text-editor-muted hover:text-white hover:bg-editor-panel"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
                <span className={`text-[9px] px-1 rounded-full font-mono ${isActive ? "bg-black/30" : "bg-editor-panel"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk Action Bar (when selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-cyan-950/60 border-b border-cyan-500/30 px-3 py-2 flex items-center justify-between text-xs text-cyan-200">
          <span>{selectedIds.length} components selected</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedIds([])}
              className="text-[10px] text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Component Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-editor-border/40">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-editor-muted space-y-2">
            <Sliders className="w-8 h-8 mx-auto text-slate-600" />
            <div>No components found matching current filters.</div>
          </div>
        ) : (
          filtered.map((comp) => {
            const isSelected = selectedComponent?.id === comp.id;
            const isChecked = selectedIds.includes(comp.id);
            const isReplaced = comp.status === "replaced";
            const isRemoved = comp.status === "removed";

            return (
              <div
                key={comp.id}
                onClick={() => onSelectComponent(comp)}
                className={`pt-1.5 pb-1 px-2.5 rounded-lg border cursor-pointer transition flex flex-col space-y-1.5 group ${
                  isSelected
                    ? "border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-500/30 shadow-md"
                    : isReplaced
                    ? "border-emerald-500/40 bg-emerald-950/15 hover:border-emerald-400"
                    : isRemoved
                    ? "border-rose-900/30 bg-rose-950/10 opacity-50"
                    : "border-editor-border hover:border-slate-600 bg-editor-panel/30 hover:bg-editor-panel/70"
                }`}
              >
                {/* Header line: Category Pill + ID + Status */}
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={(e) => toggleSelectId(comp.id, e)}
                      className="text-slate-400 hover:text-white"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                      )}
                    </button>

                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-editor-panel text-cyan-300 border border-editor-border">
                      {comp.category.replace("_", " ")}
                    </span>
                    <span className="font-mono text-slate-500">{comp.id}</span>
                  </div>

                  <span
                    className={`font-mono text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold ${
                      isReplaced
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isRemoved
                        ? "bg-rose-500/20 text-rose-400"
                        : comp.is_locked
                        ? "bg-slate-800 text-slate-500"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {comp.status}
                  </span>
                </div>

                {/* Center Content: Thumbnail + Title + Time */}
                <div className="flex items-start space-x-2.5">
                  {comp.thumbnail_url ? (
                    <img
                      src={comp.thumbnail_url}
                      alt=""
                      className="w-14 h-9 object-cover rounded border border-white/10 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-9 bg-editor-panel rounded border border-editor-border flex items-center justify-center text-slate-500 flex-shrink-0">
                      {comp.category === "text_component" ? (
                        <Type className="w-4 h-4 text-amber-400" />
                      ) : comp.category === "audio_component" ? (
                        <Music className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition">
                      {comp.title}
                    </div>
                    <div className="text-[10px] text-editor-muted line-clamp-1">
                      {isReplaced && comp.replacement?.original_filename ? (
                        <span className="text-emerald-400">
                          Replaced with: {comp.replacement.original_filename}
                        </span>
                      ) : (
                        comp.description
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {comp.start_time.toFixed(2)}s - {comp.end_time.toFixed(2)}s ({comp.duration.toFixed(2)}s)
                    </div>
                  </div>
                </div>

                {/* Footer Controls: Replace, Reset, Remove */}
                <div className="flex items-center justify-between pt-1 border-t border-editor-border/40 text-[10px]">
                  <span className="text-slate-500 font-mono">
                    Conf: {(comp.confidence * 100).toFixed(0)}%
                  </span>

                  <div className="flex items-center space-x-1.5">
                    {isReplaced && onResetComponent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onResetComponent(comp);
                        }}
                        className="px-2 py-0.5 rounded bg-editor-panel hover:bg-slate-700 text-slate-300 hover:text-white flex items-center space-x-1 border border-editor-border"
                        title="Reset to Original"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                        <span>Reset</span>
                      </button>
                    )}

                    {comp.is_replaceable && !comp.is_locked && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReplace(comp);
                        }}
                        className="px-2.5 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-sm transition"
                      >
                        Replace
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
