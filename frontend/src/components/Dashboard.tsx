"use client";

import React, { useState, useEffect } from "react";
import {
  Film,
  Sparkles,
  Layers,
  Upload,
  Plus,
  Trash2,
  Clock,
  HardDrive,
  Cpu,
  Search,
  FolderOpen,
  ArrowRight,
  Music,
  CheckCircle2,
  X,
  Play,
  Activity,
} from "lucide-react";
import { HardwareInfo } from "../lib/types";

interface DashboardProject {
  id: string;
  name: string;
  project_type: "editor" | "reverse" | "make_edit";
  aspect_ratio: string;
  width: number;
  height: number;
  fps: number;
  duration_sec: number;
  total_clips: number;
  thumbnail_url?: string;
  updated_at?: string;
}

interface DashboardAsset {
  id: string;
  name: string;
  filename: string;
  media_type: "video" | "image" | "audio";
  media_url: string;
  thumbnail_url?: string;
  duration_sec: number;
  width: number;
  height: number;
  file_size_bytes: number;
  waveform?: number[];
  created_at?: string;
}

interface DashboardProps {
  onOpenReverseStudio: (projectId?: string) => void;
  onOpenMakeEdit: (projectId?: string) => void;
  onOpenEditor: (projectId?: string) => void;
  hardware: HardwareInfo | null;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenReverseStudio,
  onOpenMakeEdit,
  onOpenEditor,
  hardware,
}) => {
  const [activeTab, setActiveTab] = useState<"projects" | "assets">("projects");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    total_projects: 0,
    total_assets: 0,
    storage_used_mb: 0,
  });
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [assets, setAssets] = useState<DashboardAsset[]>([]);

  // New Project Modal
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("My Creative Project");
  const [newProjectAspect, setNewProjectAspect] = useState("16:9");
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/editor/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setProjects(data.recent_projects || []);
        setAssets(data.recent_assets || []);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateProject = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/editor/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName, aspect_ratio: newProjectAspect }),
      });
      if (res.ok) {
        const created = await res.json();
        setIsNewProjectModalOpen(false);
        onOpenEditor(created.id);
      }
    } catch (err) {
      alert("Failed to create project");
    }
  };

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploadingAsset(true);
      const res = await fetch(`${BASE_URL}/api/editor/assets/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        await fetchDashboardData();
      }
    } catch (err) {
      alert("Failed to upload asset");
    } finally {
      setIsUploadingAsset(false);
      e.target.value = "";
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Delete this asset from your library?")) return;
    try {
      await fetch(`${BASE_URL}/api/editor/assets/${assetId}`, { method: "DELETE" });
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (err) {
      alert("Failed to delete asset");
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesType = typeFilter === "all" || p.project_type === typeFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getProjectTypeBadge = (type: string) => {
    switch (type) {
      case "editor":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-400 border border-blue-800/40">Creative Editor</span>;
      case "reverse":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">Reverse AI</span>;
      case "make_edit":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/80 text-purple-400 border border-purple-800/40">Make Your Edit</span>;
      default:
        return null;
    }
  };

  const handleOpenProject = (p: DashboardProject) => {
    if (p.project_type === "editor") onOpenEditor(p.id);
    else if (p.project_type === "make_edit") onOpenMakeEdit(p.id);
    else onOpenReverseStudio(p.id);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#07090e] text-white select-none overflow-y-auto">
      {/* Top Banner Navigation */}
      <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between z-10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold tracking-wider text-base bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
              FAMONEMEDIA
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">PLATFORM DASHBOARD</p>
          </div>
        </div>

        {/* Hardware Status */}
        {hardware && (
          <div className="flex items-center space-x-4 text-xs font-mono text-slate-400 bg-slate-900/60 px-3.5 py-1.5 rounded-full border border-slate-800">
            <div className="flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>{hardware.cpu_count_logical} Logical Cores</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>{hardware.ram_available_gb} GB RAM Free</span>
            </div>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400 font-bold">Local CPU Engine</span>
          </div>
        )}
      </header>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-8 py-8 space-y-8">
        {/* Quick Launch Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div
            onClick={() => onOpenEditor()}
            className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 to-slate-900/80 border border-blue-900/40 hover:border-cyan-500/60 cursor-pointer transition-all hover:scale-[1.01] group shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Layers className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">Creative Studio Editor</h3>
            <p className="text-xs text-slate-400 mt-1">CapCut-level multitrack browser editor with Shotcut MLT export.</p>
          </div>

          <div
            onClick={() => onOpenReverseStudio()}
            className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900/80 border border-cyan-900/40 hover:border-cyan-500/60 cursor-pointer transition-all hover:scale-[1.01] group shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">Reverse Studio</h3>
            <p className="text-xs text-slate-400 mt-1">Deconstruct reference videos with shot boundaries, OCR, speech & motion.</p>
          </div>

          <div
            onClick={() => onOpenMakeEdit()}
            className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 to-slate-900/80 border border-purple-900/40 hover:border-purple-500/60 cursor-pointer transition-all hover:scale-[1.01] group shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Film className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <h3 className="font-bold text-white text-base group-hover:text-purple-300 transition-colors">Make Your Edit</h3>
            <p className="text-xs text-slate-400 mt-1">Automatic 7-category component manifest & 1-click slot replacement.</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Total Projects</p>
              <p className="text-2xl font-black text-white mt-0.5">{stats.total_projects}</p>
            </div>
            <FolderOpen className="w-7 h-7 text-cyan-500/40" />
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Media Assets</p>
              <p className="text-2xl font-black text-white mt-0.5">{stats.total_assets}</p>
            </div>
            <Activity className="w-7 h-7 text-blue-500/40" />
          </div>

          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Storage Consumed</p>
              <p className="text-2xl font-black text-white mt-0.5">{stats.storage_used_mb} MB</p>
            </div>
            <HardDrive className="w-7 h-7 text-emerald-500/40" />
          </div>
        </div>

        {/* Navigation Tabs & Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("projects")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "projects" ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Recent Projects ({projects.length})
            </button>
            <button
              onClick={() => setActiveTab("assets")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "assets" ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              Asset Library ({assets.length})
            </button>
          </div>

          {activeTab === "projects" ? (
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-900/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="editor">Creative Editor</option>
                <option value="reverse">Reverse AI</option>
                <option value="make_edit">Make Your Edit</option>
              </select>

              <button
                onClick={() => setIsNewProjectModalOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-cyan-600/20 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Project</span>
              </button>
            </div>
          ) : (
            <label className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md transition">
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploadingAsset ? "Uploading..." : "Upload Media Asset"}</span>
              <input
                type="file"
                accept="video/*,audio/*,image/*"
                onChange={handleAssetUpload}
                disabled={isUploadingAsset}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Tab Content: Projects Grid */}
        {activeTab === "projects" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => handleOpenProject(p)}
                className="rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-cyan-500/50 p-3.5 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] group shadow-lg"
              >
                <div className="space-y-2.5">
                  {/* Thumbnail / Aspect Preview */}
                  <div className="aspect-video w-full rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center relative overflow-hidden group-hover:border-cyan-500/40 transition">
                    <Film className="w-8 h-8 text-slate-700 group-hover:text-cyan-400/60 transition" />
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-cyan-300">
                      {p.aspect_ratio}
                    </span>
                    <span className="absolute top-1.5 left-1.5">
                      {getProjectTypeBadge(p.project_type)}
                    </span>
                  </div>

                  {/* Title & Metadata */}
                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors truncate">
                      {p.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {p.duration_sec.toFixed(1)}s &bull; {p.total_clips} clips &bull; {p.fps} fps
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "Recent"}</span>
                  </span>
                  <span className="text-cyan-400 font-bold group-hover:underline">Open &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Content: Central Asset Library */}
        {activeTab === "assets" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {assets.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-600">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">Asset library is empty</p>
                <p className="text-xs text-slate-500 mt-1">Upload videos, images, or audio files to use them across any editor</p>
              </div>
            ) : (
              assets.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 p-3 flex flex-col justify-between space-y-2.5 shadow-lg group"
                >
                  <div className="aspect-video w-full rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center relative overflow-hidden">
                    {a.thumbnail_url ? (
                      <img src={`${BASE_URL}${a.thumbnail_url}`} alt={a.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center space-y-1 text-slate-600">
                        {a.media_type === "audio" ? <Music className="w-8 h-8 text-amber-500/50" /> : <Film className="w-8 h-8 text-cyan-500/50" />}
                        <span className="text-[10px] font-mono uppercase">{a.media_type}</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAsset(a.id);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h5 className="font-bold text-xs text-slate-200 truncate">{a.name}</h5>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {a.duration_sec.toFixed(1)}s &bull; {(a.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>

                  {/* Compact Waveform rendering if available */}
                  {a.waveform && a.waveform.length > 0 && (
                    <div className="h-6 w-full flex items-end space-x-[2px] bg-slate-950/60 p-1 rounded-md overflow-hidden">
                      {a.waveform.slice(0, 40).map((peak, idx) => (
                        <div
                          key={idx}
                          className="flex-1 bg-cyan-500/80 rounded-t-[1px]"
                          style={{ height: `${Math.max(10, peak * 100)}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
          <div className="bg-editor-card border border-editor-border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-editor-border">
              <h3 className="font-bold text-white text-base">Create New Creative Project</h3>
              <button
                onClick={() => setIsNewProjectModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Aspect Ratio Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "16:9 Landscape", val: "16:9" },
                    { label: "9:16 Reels/TikTok", val: "9:16" },
                    { label: "1:1 Square", val: "1:1" },
                    { label: "4:5 Portrait", val: "4:5" },
                    { label: "21:9 Cinema", val: "21:9" },
                  ].map((asp) => (
                    <button
                      key={asp.val}
                      onClick={() => setNewProjectAspect(asp.val)}
                      className={`p-2 rounded-lg border text-xs font-semibold transition ${
                        newProjectAspect === asp.val
                          ? "bg-cyan-600/30 border-cyan-500 text-cyan-300"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {asp.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateProject}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 hover:from-cyan-500 hover:to-blue-500 transition mt-2"
              >
                Launch Creative Studio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
