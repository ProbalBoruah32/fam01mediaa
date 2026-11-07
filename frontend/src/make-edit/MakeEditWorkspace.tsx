"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Film,
  UploadCloud,
  Layers,
  History,
  Download,
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Plus,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  Sliders,
  CheckCircle2,
  ChevronDown,
  Split,
  Eye,
} from "lucide-react";
import {
  MakeEditProject,
  ComponentItem,
  ComponentCategory,
  ReplacementData,
  AssetLibraryItem,
} from "./types";
import {
  listMakeEditProjects,
  getMakeEditProject,
  createMakeEditProject,
  replaceComponent,
  resetComponent,
  bulkReplaceCategory,
} from "./api";
import { listProjects as listReverseProjects } from "../lib/api";
import { Project as ReverseProject } from "../lib/types";
import { ComponentLibrary } from "./ComponentLibrary";
import { ComponentInspector } from "./ComponentInspector";
import { EditTimeline } from "./EditTimeline";
import { AssetLibraryModal } from "./AssetLibraryModal";
import { SmartMatchModal } from "./SmartMatchModal";
import { RenderExportModal } from "./RenderExportModal";
import { VersionHistoryModal } from "./VersionHistoryModal";

interface MakeEditWorkspaceProps {
  onSwitchToReverseStudio?: () => void;
}

export const MakeEditWorkspace: React.FC<MakeEditWorkspaceProps> = ({
  onSwitchToReverseStudio,
}) => {
  // Projects State
  const [projects, setProjects] = useState<MakeEditProject[]>([]);
  const [currentProject, setCurrentProject] = useState<MakeEditProject | null>(null);
  const [reverseProjects, setReverseProjects] = useState<ReverseProject[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Selection & Playhead State
  const [selectedComponent, setSelectedComponent] = useState<ComponentItem | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewMode, setPreviewMode] = useState<"reference" | "split">("reference");

  // Modals
  const [isAssetLibOpen, setIsAssetLibOpen] = useState(false);
  const [isSmartMatchOpen, setIsSmartMatchOpen] = useState(false);
  const [isRenderExportOpen, setIsRenderExportOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [assetTargetComponent, setAssetTargetComponent] = useState<ComponentItem | null>(null);

  // Video Ref for syncing
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Load Projects
  const loadData = useCallback(async () => {
    try {
      const [editList, revList] = await Promise.all([
        listMakeEditProjects(),
        listReverseProjects(),
      ]);
      setProjects(editList);
      setReverseProjects(revList);

      if (editList.length > 0 && !currentProject) {
        const fullProj = await getMakeEditProject(editList[0].id);
        setCurrentProject(fullProj);
        if (fullProj.manifest.components.length > 0) {
          setSelectedComponent(fullProj.manifest.components[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load Make Edit projects:", err);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshCurrentProject = async () => {
    if (!currentProject) return;
    try {
      const updated = await getMakeEditProject(currentProject.id);
      setCurrentProject(updated);
      if (selectedComponent) {
        const refreshedComp = updated.manifest.components.find(
          (c) => c.id === selectedComponent.id
        );
        if (refreshedComp) setSelectedComponent(refreshedComp);
      }
    } catch (err) {
      console.error("Failed to refresh project:", err);
    }
  };

  const handleSelectProject = async (id: string) => {
    try {
      setLoading(true);
      const proj = await getMakeEditProject(id);
      setCurrentProject(proj);
      setSelectedComponent(proj.manifest.components[0] || null);
      setCurrentTime(0);
    } catch (err) {
      console.error("Failed to switch project:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromReverse = async (reverseProjId: string, name?: string) => {
    try {
      setLoading(true);
      const newProj = await createMakeEditProject(reverseProjId, name);
      setProjects((prev) => [newProj, ...prev]);
      setCurrentProject(newProj);
      setSelectedComponent(newProj.manifest.components[0] || null);
      setIsImportModalOpen(false);
      setCurrentTime(0);
    } catch (err: any) {
      alert("Failed to import Reverse AI project: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Replacement Handlers
  const handleOpenAssetPicker = (comp: ComponentItem) => {
    setAssetTargetComponent(comp);
    setIsAssetLibOpen(true);
  };

  const handleSelectAssetForReplacement = async (asset: AssetLibraryItem) => {
    if (!currentProject || !assetTargetComponent) return;

    try {
      await replaceComponent(currentProject.id, assetTargetComponent.id, {
        replacement_type: asset.media_type as any,
        asset_id: asset.id,
        user_label: asset.name || (asset as any).label || (asset as any).original_filename,
        fit_mode: "center_crop",
        volume: 1.0,
      });
      await refreshCurrentProject();
    } catch (err: any) {
      alert("Failed to replace component: " + err.message);
    } finally {
      setAssetTargetComponent(null);
    }
  };

  const handleResetComponent = async (comp: ComponentItem) => {
    if (!currentProject) return;
    try {
      await resetComponent(currentProject.id, comp.id);
      await refreshCurrentProject();
    } catch (err: any) {
      alert("Failed to reset component: " + err.message);
    }
  };

  const handleUpdateReplacement = async (
    comp: ComponentItem,
    data: Partial<ReplacementData>
  ) => {
    if (!currentProject) return;
    try {
      await replaceComponent(currentProject.id, comp.id, data);
      await refreshCurrentProject();
    } catch (err: any) {
      alert("Failed to update replacement settings: " + err.message);
    }
  };

  const handleBulkReplaceCategory = async (
    category: ComponentCategory,
    data: Partial<ReplacementData>
  ) => {
    if (!currentProject) return;
    try {
      await bulkReplaceCategory(currentProject.id, category, data);
      await refreshCurrentProject();
    } catch (err: any) {
      alert("Bulk replace failed: " + err.message);
    }
  };

  // Video playback
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Find corresponding Reverse AI project for video stream
  const matchingReverseProject = reverseProjects.find(
    (rp) => rp.id === currentProject?.reverse_ai_project_id
  );

  const replacedCount =
    currentProject?.manifest.components.filter((c) => c.status === "replaced").length || 0;
  const totalComponents = currentProject?.manifest.components.length || 0;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-editor-bg select-none">
      {/* Top Make Your Edit Toolbar */}
      <header className="h-14 bg-editor-card border-b border-editor-border px-4 flex items-center justify-between select-none z-20">
        {/* Brand & Project Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text text-transparent">
                  FAMONEMEDIA
                </span>
              </div>
            </div>
          </div>

          {/* Workspace Switcher */}
          {onSwitchToReverseStudio && (
            <div className="flex items-center bg-editor-panel p-0.5 rounded-lg border border-editor-border">
              <button
                onClick={onSwitchToReverseStudio}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Reverse Studio</span>
              </button>
              <button
                className="flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Make Your Edit</span>
              </button>
            </div>
          )}

          <div className="h-4 w-[1px] bg-editor-border" />

          {/* Project Selector */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select
                value={currentProject?.id || ""}
                onChange={(e) => handleSelectProject(e.target.value)}
                className="appearance-none bg-editor-panel border border-editor-border hover:border-purple-500/40 text-xs text-white rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.manifest.total_components_count} components)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-editor-muted absolute right-2.5 top-2 pointer-events-none" />
            </div>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center space-x-1 text-xs bg-editor-panel hover:bg-editor-hover border border-editor-border text-slate-300 hover:text-white px-2.5 py-1.5 rounded-md transition"
              title="Import completed Reverse AI project into Make Your Edit"
            >
              <Plus className="w-3.5 h-3.5 text-purple-400" />
              <span>Import Reference</span>
            </button>
          </div>
        </div>

        {/* Center Status: Replaced count & badge */}
        {currentProject && (
          <div className="hidden lg:flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              <span>
                {replacedCount} / {totalComponents} Replaced
              </span>
            </span>

            <span className="text-[11px] text-slate-400">
              Aspect: <strong className="text-white">{currentProject.manifest.aspect_ratio}</strong> •{" "}
              {currentProject.manifest.width}x{currentProject.manifest.height} @ {currentProject.manifest.fps}fps
            </span>
          </div>
        )}

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsSmartMatchOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-200 text-xs rounded-lg transition"
            title="Auto-match uploaded media to components"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Smart Match</span>
          </button>

          <button
            onClick={() => {
              setAssetTargetComponent(null);
              setIsAssetLibOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-editor-panel hover:bg-editor-hover border border-editor-border text-slate-300 hover:text-white text-xs rounded-lg transition"
            title="Manage uploaded assets"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Asset Library</span>
          </button>

          {currentProject && (
            <button
              onClick={() => setIsVersionHistoryOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-editor-panel hover:bg-editor-hover border border-editor-border text-slate-300 hover:text-white text-xs rounded-lg transition"
              title="Snapshots and version history"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">
                v{String(currentProject.active_version_number).padStart(3, "0")}
              </span>
            </button>
          )}

          <button
            onClick={() => setIsRenderExportOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md shadow-purple-600/20 transition"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Render & Export</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      {currentProject ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Section: Component Library (Left) + Player / Canvas (Center) + Inspector (Right) */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar: Component Library */}
            <div className="w-80 flex-shrink-0 flex flex-col border-r border-editor-border bg-editor-card overflow-hidden">
              <ComponentLibrary
                manifest={currentProject.manifest}
                selectedComponent={selectedComponent}
                onSelectComponent={(comp) => {
                  setSelectedComponent(comp);
                  handleSeek(comp.start_time);
                }}
                onReplaceComponent={handleOpenAssetPicker}
                onResetComponent={handleResetComponent}
              />
            </div>

            {/* Center Canvas: Video Player Preview */}
            <div className="flex-1 flex flex-col bg-black/90 relative overflow-hidden">
              {/* Player Top Controls */}
              <div className="h-9 px-4 border-b border-editor-border/40 bg-editor-panel/50 flex items-center justify-between text-xs text-editor-muted">
                <div className="flex items-center space-x-2">
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span className="font-medium text-slate-300">
                    {previewMode === "reference" ? "Reference Video" : "Split Comparison"}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      setPreviewMode((m) => (m === "reference" ? "split" : "reference"))
                    }
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                      previewMode === "split"
                        ? "bg-purple-600/20 border-purple-500 text-purple-300"
                        : "bg-editor-panel border-editor-border text-slate-400"
                    }`}
                  >
                    <Split className="w-3 h-3 inline mr-1" />
                    Split Mode
                  </button>
                </div>
              </div>

              {/* Player Viewport */}
              <div className="flex-1 flex items-center justify-center p-4 relative">
                {matchingReverseProject?.video_path ? (
                  <div className="relative max-h-full max-w-full aspect-video bg-black rounded-xl overflow-hidden border border-editor-border shadow-2xl flex items-center justify-center">
                    <video
                      ref={videoRef}
                      src={`http://127.0.0.1:8000/api/make-edit/media?path=${encodeURIComponent(
                        matchingReverseProject.video_path
                      )}`}
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={() => setIsPlaying(false)}
                      className="w-full h-full object-contain"
                    />

                    {/* Active Component Overlay Highlight */}
                    {selectedComponent &&
                      currentTime >= selectedComponent.start_time &&
                      currentTime <= selectedComponent.end_time && (
                        <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-purple-500/50 px-3 py-1.5 rounded-lg text-xs pointer-events-none flex items-center space-x-2 shadow-lg animate-fade-in">
                          <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                          <span className="font-semibold text-white">
                            {selectedComponent.status === "replaced" &&
                            (selectedComponent.replacement?.original_filename || (selectedComponent as any).replacement_data?.user_label)
                              ? (selectedComponent.replacement?.original_filename || (selectedComponent as any).replacement_data?.user_label)
                              : (selectedComponent.title || (selectedComponent as any).name)}
                          </span>
                          <span className="text-[10px] font-mono text-purple-300">
                            [{selectedComponent.category}]
                          </span>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="text-center p-6 text-editor-muted text-xs">
                    <Film className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <span>No reference video source available for this project.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar: Component Inspector */}
            <div className="w-80 flex-shrink-0 flex flex-col border-l border-editor-border bg-editor-card overflow-hidden">
              <ComponentInspector
                component={selectedComponent}
                onUpdateReplacement={handleUpdateReplacement}
                onReplaceClick={handleOpenAssetPicker}
                onResetClick={handleResetComponent}
              />
            </div>
          </div>

          {/* Bottom Section: Edit Timeline */}
          <EditTimeline
            manifest={currentProject.manifest}
            currentTime={currentTime}
            onSeek={handleSeek}
            selectedComponent={selectedComponent}
            onSelectComponent={(comp) => {
              setSelectedComponent(comp);
            }}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
          />
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-editor-panel/20 select-none">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600/20 to-indigo-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 shadow-xl">
            <Sparkles className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Welcome to Make Your Edit</h2>
          <p className="text-xs text-editor-muted max-w-md mb-6 leading-relaxed">
            Transform any video analyzed by Reverse AI into an editable template. Replace original
            clips, graphics, titles, and music with your own media while preserving the original
            timing, speed, and cut structure.
          </p>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs px-5 py-2.5 rounded-lg shadow-lg shadow-purple-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Select Reference Video to Edit</span>
          </button>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-editor-panel border border-editor-border rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">
              Select Completed Reverse AI Project
            </h3>
            <p className="text-xs text-editor-muted mb-4">
              Make Your Edit creates an independent component manifest from the completed Reverse AI
              analysis. Original outputs are never modified.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {reverseProjects.length === 0 ? (
                <div className="text-xs text-editor-muted text-center py-4">
                  No Reverse AI projects found. Run a video analysis in Reverse Studio first.
                </div>
              ) : (
                reverseProjects.map((rp) => (
                  <div
                    key={rp.id}
                    onClick={() => handleCreateFromReverse(rp.id, `Edit - ${rp.name}`)}
                    className="p-3 rounded-lg bg-editor-card hover:bg-purple-950/30 border border-editor-border hover:border-purple-500/50 cursor-pointer flex items-center justify-between transition group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-purple-300">
                        {rp.name}
                      </div>
                      <div className="text-[10px] text-editor-muted font-mono">
                        {rp.timeline ? `${rp.timeline.total_clips} detected shots` : "Analyzed"}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition" />
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AssetLibraryModal
        isOpen={isAssetLibOpen}
        onClose={() => setIsAssetLibOpen(false)}
        targetComponent={assetTargetComponent}
        onSelectForReplacement={handleSelectAssetForReplacement}
      />

      {currentProject && (
        <>
          <SmartMatchModal
            projectId={currentProject.id}
            isOpen={isSmartMatchOpen}
            onClose={() => setIsSmartMatchOpen(false)}
            onApplied={refreshCurrentProject}
          />

          <RenderExportModal
            projectId={currentProject.id}
            projectName={currentProject.name}
            isOpen={isRenderExportOpen}
            onClose={() => setIsRenderExportOpen(false)}
          />

          <VersionHistoryModal
            project={currentProject}
            isOpen={isVersionHistoryOpen}
            onClose={() => setIsVersionHistoryOpen(false)}
            onRestored={refreshCurrentProject}
          />
        </>
      )}
    </div>
  );
};
