"use client";

import React, { useState } from "react";
import {
  X,
  Download,
  Film,
  Package,
  FileCode,
  CheckCircle2,
  ExternalLink,
  Loader2,
  FolderArchive,
} from "lucide-react";
import { EditorProject, ShotcutExportPackage } from "./types";
import { exportShotcutPackage } from "./api";

interface ShotcutExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: EditorProject;
}

export const ShotcutExportModal: React.FC<ShotcutExportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [pkg, setPkg] = useState<ShotcutExportPackage | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePackage = async () => {
    try {
      setLoading(true);
      const res = await exportShotcutPackage(project.id);
      setPkg(res);
    } catch (e) {
      alert("Failed to build Shotcut package");
    } finally {
      setLoading(false);
    }
  };

  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-editor-card border border-editor-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-editor-border px-6 flex items-center justify-between bg-editor-panel/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-600/30">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Shotcut Desktop Engine Export</h2>
              <p className="text-[10px] text-slate-400">Native MLT XML & Portable Media Bundle</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-editor-panel transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-cyan-300 flex items-start space-x-3">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-white">Universal Desktop Interchange: </span>
              Your multitrack timeline (tracks, trimmed cuts, speed, transforms, audio volume) compiles directly into standard Shotcut-compatible MLT XML.
            </div>
          </div>

          {!pkg ? (
            <div className="text-center py-6 space-y-4">
              <Package className="w-12 h-12 text-slate-600 mx-auto" />
              <div>
                <p className="font-semibold text-white text-sm">Ready to package &ldquo;{project.name}&rdquo;</p>
                <p className="text-slate-500 text-[11px] mt-1">
                  Resolution: {project.width}x{project.height} ({project.aspect_ratio}) • {project.fps} FPS
                </p>
              </div>
              <button
                onClick={handleGeneratePackage}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 flex items-center justify-center space-x-2 mx-auto transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Compiling MLT Project...</span>
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-4 h-4" />
                    <span>Generate Shotcut Bundle</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-editor-panel border border-editor-border space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Package File:</span>
                  <span className="font-mono text-cyan-300 font-bold">{pkg.zip_filename}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Archive Size:</span>
                  <span className="font-mono text-slate-200">{(pkg.file_size_bytes / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Included Media Files:</span>
                  <span className="font-mono text-slate-200">{pkg.total_media_files} file(s)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <a
                  href={`${BASE_URL}${pkg.zip_download_url}`}
                  download
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 flex items-center justify-center space-x-2 transition text-center"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .ZIP Bundle</span>
                </a>

                <a
                  href={`${BASE_URL}${pkg.mlt_download_url}`}
                  download
                  className="py-2.5 px-3 rounded-xl bg-editor-panel hover:bg-slate-700 border border-editor-border text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-2 transition text-center"
                >
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span>Download .MLT XML</span>
                </a>
              </div>

              {/* Instructions */}
              <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-[11px] space-y-1.5 text-slate-400">
                <p className="font-bold text-slate-200">How to open in Shotcut Desktop:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Extract the downloaded .zip archive to any folder.</li>
                  <li>Open Shotcut Desktop (free & open source).</li>
                  <li>Click File &rarr; Open File (Ctrl+O) and select the .mlt file.</li>
                  <li>All timeline cuts, audio levels, and media will load instantly!</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
