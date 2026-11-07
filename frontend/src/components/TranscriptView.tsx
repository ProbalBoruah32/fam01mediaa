"use client";

import React, { useState } from "react";
import { FileText, Search, Play, Volume2, Sparkles, CheckCircle } from "lucide-react";
import { SubtitleLine } from "../lib/types";

interface TranscriptViewProps {
  transcript: SubtitleLine[];
  currentTime: number;
  onSeek: (time: number) => void;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  transcript,
  currentTime,
  onSeek,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = transcript.filter((sub) =>
    sub.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-editor-bg p-4 overflow-y-auto select-none space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-editor-border pb-3 gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span>Speech Dialogue Transcript</span>
          </h2>
          <p className="text-xs text-editor-muted">
            Transcribed with Whisper CPU int8 • Word-level timestamps & VAD filtering
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search dialogue words..."
            className="bg-editor-panel border border-editor-border text-xs text-white rounded-lg pl-9 pr-3 py-2 w-64 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Transcript Items */}
      {filtered.length === 0 ? (
        <div className="bg-editor-card border border-editor-border rounded-xl p-8 text-center text-editor-muted space-y-2">
          <Volume2 className="w-8 h-8 mx-auto text-slate-600" />
          <div className="text-sm font-semibold text-slate-400">No Spoken Dialogue Lines Found</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The reference audio track contains music, rhythmic beats, sound effects, or instrumental ambiance with no spoken speech.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((line) => {
            const isActive = currentTime >= line.start_sec && currentTime <= line.end_sec;
            return (
              <div
                key={line.id}
                onClick={() => onSeek(line.start_sec)}
                className={`bg-editor-card border rounded-xl p-3.5 cursor-pointer transition hover:border-emerald-500/60 shadow-md ${
                  isActive
                    ? "border-emerald-400 ring-2 ring-emerald-500/20 bg-emerald-950/20"
                    : "border-editor-border hover:bg-editor-panel/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <button
                      className={`flex items-center space-x-1 font-mono text-[11px] px-2 py-0.5 rounded border transition ${
                        isActive
                          ? "bg-emerald-500 text-black border-emerald-400 font-bold"
                          : "bg-editor-panel text-emerald-400 border-editor-border hover:bg-emerald-500/20"
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{line.start_sec.toFixed(2)}s - {line.end_sec.toFixed(2)}s</span>
                    </button>
                    <span className="text-[10px] text-editor-muted font-mono">{line.id}</span>
                  </div>

                  <span className="text-[10px] text-emerald-400 font-mono">
                    {(line.confidence * 100).toFixed(0)}% Conf
                  </span>
                </div>

                <div className="text-sm text-slate-200 font-medium leading-relaxed pl-1">
                  "{line.text}"
                </div>

                {/* Word Chips */}
                {line.words.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2 pl-1">
                    {line.words.map((w, wIdx) => (
                      <span
                        key={wIdx}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeek(w.start_sec);
                        }}
                        className="text-[10px] font-mono bg-editor-panel hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 px-1.5 py-0.2 rounded border border-editor-border transition"
                        title={`${w.start_sec}s - ${w.end_sec}s`}
                      >
                        {w.word}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
