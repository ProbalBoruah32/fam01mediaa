export type AspectRatioPreset = "16:9" | "9:16" | "1:1" | "4:5" | "21:9" | "custom";
export type MediaType = "video" | "image" | "audio" | "text";
export type TrackType = "video" | "audio" | "text" | "overlay";
export type EasingType = "linear" | "ease_in" | "ease_out" | "ease_in_out" | "bezier";

export interface ClipTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface ClipKeyframe {
  id?: string;
  time_offset: number; // Seconds from clip start
  property: "scale" | "x" | "y" | "rotation" | "opacity" | "volume";
  value: number;
  easing: EasingType;
}

export interface ColorAdjustments {
  brightness: number;    // -100 to +100
  contrast: number;      // 0.1 to 3.0 (1.0 default)
  saturation: number;    // 0.0 to 3.0 (1.0 default)
  temperature: number;   // -100 to +100 (Cool to Warm)
  tint: number;          // -100 to +100 (Green to Magenta)
  exposure: number;      // -2.0 to 2.0
  sharpen: number;       // 0.0 to 1.0
  vignette: number;      // 0.0 to 1.0
}

export interface ChromaKeySettings {
  enabled: boolean;
  target_color: string;  // Hex color e.g. "#00ff00"
  similarity: number;    // 0.0 to 1.0
  smoothness: number;    // 0.0 to 1.0
  spill: number;         // 0.0 to 1.0
}

export interface ClipAudioSettings {
  volume: number;
  fade_in: number;
  fade_out: number;
  is_muted: boolean;
  pitch_preserved: boolean;
}

export interface TextProperties {
  text: string;
  font_family: string;
  font_size: number;
  font_color: string;
  background_color?: string;
  alignment: "left" | "center" | "right";
  outline_color?: string;
  outline_width?: number;
  shadow_color?: string;
  shadow_blur?: number;
  animation?: string;
}

export interface ClipEffect {
  id: string;
  type: "blur" | "gaussian_blur" | "glow" | "glitch" | "rgb_split" | "film_grain" | "vignette" | "sharpen";
  intensity: number;
  is_enabled: boolean;
}

export interface EditorClip {
  id: string;
  track_id: string;
  name: string;
  media_type: MediaType;
  file_path?: string;
  media_url?: string;
  start_time: number;
  duration: number;
  trim_in: number;
  trim_out?: number;
  speed: number;
  is_reversed?: boolean;
  volume: number;
  is_muted: boolean;
  audio_settings?: ClipAudioSettings;
  transform: ClipTransform;
  keyframes?: ClipKeyframe[];
  color_adjustments?: ColorAdjustments;
  chroma_key?: ChromaKeySettings;
  text_properties?: TextProperties;
  effects?: ClipEffect[];
}

export interface EditorTransition {
  id: string;
  from_clip_id: string;
  to_clip_id: string;
  type: "cross_dissolve" | "fade_black" | "fade_white" | "wipe_left" | "wipe_right" | "slide_left" | "zoom_in" | "glitch";
  duration: number;
}

export interface TimelineMarker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export interface EditorTrack {
  id: string;
  name: string;
  type: TrackType;
  order: number;
  is_muted: boolean;
  is_locked: boolean;
  clips: EditorClip[];
}

export interface EditorProject {
  id: string;
  name: string;
  aspect_ratio: AspectRatioPreset;
  width: number;
  height: number;
  fps: number;
  total_duration_sec: number;
  tracks: EditorTrack[];
  transitions: EditorTransition[];
  markers?: TimelineMarker[];
  created_at: string;
  updated_at: string;
}

export interface ShotcutExportPackage {
  project_id: string;
  project_name: string;
  mlt_filename: string;
  zip_filename: string;
  mlt_download_url: string;
  zip_download_url: string;
  file_size_bytes: number;
  total_media_files: number;
  instructions: string[];
}

export interface EditorRenderJob {
  job_id: string;
  project_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  output_url?: string;
  created_at: string;
}

export interface UploadedMediaAsset {
  id: string;
  name: string;
  filename: string;
  file_path: string;
  media_url: string;
  media_type: MediaType;
  duration: number;
  width: number;
  height: number;
}
