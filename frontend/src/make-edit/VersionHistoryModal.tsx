"use client";

import React, { useState } from "react";
import {
  History,
  RotateCcw,
  Plus,
  CheckCircle2,
  Clock,
  Layers,
  X,
  AlertCircle,
  Bookmark,
} from "lucide-react";
import { ProjectVersion, MakeEditProject } from "./types";
import { createVersion, restoreVersion } from "./api";

interface VersionHistoryModalProps {
  project: MakeEditProject;
  isOpen: boolean;
  onClose: () => void;
  onRestored: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  project,
  isOpen,
  onClose,
  onRestored,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newVersionName, setNewVersionName] = useState("");
  const [newVersionDesc, setNewVersionDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await createVersion(project.id, newVersionName.trim(), newVersionDesc.trim());
      setIsCreating(false);
      setNewVersionName("");
      setNewVersionDesc("");
      onRestored();
    } catch (err: any) {
      setError(err.message || "Failed to create version snapshot");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionNum: number) => {
    if (
      !confirm(
        `Are you sure you want to restore Version v${String(versionNum).padStart(
          3,
          "0"
        )}? Any un-snapshotted edits will be reverted to this point.`
      )
    )
      return;

    setLoading(true);
    setError(null);
    try {
      await restoreVersion(project.id, versionNum);
      onRestored();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to restore version");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-editor-panel border border-editor-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-editor-border flex items-center justify-between bg-editor-card/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <History className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Version History & Snapshots
              </h2>
              <p className="text-xs text-editor-muted">
                Create immutable snapshots of your edits or roll back to any previous state.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-editor-hover transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center space-x-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* New Snapshot Form */}
          {isCreating ? (
            <form
              onSubmit={handleCreateSnapshot}
              className="p-4 rounded-xl bg-editor-card border border-purple-500/40 space-y-3"
            >
              <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                <Bookmark className="w-4 h-4 text-purple-400" />
                <span>Save New Version Snapshot</span>
              </div>
              <input
                type="text"
                placeholder="Snapshot Name (e.g. Added Cyberpunk Intro & Logo)"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                required
                className="w-full bg-editor-panel border border-editor-border rounded-lg px-3 py-2 text-xs text-white placeholder-editor-muted focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <textarea
                placeholder="Optional description of changes..."
                value={newVersionDesc}
                onChange={(e) => setNewVersionDesc(e.target.value)}
                rows={2}
                className="w-full bg-editor-panel border border-editor-border rounded-lg px-3 py-2 text-xs text-white placeholder-editor-muted focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow-md transition disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Snapshot"}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 px-4 rounded-xl border border-dashed border-purple-500/40 hover:border-purple-500 bg-purple-950/10 hover:bg-purple-950/20 text-purple-300 text-xs font-medium flex items-center justify-center space-x-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Version Snapshot</span>
            </button>
          )}

          {/* Versions List */}
          <div className="space-y-3 pt-2">
            {project.versions.map((ver) => {
              const isActive = ver.version_number === project.active_version_number;

              return (
                <div
                  key={ver.version_id}
                  className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                    isActive
                      ? "bg-purple-950/20 border-purple-500/50 shadow-md shadow-purple-950/20"
                      : "bg-editor-card border-editor-border hover:border-slate-600"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-editor-panel border border-editor-border text-purple-300">
                        {ver.version_id}
                      </span>
                      <h4 className="text-xs font-semibold text-white truncate">{ver.name}</h4>
                      {isActive && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">
                          Current Active
                        </span>
                      )}
                    </div>

                    {ver.description && (
                      <p className="text-[11px] text-editor-muted mt-1 leading-relaxed">
                        {ver.description}
                      </p>
                    )}

                    <div className="flex items-center space-x-4 mt-2 text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{new Date(ver.created_at).toLocaleString()}</span>
                      </span>
                      <span>•</span>
                      <span>{ver.replaced_count} replaced element(s)</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {isActive ? (
                      <span className="flex items-center space-x-1 text-xs text-purple-400 font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRestore(ver.version_number)}
                        disabled={loading}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-editor-hover hover:bg-editor-panel border border-editor-border text-xs text-slate-300 hover:text-white transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-editor-border bg-editor-card/40 flex items-center justify-between">
          <span className="text-xs text-editor-muted">
            {project.versions.length} version snapshot(s) stored
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-editor-hover hover:bg-editor-card border border-editor-border text-slate-300 hover:text-white text-xs rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
