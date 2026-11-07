"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "../components/Header";
import { Sidebar, ActiveTab } from "../components/Sidebar";
import { VideoPlayer } from "../components/VideoPlayer";
import { MultitrackTimeline } from "../components/MultitrackTimeline";
import { ClipInspector } from "../components/ClipInspector";
import { StoryboardView } from "../components/StoryboardView";
import { TranscriptView } from "../components/TranscriptView";
import { OcrView } from "../components/OcrView";
import { UploadModal } from "../components/UploadModal";
import { AnalysisProgressModal } from "../components/AnalysisProgressModal";
import { ExportModal } from "../components/ExportModal";
import { SettingsDrawer } from "../components/SettingsDrawer";
import {
  listProjects,
  getProject,
  createProject,
  getJobStatus,
  patchTimeline,
  getHardwareInfo,
} from "../lib/api";
import { Project, ClipItem, JobStatus, HardwareInfo } from "../lib/types";
import { UploadCloud, Film, Sparkles, Layers } from "lucide-react";
import { MakeEditWorkspace } from "../make-edit/MakeEditWorkspace";
import { EditorWorkspace } from "../editor/EditorWorkspace";
import { LandingPortal } from "../components/LandingPortal";
import { Dashboard } from "../components/Dashboard";

export default function App() {
  const [workspaceMode, setWorkspaceMode] = useState<"dashboard" | "landing" | "reverse" | "make-edit" | "editor">("landing");
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("editor");
  const [currentTime, setCurrentTime] = useState(0);
  const [activeClip, setActiveClip] = useState<ClipItem | null>(null);
  const [hardware, setHardware] = useState<HardwareInfo | null>(null);

  // Modals & Drawers
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Background Job Monitoring
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  // Initial load
  const loadInitialData = useCallback(async () => {
    try {
      const [projList, hw] = await Promise.all([listProjects(), getHardwareInfo()]);
      setProjects(projList);
      setHardware(hw);

      if (projList.length > 0) {
        const fullProj = await getProject(projList[0].id);
        setCurrentProject(fullProj);
        if (fullProj.timeline?.clips?.length) {
          setActiveClip(fullProj.timeline.clips[0]);
        }
      }
    } catch (err) {
      console.error("Initialization error:", err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Background Job Polling
  useEffect(() => {
    if (!activeJobId) return;

    const interval = setInterval(async () => {
      try {
        const status = await getJobStatus(activeJobId);
        setJobStatus(status);

        if (status.status === "completed") {
          clearInterval(interval);
          setActiveJobId(null);
          // Reload project & timeline
          if (currentProject) {
            const updated = await getProject(currentProject.id);
            setCurrentProject(updated);
            if (updated.timeline?.clips?.length) {
              setActiveClip(updated.timeline.clips[0]);
            }
          }
        } else if (status.status === "failed" || status.status === "cancelled") {
          clearInterval(interval);
          setActiveJobId(null);
        }
      } catch (e) {
        console.error("Job poll error:", e);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeJobId, currentProject]);

  const handleSelectProject = async (id: string) => {
    try {
      const proj = await getProject(id);
      setCurrentProject(proj);
      if (proj.timeline?.clips?.length) {
        setActiveClip(proj.timeline.clips[0]);
        setCurrentTime(0);
      } else {
        setActiveClip(null);
      }
    } catch (e) {
      console.error("Failed to select project:", e);
    }
  };

  const handleCreateNewProject = async () => {
    const name = prompt("Enter new project title:", "New Reference Project");
    if (!name?.trim()) return;
    try {
      const newProj = await createProject(name.trim());
      setProjects((prev) => [newProj, ...prev]);
      setCurrentProject(newProj);
      setActiveClip(null);
      setIsUploadOpen(true);
    } catch (e) {
      alert("Failed to create project");
    }
  };

  const handleAnalysisStarted = (jobId: string) => {
    setActiveJobId(jobId);
    setIsProgressOpen(true);
  };

  const handleClipTrim = async (clipId: string, newStart: number, newEnd: number) => {
    if (!currentProject?.timeline) return;
    try {
      const updatedTimeline = await patchTimeline(currentProject.id, {
        clips: [{ id: clipId, start_time: newStart, end_time: newEnd }],
      });
      setCurrentProject((prev) => (prev ? { ...prev, timeline: updatedTimeline } : null));
    } catch (e) {
      console.error("Failed to trim clip:", e);
    }
  };

  const handleUpdateActiveClip = async (updatedData: Partial<ClipItem>) => {
    if (!currentProject?.timeline || !activeClip) return;
    try {
      const updatedTimeline = await patchTimeline(currentProject.id, {
        clips: [{ id: activeClip.id, ...updatedData }],
      });
      setCurrentProject((prev) => (prev ? { ...prev, timeline: updatedTimeline } : null));
      const matched = updatedTimeline.clips.find((c) => c.id === activeClip.id);
      if (matched) setActiveClip(matched);
    } catch (e) {
      console.error("Failed to update clip:", e);
    }
  };

  const hasTimeline = Boolean(currentProject?.timeline);
  const totalClips = currentProject?.timeline?.total_clips || 0;
  const totalText = currentProject?.timeline?.tracks.find((t) => t.type === "text")?.events.length || 0;
  const totalTranscript = currentProject?.timeline?.transcript.length || 0;

  if (workspaceMode === "dashboard") {
    return (
      <Dashboard
        onOpenReverseStudio={(projId) => {
          if (projId) handleSelectProject(projId);
          setWorkspaceMode("reverse");
        }}
        onOpenMakeEdit={() => setWorkspaceMode("make-edit")}
        onOpenEditor={() => setWorkspaceMode("editor")}
        hardware={hardware}
      />
    );
  }

  if (workspaceMode === "landing") {
    return (
      <LandingPortal
        onSelectReverseEngine={() => setWorkspaceMode("reverse")}
        onSelectEditor={() => setWorkspaceMode("editor")}
        onSelectMakeEdit={() => setWorkspaceMode("make-edit")}
        onSelectDashboard={() => setWorkspaceMode("dashboard")}
        hardware={hardware}
      />
    );
  }

  if (workspaceMode === "editor") {
    return (
      <EditorWorkspace
        onBackToPortal={() => setWorkspaceMode("landing")}
        onSwitchToReverseStudio={() => setWorkspaceMode("reverse")}
        onSwitchToMakeEdit={() => setWorkspaceMode("make-edit")}
      />
    );
  }

  if (workspaceMode === "make-edit") {
    return (
      <MakeEditWorkspace
        onSwitchToReverseStudio={() => setWorkspaceMode("reverse")}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-editor-bg select-none">
      {/* Main Top Header */}
      <Header
        currentProject={currentProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        onNewProject={handleCreateNewProject}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        hardware={hardware}
        workspaceMode={workspaceMode}
        onWorkspaceModeChange={setWorkspaceMode}
      />

      {/* Main Studio Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onUploadClick={() => setIsUploadOpen(true)}
          hasVideo={Boolean(currentProject?.video_path)}
          hasTimeline={hasTimeline}
          totalClips={totalClips}
          totalText={totalText}
          totalTranscript={totalTranscript}
          onSwitchToMakeEdit={() => setWorkspaceMode("make-edit")}
        />

        {/* Tab Viewport Routing */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === "editor" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {currentProject?.timeline ? (
                <>
                  {/* Top Half: Video Player + Clip Inspector */}
                  <div className="flex-1 flex overflow-hidden">
                    <VideoPlayer
                      projectId={currentProject.id}
                      timeline={currentProject.timeline}
                      currentTime={currentTime}
                      onTimeUpdate={setCurrentTime}
                      activeClip={activeClip}
                      onSelectClip={setActiveClip}
                    />

                    <ClipInspector
                      clip={activeClip}
                      onUpdateClip={handleUpdateActiveClip}
                    />
                  </div>

                  {/* Bottom Half: Multitrack Interactive Timeline */}
                  <MultitrackTimeline
                    timeline={currentProject.timeline}
                    currentTime={currentTime}
                    onSeek={setCurrentTime}
                    activeClip={activeClip}
                    onSelectClip={setActiveClip}
                    onClipTrim={handleClipTrim}
                  />
                </>
              ) : (
                /* Empty Project State */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-editor-panel/20 select-none">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-xl">
                    <Film className="w-10 h-10" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    {currentProject ? currentProject.name : "FAMONEMEDIA Reverse AI"}
                  </h2>
                  <p className="text-xs text-editor-muted max-w-md mb-6 leading-relaxed">
                    Upload an MP4, MOV, or MKV reference video. Our local CPU engine will analyze shot boundaries, camera motion, on-screen text, speech, tempo beats, and synthesize an editable multitrack timeline approximation.
                  </p>
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs px-5 py-2.5 rounded-lg shadow-lg shadow-cyan-600/20 transition"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Reference Video</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "storyboard" && currentProject?.timeline && (
            <StoryboardView
              timeline={currentProject.timeline}
              activeClip={activeClip}
              onSelectClip={setActiveClip}
              onSeek={setCurrentTime}
            />
          )}

          {activeTab === "transcript" && currentProject?.timeline && (
            <TranscriptView
              transcript={currentProject.timeline.transcript}
              currentTime={currentTime}
              onSeek={setCurrentTime}
            />
          )}

          {activeTab === "ocr" && currentProject?.timeline && (
            <OcrView
              timeline={currentProject.timeline}
              onSeek={setCurrentTime}
            />
          )}

          {activeTab === "system" && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="bg-editor-card border border-editor-border rounded-xl p-8 max-w-lg text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mx-auto flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white">Local Hardware & Model Hub</h3>
                <p className="text-xs text-editor-muted">
                  Open the Settings drawer to view live CPU thread allocation, RAM usage, and model readiness status.
                </p>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition"
                >
                  View Engine Audit
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      {currentProject && (
        <>
          <UploadModal
            projectId={currentProject.id}
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            onAnalysisStarted={handleAnalysisStarted}
          />

          <ExportModal
            projectId={currentProject.id}
            projectName={currentProject.name}
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
          />
        </>
      )}

      <AnalysisProgressModal
        job={jobStatus}
        isOpen={isProgressOpen}
        onClose={() => setIsProgressOpen(false)}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
