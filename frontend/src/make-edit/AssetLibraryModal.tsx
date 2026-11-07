"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  Film,
  Image as ImageIcon,
  Music,
  Trash2,
  Check,
  X,
  Search,
  Filter,
  AlertCircle,
  FileText,
  Clock,
  Maximize2,
} from "lucide-react";
import { AssetLibraryItem, ComponentItem } from "./types";
import { listAssets, uploadAsset, deleteAsset } from "./api";

interface AssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetComponent?: ComponentItem | null;
  onSelectForReplacement?: (asset: AssetLibraryItem) => void;
}

export const AssetLibraryModal: React.FC<AssetLibraryModalProps> = ({
  isOpen,
  onClose,
  targetComponent,
  onSelectForReplacement,
}) => {
  const [assets, setAssets] = useState<AssetLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "video" | "image" | "audio">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const items = await listAssets();
      setAssets(items);
    } catch (err: any) {
      console.error("Failed to load assets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadAssets();
      // Auto-filter based on targetComponent if provided
      if (targetComponent) {
        if (targetComponent.category === "video_clip") setFilterType("video");
        else if (targetComponent.category === "image_graphic") setFilterType("image");
        else if (targetComponent.category === "audio_component") setFilterType("audio");
        else setFilterType("all");
      }
    }
  }, [isOpen, targetComponent]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      let detectedType: "video" | "image" | "audio" = "video";
      if (file.type.startsWith("image/")) detectedType = "image";
      else if (file.type.startsWith("audio/")) detectedType = "audio";
      else if (file.type.startsWith("video/")) detectedType = "video";

      const uploaded = await uploadAsset(file, detectedType, file.name);
      setAssets((prev) => [uploaded, ...prev]);

      if (targetComponent && onSelectForReplacement) {
        onSelectForReplacement(uploaded);
        onClose();
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload asset");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this asset from the library?")) return;
    try {
      await deleteAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert("Failed to delete asset: " + err.message);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesType = filterType === "all" || asset.media_type === filterType;
    const name = asset.name || (asset as any).original_filename || (asset as any).label || "";
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-editor-panel border border-editor-border rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-editor-border flex items-center justify-between bg-editor-card/60">
          <div>
            <div className="flex items-center space-x-2">
              <Film className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-white tracking-wide">
                Asset Library & Replacement Manager
              </h2>
            </div>
            <p className="text-xs text-editor-muted mt-0.5">
              {targetComponent ? (
                <span>
                  Select or upload replacement media for{" "}
                  <strong className="text-purple-300 font-mono">
                    {targetComponent.title || (targetComponent as any).name}
                  </strong>{" "}
                  ({(targetComponent.duration ?? (targetComponent as any).duration_sec ?? 0).toFixed(2)}s)
                </span>
              ) : (
                "Upload and manage local video, audio, image and logo assets for your edits."
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-editor-hover transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-editor-border bg-editor-panel/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {(["all", "video", "image", "audio"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize font-medium transition ${
                  filterType === type
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "bg-editor-card text-slate-400 hover:text-white hover:bg-editor-hover border border-editor-border"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3 flex-1 max-w-sm ml-auto">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-editor-muted absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-editor-card border border-editor-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-editor-muted focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*,audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-medium px-3.5 py-1.5 rounded-lg shadow-md transition disabled:opacity-50 flex-shrink-0"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{uploading ? "Uploading..." : "Upload Media"}</span>
            </button>
          </div>
        </div>

        {uploadError && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center space-x-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Asset Grid */}
        <div className="p-6 flex-1 overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-editor-muted text-xs">
              Loading asset library...
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-editor-border rounded-xl">
              <UploadCloud className="w-10 h-10 text-editor-muted/60 mb-2" />
              <h3 className="text-sm font-semibold text-slate-300">No assets found</h3>
              <p className="text-xs text-editor-muted mt-1 max-w-sm">
                Upload your MP4, MOV, PNG, JPG, or WAV files to replace detected video clips,
                graphics, or audio tracks.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-lg transition"
              >
                Upload Your First File
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAssets.map((asset) => {
                const isSelected = false;
                const isTypeMatching =
                  !targetComponent ||
                  (targetComponent.category === "video_clip" && asset.media_type === "video") ||
                  (targetComponent.category === "image_graphic" && asset.media_type === "image") ||
                  (targetComponent.category === "audio_component" && asset.media_type === "audio");

                return (
                  <div
                    key={asset.id}
                    className={`group relative rounded-xl border bg-editor-card overflow-hidden flex flex-col transition hover:border-purple-500/60 hover:shadow-lg ${
                      isTypeMatching ? "border-editor-border" : "border-editor-border/40 opacity-70"
                    }`}
                  >
                    {/* Media Thumbnail / Icon */}
                    <div className="h-32 bg-black/60 relative flex items-center justify-center overflow-hidden">
                      {asset.media_type === "image" ? (
                        <img
                          src={`http://127.0.0.1:8000/api/make-edit/media?path=${encodeURIComponent(
                            asset.file_path
                          )}`}
                          alt={asset.name || (asset as any).label || "Asset"}
                          className="w-full h-full object-cover"
                        />
                      ) : asset.media_type === "video" ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/80 group-hover:bg-slate-900/60 transition">
                          <Film className="w-8 h-8 text-purple-400 mb-1" />
                          <span className="text-[10px] font-mono text-slate-400">
                            {asset.width && asset.height
                              ? `${asset.width}x${asset.height}`
                              : "VIDEO"}
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-950/40">
                          <Music className="w-8 h-8 text-indigo-400 mb-1" />
                          <span className="text-[10px] font-mono text-indigo-300">AUDIO</span>
                        </div>
                      )}

                      {/* Duration / Format Tag */}
                      {asset.duration_sec && (
                        <span className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-mono px-1.5 py-0.5 rounded text-white border border-white/10">
                          {asset.duration_sec.toFixed(1)}s
                        </span>
                      )}

                      {/* Type Badge */}
                      <span className="absolute top-2 left-2 bg-purple-900/80 text-purple-200 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-purple-500/30">
                        {asset.media_type}
                      </span>

                      {/* Quick Delete */}
                      <button
                        onClick={(e) => handleDelete(asset.id, e)}
                        className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-red-600/80 text-slate-400 hover:text-white rounded opacity-0 group-hover:opacity-100 transition"
                        title="Delete asset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Metadata */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div
                          className="text-xs font-semibold text-slate-200 truncate"
                          title={asset.name || (asset as any).original_filename}
                        >
                          {asset.name || (asset as any).original_filename}
                        </div>
                        <div className="text-[10px] text-editor-muted mt-0.5 flex items-center justify-between font-mono">
                          <span>{asset.file_size_mb ? `${asset.file_size_mb.toFixed(1)} MB` : "N/A"}</span>
                          {asset.aspect_ratio && <span>{asset.aspect_ratio}</span>}
                        </div>
                      </div>

                      {/* Target Component Action */}
                      {targetComponent && onSelectForReplacement && (
                        <button
                          onClick={() => {
                            onSelectForReplacement(asset);
                            onClose();
                          }}
                          className={`mt-2.5 w-full flex items-center justify-center space-x-1.5 text-xs font-medium py-1.5 rounded-lg transition ${
                            isTypeMatching
                              ? "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20"
                              : "bg-editor-hover hover:bg-editor-hover/80 text-slate-300"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Use as Replacement</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-editor-border bg-editor-card/40 flex items-center justify-between text-xs text-editor-muted">
          <span>{filteredAssets.length} asset(s) available</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-editor-hover hover:bg-editor-card border border-editor-border text-slate-300 hover:text-white rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
