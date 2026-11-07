"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Film,
  Sparkles,
  Download,
  Share2,
  Save,
  Undo2,
  Redo2,
  Play,
  Pause,
  ArrowLeft,
  ChevronDown,
  Layers,
  FileCode,
  Sliders,
  Check,
} from "lucide-react";
import {
  EditorProject,
  EditorTrack,
  EditorClip,
  AspectRatioPreset,
  TimelineMarker,
} from "./types";
import {
  createEditorProject,
  listEditorProjects,
  getEditorProject,
  saveEditorProject,
} from "./api";
import { EditorPlayer } from "./EditorPlayer";
import { EditorTimeline } from "./EditorTimeline";
import { EditorSidebar } from "./EditorSidebar";
import { EditorInspector } from "./EditorInspector";
import { ShotcutExportModal } from "./ShotcutExportModal";
import { EditorRenderModal } from "./EditorRenderModal";

interface EditorWorkspaceProps {
  onBackToPortal: () => void;
  onSwitchToReverseStudio: () => void;
  onSwitchToMakeEdit: () => void;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  onBackToPortal,
  onSwitchToReverseStudio,
  onSwitchToMakeEdit,
}) => {
  const [project, setProject] = useState<EditorProject | null>(null);
  const [allProjects, setAllProjects] = useState<EditorProject[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClip, setSelectedClip] = useState<EditorClip | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Modals
  const [isShotcutModalOpen, setIsShotcutModalOpen] = useState(false);
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);

  // Load or create initial project
  useEffect(() => {
    async function init() {
      try {
        const projs = await listEditorProjects();
        setAllProjects(projs);
        if (projs.length > 0) {
          const loaded = await getEditorProject(projs[0].id);
          setProject(loaded);
        } else {
          const created = await createEditorProject("My Creative Edit", "16:9");
          setProject(created);
          setAllProjects([created]);
        }
      } catch (err) {
        console.error("Editor initialization error:", err);
      }
    }
    init();
  }, []);

  // Playback timer loop
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const deltaSec = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        if (!project) return 0;
        const nextTime = prev + deltaSec;
        if (nextTime >= project.total_duration_sec && project.total_duration_sec > 0) {
          setIsPlaying(false);
          return 0;
        }
        return nextTime;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, project]);

  // Undo / Redo History Stacks
  const [pastStates, setPastStates] = useState<EditorProject[]>([]);
  const [futureStates, setFutureStates] = useState<EditorProject[]>([]);

  const recordHistory = useCallback((curr: EditorProject) => {
    setPastStates((prev) => [...prev.slice(-30), JSON.parse(JSON.stringify(curr))]);
    setFutureStates([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (pastStates.length === 0 || !project) return;
    const previous = pastStates[pastStates.length - 1];
    const newPast = pastStates.slice(0, pastStates.length - 1);
    setFutureStates((prev) => [JSON.parse(JSON.stringify(project)), ...prev]);
    setPastStates(newPast);
    setProject(previous);
    if (selectedClip && !previous.tracks.some((t) => t.clips.some((c) => c.id === selectedClip.id))) {
      setSelectedClip(null);
    }
    handleSave(previous);
  }, [pastStates, project, selectedClip]);

  const handleRedo = useCallback(() => {
    if (futureStates.length === 0 || !project) return;
    const next = futureStates[0];
    const newFuture = futureStates.slice(1);
    setPastStates((prev) => [...prev, JSON.parse(JSON.stringify(project))]);
    setFutureStates(newFuture);
    setProject(next);
    handleSave(next);
  }, [futureStates, project]);

  // Spacebar and Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && (e.key === "z" || e.key === "Z")) || e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Save project helper
  const handleSave = useCallback(
    async (projToSave?: EditorProject) => {
      const target = projToSave || project;
      if (!target) return;
      try {
        setIsSaving(true);
        const updated = await saveEditorProject(target.id, target);
        setProject(updated);
        setLastSaved(new Date().toLocaleTimeString());
      } catch (err) {
        console.error("Save error:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [project]
  );

  // Timeline Clip Manipulations
  const handleUpdateClip = (clipId: string, partial: Partial<EditorClip>) => {
    if (!project) return;
    const nextTracks = project.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((c) => (c.id === clipId ? { ...c, ...partial } : c)),
    }));

    // Update total duration
    const maxDur = Math.max(
      ...nextTracks.flatMap((t) => t.clips.map((c) => c.start_time + c.duration)),
      0
    );

    const updatedProj: EditorProject = {
      ...project,
      tracks: nextTracks,
      total_duration_sec: Math.max(maxDur, 0),
    };

    setProject(updatedProj);
    if (selectedClip && selectedClip.id === clipId) {
      setSelectedClip({ ...selectedClip, ...partial });
    }
  };

  const handleDeleteClip = (clipId: string) => {
    if (!project) return;
    recordHistory(project);
    const nextTracks = project.tracks.map((track) => ({
      ...track,
      clips: track.clips.filter((c) => c.id !== clipId),
    }));

    const maxDur = Math.max(
      ...nextTracks.flatMap((t) => t.clips.map((c) => c.start_time + c.duration)),
      0
    );

    const updatedProj: EditorProject = {
      ...project,
      tracks: nextTracks,
      total_duration_sec: Math.max(maxDur, 0),
    };

    setProject(updatedProj);
    if (selectedClip?.id === clipId) {
      setSelectedClip(null);
    }
    handleSave(updatedProj);
  };

  const handleRippleDeleteClip = (clipId: string) => {
    if (!project) return;
    recordHistory(project);

    let clipToDelete: EditorClip | null = null;
    for (const track of project.tracks) {
      const found = track.clips.find((c) => c.id === clipId);
      if (found) {
        clipToDelete = found;
        break;
      }
    }
    if (!clipToDelete) return;

    const deletedDuration = clipToDelete.duration;
    const deletedStart = clipToDelete.start_time;

    const nextTracks = project.tracks.map((track) => {
      const hasClip = track.clips.some((c) => c.id === clipId);
      if (!hasClip) return track;

      const newClips = track.clips
        .filter((c) => c.id !== clipId)
        .map((c) => {
          if (c.start_time > deletedStart) {
            return {
              ...c,
              start_time: Math.max(0, c.start_time - deletedDuration),
            };
          }
          return c;
        });

      return { ...track, clips: newClips };
    });

    const maxDur = Math.max(
      ...nextTracks.flatMap((t) => t.clips.map((c) => c.start_time + c.duration)),
      0
    );

    const updatedProj: EditorProject = {
      ...project,
      tracks: nextTracks,
      total_duration_sec: Math.max(maxDur, 0),
    };

    setProject(updatedProj);
    if (selectedClip?.id === clipId) {
      setSelectedClip(null);
    }
    handleSave(updatedProj);
  };

  const handleDuplicateClip = (clipId: string) => {
    if (!project) return;
    recordHistory(project);

    let targetClip: EditorClip | null = null;
    let targetTrackId: string | null = null;

    for (const track of project.tracks) {
      const found = track.clips.find((c) => c.id === clipId);
      if (found) {
        targetClip = found;
        targetTrackId = track.id;
        break;
      }
    }

    if (!targetClip || !targetTrackId) return;

    const duplicatedClip: EditorClip = {
      ...JSON.parse(JSON.stringify(targetClip)),
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${targetClip.name} (Copy)`,
      start_time: targetClip.start_time + targetClip.duration,
    };

    const nextTracks = project.tracks.map((track) => {
      if (track.id !== targetTrackId) return track;
      return {
        ...track,
        clips: [...track.clips, duplicatedClip],
      };
    });

    const maxDur = Math.max(
      ...nextTracks.flatMap((t) => t.clips.map((c) => c.start_time + c.duration)),
      0
    );

    const updatedProj: EditorProject = {
      ...project,
      tracks: nextTracks,
      total_duration_sec: Math.max(maxDur, 0),
    };

    setProject(updatedProj);
    setSelectedClip(duplicatedClip);
    handleSave(updatedProj);
  };

  const handleFreezeFrame = (clipId: string, freezeTime: number) => {
    if (!project) return;
    const track = project.tracks.find((t) => t.clips.some((c) => c.id === clipId));
    if (!track) return;

    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return;

    const firstHalfDuration = freezeTime - clip.start_time;
    const secondHalfDuration = clip.duration - firstHalfDuration;
    if (firstHalfDuration < 0.1 || secondHalfDuration < 0.1) return;

    recordHistory(project);
    const freezeDuration = 3.0; // 3 seconds freeze

    const clipPart1: EditorClip = {
      ...clip,
      duration: firstHalfDuration,
    };

    const freezeClip: EditorClip = {
      ...JSON.parse(JSON.stringify(clip)),
      id: `${clip.id}_freeze_${Date.now().toString().slice(-4)}`,
      name: `${clip.name} (Freeze)`,
      start_time: freezeTime,
      duration: freezeDuration,
      speed: 0.0001,
    };

    const clipPart2: EditorClip = {
      ...clip,
      id: `${clip.id}_part2_${Date.now().toString().slice(-4)}`,
      start_time: freezeTime + freezeDuration,
      duration: secondHalfDuration,
      trim_in: (clip.trim_in || 0) + firstHalfDuration,
    };

    const nextTracks = project.tracks.map((t) => {
      if (t.id !== track.id) return t;
      const newClips: EditorClip[] = [];
      for (const c of t.clips) {
        if (c.id === clipId) {
          newClips.push(clipPart1, freezeClip, clipPart2);
        } else if (c.start_time > freezeTime) {
          newClips.push({
            ...c,
            start_time: c.start_time + freezeDuration,
          });
        } else {
          newClips.push(c);
        }
      }
      return { ...t, clips: newClips };
    });

    const maxDur = Math.max(
      ...nextTracks.flatMap((t) => t.clips.map((c) => c.start_time + c.duration)),
      0
    );

    const updatedProj: EditorProject = {
      ...project,
      tracks: nextTracks,
      total_duration_sec: Math.max(maxDur, 0),
    };

    setProject(updatedProj);
    setSelectedClip(freezeClip);
    handleSave(updatedProj);
  };

  const handleSplitClip = (clipId: string, splitTime: number) => {
    if (!project) return;
    const track = project.tracks.find((t) => t.clips.some((c) => c.id === clipId));
    if (!track) return;

    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return;

    const firstHalfDuration = splitTime - clip.start_time;
    const secondHalfDuration = clip.duration - firstHalfDuration;
    if (firstHalfDuration < 0.1 || secondHalfDuration < 0.1) return;

    recordHistory(project);

    const clip1: EditorClip = {
      ...clip,
      duration: firstHalfDuration,
    };

    const clip2: EditorClip = {
      ...clip,
      id: `${clip.id}_part2_${Date.now().toString().slice(-4)}`,
      start_time: splitTime,
      duration: secondHalfDuration,
      trim_in: (clip.trim_in || 0) + firstHalfDuration,
    };

    const nextTracks = project.tracks.map((t) => {
      if (t.id !== track.id) return t;
      const newClips = t.clips.flatMap((c) => (c.id === clipId ? [clip1, clip2] : [c]));
      return { ...t, clips: newClips };
    });

    const updatedProj: EditorProject = {
      ...project,
      tracks: nextTracks,
    };

    setProject(updatedProj);
    setSelectedClip(clip2);
    handleSave(updatedProj);
  };

  const handleAddMarker = (time: number, label?: string) => {
    if (!project) return;
    recordHistory(project);
    const newMarker: TimelineMarker = {
      id: `m_${Date.now()}`,
      time,
      label: label || `Marker ${Math.round(time)}s`,
      color: "#06b6d4",
    };
    const updatedProj: EditorProject = {
      ...project,
      markers: [...(project.markers || []), newMarker],
    };
    setProject(updatedProj);
    handleSave(updatedProj);
  };

  const handleDeleteMarker = (markerId: string) => {
    if (!project) return;
    recordHistory(project);
    const updatedProj: EditorProject = {
      ...project,
      markers: (project.markers || []).filter((m) => m.id !== markerId),
    };
    setProject(updatedProj);
    handleSave(updatedProj);
  };

  const handleAddClipToTrack = (newClip: EditorClip) => {
    if (!project) return;
    recordHistory(project);
    const nextTracks = project.tracks.map((track) => {
      if (track.id === newClip.track_id) {
        return { ...track, clips: [...track.clips, newClip] };
      }
      return track;
    });

    const maxDur = Math.max(
      ...nextTracks.flatMap((t) => t.clips.map((c) => c.start_time + c.duration)),
      0
    );

    const updatedProj: EditorProject = {
      ...project,
      tracks: nextTracks,
      total_duration_sec: Math.max(maxDur, 0),
    };

    setProject(updatedProj);
    setSelectedClip(newClip);
    handleSave(updatedProj);
  };

  const handleAspectRatioChange = (aspect: AspectRatioPreset) => {
    if (!project) return;
    recordHistory(project);
    const updated = { ...project, aspect_ratio: aspect };
    setProject(updated);
    handleSave(updated);
  };

  const handleToggleTrackMute = (trackId: string) => {
    if (!project) return;
    const nextTracks = project.tracks.map((t) => (t.id === trackId ? { ...t, is_muted: !t.is_muted } : t));
    setProject({ ...project, tracks: nextTracks });
  };

  const handleToggleTrackLock = (trackId: string) => {
    if (!project) return;
    const nextTracks = project.tracks.map((t) => (t.id === trackId ? { ...t, is_locked: !t.is_locked } : t));
    setProject({ ...project, tracks: nextTracks });
  };

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-editor-bg select-none">
        <div className="flex items-center space-x-3 text-cyan-400">
          <Film className="w-6 h-6 animate-pulse" />
          <span className="font-semibold text-sm">Loading CapCut + Shotcut Combined Editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-editor-bg select-none">
      {/* Top Application Header */}
      <header className="h-14 bg-editor-card border-b border-editor-border px-4 flex items-center justify-between z-20">
        {/* Left: Brand & Return Navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onBackToPortal}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-editor-panel hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-editor-border transition"
            title="Return to Suite Portal"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portal</span>
          </button>

          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-600/30">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                CapCut + Shotcut Editor
              </span>
            </div>
          </div>

          <div className="h-4 w-[1px] bg-editor-border" />

          {/* Module Switcher Pills */}
          <div className="flex items-center bg-editor-panel p-0.5 rounded-lg border border-editor-border">
            <button
              onClick={onSwitchToReverseStudio}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Reverse Studio</span>
            </button>
            <button
              onClick={onSwitchToMakeEdit}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold text-purple-300 hover:text-white transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Make Your Edit</span>
            </button>
            <button
              className="flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-cyan-600 text-white shadow-sm"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-200" />
              <span>Creative Editor</span>
            </button>
          </div>
        </div>

        {/* Center: Project Title & Aspect Ratio */}
        <div className="flex items-center space-x-3">
          <input
            type="text"
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            onBlur={() => handleSave()}
            className="bg-transparent hover:bg-editor-panel border border-transparent hover:border-editor-border focus:border-cyan-500 rounded px-2 py-1 text-white font-bold text-xs text-center focus:outline-none transition max-w-[200px]"
          />

          <select
            value={project.aspect_ratio}
            onChange={(e) => handleAspectRatioChange(e.target.value as AspectRatioPreset)}
            className="bg-editor-panel border border-editor-border text-xs text-cyan-300 rounded-md px-2.5 py-1 font-mono focus:outline-none cursor-pointer"
          >
            <option value="16:9">16:9 (Landscape)</option>
            <option value="9:16">9:16 (TikTok/Reels)</option>
            <option value="1:1">1:1 (Square)</option>
            <option value="4:5">4:5 (Portrait)</option>
            <option value="21:9">21:9 (Cinematic)</option>
          </select>
        </div>

        {/* Right: Export & Render Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Undo / Redo */}
          <div className="flex items-center bg-editor-panel rounded-lg border border-editor-border p-0.5">
            <button
              onClick={handleUndo}
              disabled={pastStates.length === 0}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={futureStates.length === 0}
              className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Save Status */}
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-editor-panel hover:bg-slate-700 text-slate-300 text-xs border border-editor-border transition"
            title="Save Project"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isSaving ? "Saving..." : lastSaved ? `Saved ${lastSaved}` : "Save"}</span>
          </button>

          {/* Export to Shotcut Desktop */}
          <button
            onClick={() => setIsShotcutModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-editor-panel hover:bg-slate-700 border border-editor-border hover:border-cyan-500/50 text-slate-200 hover:text-white text-xs font-semibold transition"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>Shotcut Desktop (.mlt)</span>
          </button>

          {/* Render Final MP4 */}
          <button
            onClick={() => setIsRenderModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Render Video</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout: Left Sidebar + Center Player + Right Inspector */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Media & Presets Sidebar */}
        <EditorSidebar
          project={project}
          onAddClipToTrack={handleAddClipToTrack}
          onProjectUpdated={(updated) => setProject(updated)}
        />

        {/* Center Live Video & Overlay Player */}
        <EditorPlayer
          project={project}
          currentTime={currentTime}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onSeek={setCurrentTime}
          selectedClip={selectedClip}
        />

        {/* Right Clip Inspector */}
        <EditorInspector
          clip={selectedClip}
          currentTime={currentTime}
          onUpdateClip={handleUpdateClip}
          onDeleteClip={handleDeleteClip}
        />
      </div>

      {/* Bottom Multitrack Timeline */}
      <EditorTimeline
        project={project}
        currentTime={currentTime}
        onSeek={setCurrentTime}
        selectedClip={selectedClip}
        onSelectClip={setSelectedClip}
        onUpdateClip={handleUpdateClip}
        onDeleteClip={handleDeleteClip}
        onRippleDeleteClip={handleRippleDeleteClip}
        onDuplicateClip={handleDuplicateClip}
        onFreezeFrame={handleFreezeFrame}
        onSplitClip={handleSplitClip}
        onToggleTrackMute={handleToggleTrackMute}
        onToggleTrackLock={handleToggleTrackLock}
        onAddMarker={handleAddMarker}
        onDeleteMarker={handleDeleteMarker}
      />

      {/* Export & Render Modals */}
      <ShotcutExportModal
        isOpen={isShotcutModalOpen}
        onClose={() => setIsShotcutModalOpen(false)}
        project={project}
      />

      <EditorRenderModal
        isOpen={isRenderModalOpen}
        onClose={() => setIsRenderModalOpen(false)}
        project={project}
      />
    </div>
  );
};
