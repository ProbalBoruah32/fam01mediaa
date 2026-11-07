export type ComponentCategory =
  | "video_clip"
  | "image_graphic"
  | "text_component"
  | "audio_component"
  | "transition"
  | "effect"
  | "timeline_metadata";

export type ComponentSubtype =
  | "cut_scene"
  | "repeated_footage"
  | "b_roll"
  | "logo_overlay"
  | "watermark"
  | "graphic_sticker"
  | "title_text"
  | "subtitle_text"
  | "lower_third_text"
  | "credit_text"
  | "general_caption"
  | "speech_dialogue"
  | "background_music"
  | "beat_grid"
  | "ambient_audio"
  | "hard_cut"
  | "cross_dissolve"
  | "fade_black"
  | "fade_white"
  | "directional_wipe"
  | "camera_pan"
  | "camera_tilt"
  | "camera_zoom"
  | "camera_shake"
  | "speed_change"
  | "color_treatment"
  | "stream_container";

export type ComponentStatus = "original" | "replaced" | "locked" | "uncertain" | "removed";

export type FitMode = "fit" | "crop" | "stretch" | "loop" | "keep_original";

export interface ReplacementData {
  asset_id?: string;
  media_url?: string;
  media_type?: "video" | "image" | "audio" | "font";
  original_filename?: string;
  replacement_text?: string;
  font_family?: string;
  font_size?: number;
  font_color?: string;
  trim_in: number;
  trim_out?: number;
  playback_speed: number;
  volume: number;
  opacity: number;
  fit_mode: FitMode;
  applied_at?: string;
}

export interface CompatibilityWarning {
  code: string;
  severity: "warning" | "error" | "info";
  message: string;
  suggested_action: string;
}

export interface ComponentItem {
  id: string;
  category: ComponentCategory;
  subtype: ComponentSubtype;
  title: string;
  description: string;
  start_time: number;
  end_time: number;
  duration: number;
  track_id: string;
  thumbnail_url?: string;
  preview_url?: string;
  status: ComponentStatus;
  is_replaceable: boolean;
  is_editable: boolean;
  is_locked: boolean;
  is_uncertain: boolean;
  is_inferred: boolean;
  confidence: number;
  evidence: string;
  source_timestamp: number;
  original_asset_ref?: string;
  compatible_replacement_types: Array<"video" | "image" | "audio" | "text">;
  intrinsic_properties: Record<string, any>;
  replacement?: ReplacementData;
  warnings: CompatibilityWarning[];
}

export interface AssetLibraryItem {
  id: string;
  name: string;
  media_type: "video" | "image" | "audio" | "font";
  file_path: string;
  file_url: string;
  file_size_mb: number;
  duration_sec?: number;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  channels?: number;
  sample_rate?: number;
  tags: string[];
  created_at: string;
}

export interface ComponentManifest {
  manifest_version: string;
  project_id: string;
  source_reverse_ai_project_id: string;
  created_at: string;
  updated_at: string;
  fps: number;
  width: number;
  height: number;
  aspect_ratio: string;
  total_duration_sec: number;
  total_components_count: number;
  category_counts: Record<string, number>;
  components: ComponentItem[];
}

export interface ProjectVersion {
  version_id: string;
  version_number: number;
  name: string;
  description: string;
  created_at: string;
  manifest_snapshot: ComponentManifest;
  replaced_count: number;
}

export interface MakeEditProject {
  id: string;
  name: string;
  reverse_ai_project_id: string;
  created_at: string;
  updated_at: string;
  manifest: ComponentManifest;
  active_version_number: number;
  versions: ProjectVersion[];
}

export interface MatchSuggestion {
  component_id: string;
  component_title: string;
  component_category: ComponentCategory;
  asset_id: string;
  asset_name: string;
  match_score: number;
  reasons: string[];
  compatibility_warnings: CompatibilityWarning[];
}

export interface RenderJob {
  id: string;
  project_id: string;
  status: "pending" | "rendering" | "completed" | "failed" | "cancelled";
  progress: number;
  stage: string;
  output_url?: string;
  output_filepath?: string;
  settings: Record<string, any>;
  logs: string[];
  error_message?: string;
  created_at: string;
  completed_at?: string;
}
