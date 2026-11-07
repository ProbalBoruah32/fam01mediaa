"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Check,
  AlertTriangle,
  X,
  ArrowRight,
  Film,
  Music,
  Image as ImageIcon,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
import { MatchSuggestion, ComponentItem } from "./types";
import { matchAssets, replaceComponent } from "./api";

interface SmartMatchModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onApplied: () => void;
}

export const SmartMatchModal: React.FC<SmartMatchModalProps> = ({
  projectId,
  isOpen,
  onClose,
  onApplied,
}) => {
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const loadMatches = async () => {
    setLoading(true);
    try {
      const res = await matchAssets(projectId);
      setSuggestions(res.suggestions || []);
    } catch (err: any) {
      console.error("Failed to load smart matches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMatches();
      setAppliedIds(new Set());
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const handleApplyOne = async (s: MatchSuggestion) => {
    setApplying(s.component_id);
    try {
      await replaceComponent(projectId, s.component_id, {
        asset_id: s.asset_id,
        user_label: s.asset_name,
        fit_mode: "center_crop",
        volume: 1.0,
      });
      setAppliedIds((prev) => {
        const next = new Set(prev);
        next.add(s.component_id);
        return next;
      });
      onApplied();
    } catch (err: any) {
      alert("Failed to apply replacement: " + err.message);
    } finally {
      setApplying(null);
    }
  };

  const handleApplyAll = async () => {
    setLoading(true);
    try {
      for (const s of suggestions) {
        if (!appliedIds.has(s.component_id)) {
          await replaceComponent(projectId, s.component_id, {
            asset_id: s.asset_id,
            user_label: s.asset_name,
            fit_mode: "center_crop",
            volume: 1.0,
          });
          setAppliedIds((prev) => {
            const next = new Set(prev);
            next.add(s.component_id);
            return next;
          });
        }
      }
      onApplied();
      onClose();
    } catch (err: any) {
      alert("Failed to apply all matches: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-editor-panel border border-editor-border rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-editor-border flex items-center justify-between bg-editor-card/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Smart Asset Auto-Matcher
              </h2>
              <p className="text-xs text-editor-muted">
                Heuristically matches your uploaded assets to original video clips, graphics, and audio.
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
        <div className="p-6 flex-1 overflow-y-auto">
          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center space-y-2 text-editor-muted text-xs">
              <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
              <span>Analyzing duration, aspect ratio, and category heuristics...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-editor-border rounded-xl">
              <Sparkles className="w-8 h-8 text-editor-muted mb-2" />
              <div className="text-sm font-semibold text-slate-300">No matches found</div>
              <p className="text-xs text-editor-muted mt-1 max-w-md">
                Upload video, audio, or image files to your Asset Library first. Smart Match will
                automatically analyze them against detected shot durations and types.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs text-editor-muted">
                  Found <strong className="text-white">{suggestions.length}</strong> suggested
                  replacement(s)
                </span>
                <button
                  onClick={handleApplyAll}
                  className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md transition"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Apply All Matches</span>
                </button>
              </div>

              {suggestions.map((s) => {
                const isApplied = appliedIds.has(s.component_id);
                const scorePct = Math.round(s.match_score * 100);

                return (
                  <div
                    key={s.component_id}
                    className={`p-4 rounded-xl border transition ${
                      isApplied
                        ? "bg-emerald-950/20 border-emerald-500/40"
                        : "bg-editor-card border-editor-border hover:border-purple-500/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Original Target */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Target Component
                        </div>
                        <div className="text-xs font-semibold text-white truncate mt-0.5">
                          {s.component_title || (s as any).component_name}
                        </div>
                        <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-editor-panel text-slate-300 border border-editor-border">
                          {s.component_category || (s as any).category}
                        </span>
                      </div>

                      {/* Middle: Arrow & Score */}
                      <div className="flex flex-col items-center justify-center px-2 flex-shrink-0">
                        <div
                          className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full border mb-1 ${
                            scorePct >= 80
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : scorePct >= 50
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                          }`}
                        >
                          {scorePct}% Match
                        </div>
                        <ArrowRight className="w-4 h-4 text-purple-400" />
                      </div>

                      {/* Right: Suggested Asset */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Suggested Replacement
                        </div>
                        <div className="text-xs font-semibold text-purple-200 truncate mt-0.5">
                          {s.asset_name}
                        </div>
                        <div className="text-[10px] font-mono text-editor-muted mt-1 flex items-center space-x-2">
                          <span>Asset ID: {s.asset_id}</span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex-shrink-0">
                        {isApplied ? (
                          <span className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-medium">
                            <Check className="w-3.5 h-3.5" />
                            <span>Applied</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApplyOne(s)}
                            disabled={applying === s.component_id}
                            className="flex items-center space-x-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg transition shadow-md shadow-purple-600/20 disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{applying === s.component_id ? "Applying..." : "Accept"}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reason & Warnings */}
                    <div className="mt-3 pt-2.5 border-t border-editor-border/60 flex flex-col space-y-1">
                      <div className="text-[11px] text-slate-400">
                        <strong className="text-slate-300">Match Reason:</strong>{" "}
                        {s.reasons?.join("; ") || (s as any).match_reason}
                      </div>

                      {((s.compatibility_warnings && s.compatibility_warnings.length > 0) ||
                        ((s as any).warnings && (s as any).warnings.length > 0)) && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(s.compatibility_warnings || (s as any).warnings).map((w: any, idx: number) => (
                            <span
                              key={idx}
                              className="text-[10px] flex items-center space-x-1 text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded"
                            >
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span>{w.message}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-editor-border bg-editor-card/40 flex items-center justify-between">
          <button
            onClick={loadMatches}
            disabled={loading}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Re-scan Matches</span>
          </button>
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
