export interface VideoMetadata {
  filename: string;
  filepath: string;
  duration_sec: number;
  total_frames: number;
  fps: number;
  width: number;
  height: number;
  aspect_ratio: string;
  codec: string;
  bitrate_kbps?: number;
  file_size_mb: number;
  has_audio: boolean;
  audio_codec?: string;
  audio_sample_rate?: number;
  audio_channels?: number;
}

export type ShotType = "extreme_wide" | "wide" | "medium" | "medium_close_up" | "close_up" | "extreme_close_up" | "unknown";

export interface CameraMotion {
  primary_motion: "static" | "pan_left" | "pan_right" | "tilt_up" | "tilt_down" | "zoom_in" | "zoom_out" | "handheld" | "complex_movement";
  motion_magnitude: number;
  pan_score: number;
  tilt_score: number;
  zoom_score: number;
  confidence: number;
  is_inferred: boolean;
  evidence: string;
}

export interface SpeedEstimation {
  speed_factor: number;
  label: "normal" | "slow_motion" | "speed_ramp_up" | "hyperlapse";
  motion_variance: number;
  confidence: number;
  is_inferred: boolean;
  evidence: string;
}

export interface ColorProfile {
  dominant_palette_hex: string[];
  temperature: "warm" | "cool" | "neutral";
  saturation_level: "monochrome" | "muted" | "natural" | "vibrant" | "stylized";
  contrast_ratio: number;
  mean_brightness: number;
  estimated_look: string;
  confidence: number;
  is_inferred: boolean;
}

export interface VisualSummary {
  description: string;
  shot_type: ShotType;
  subject_category: string;
  lighting_style: string;
  composition_notes: string;
  model_used: string;
  confidence: number;
  is_inferred: boolean;
}

export interface TextOverlay {
  text: string;
  confidence: number;
  category: "title" | "subtitle" | "lower_third" | "watermark" | "credit" | "other";
  bbox_normalized: number[]; // [ymin, xmin, ymax, xmax]
  timestamp_sec: number;
  is_inferred: boolean;
}

export interface AudioBeat {
  time_sec: number;
  frame_index: number;
  strength: number;
  is_downbeat: boolean;
}

export interface WordTimestamp {
  word: string;
  start_sec: number;
  end_sec: number;
  probability: number;
}

export interface SubtitleLine {
  id: string;
  start_sec: number;
  end_sec: number;
  text: string;
  confidence: number;
  words: WordTimestamp[];
  is_inferred: boolean;
}

export interface ClipItem {
  id: string;
  index: number;
  start_frame: number;
  end_frame: number;
  start_time: number;
  end_time: number;
  duration: number;
  thumbnail_url: string;
  representative_frame_url: string;
  boundary_confidence: number;
  detector_source: string;
  is_boundary_fact: boolean;
  transition_in: "cut" | "dissolve" | "fade_black" | "fade_white" | "wipe" | "none";
  transition_in_duration: number;
  transition_out: "cut" | "dissolve" | "fade_black" | "fade_white" | "wipe" | "none";
  transition_out_duration: number;
  camera_motion: CameraMotion;
  speed_estimation: SpeedEstimation;
  color_profile: ColorProfile;
  visual_summary: VisualSummary;
  text_overlays: TextOverlay[];
  is_repeated_footage: boolean;
  repeated_clip_id?: string;
  perceptual_hash?: string;
  beat_alignment_score: number;
  nearest_beat_delta_sec: number;
  user_modified: boolean;
}

export interface TimelineEvent {
  id: string;
  track_id: string;
  title: string;
  start_time: number;
  end_time: number;
  duration: number;
  event_type: "clip" | "transition" | "text" | "audio_speech" | "motion" | "color";
  data: Record<string, any>;
  confidence: number;
  is_inferred: boolean;
  evidence: string;
}

export interface TimelineTrack {
  id: string;
  type: "video" | "text" | "audio" | "effects";
  name: string;
  color: string;
  is_muted: boolean;
  is_locked: boolean;
  events: TimelineEvent[];
}

export interface AudioAnalysisSummary {
  has_audio: boolean;
  tempo_bpm: number;
  beat_count: number;
  beats: AudioBeat[];
  rms_energy_mean: number;
  speech_segments_count: number;
}

export interface UnifiedTimeline {
  project_id: string;
  video_metadata: VideoMetadata;
  total_duration_sec: number;
  fps: number;
  total_clips: number;
  clips: ClipItem[];
  tracks: TimelineTrack[];
  audio_analysis: AudioAnalysisSummary;
  transcript: SubtitleLine[];
  detected_facts_count: number;
  inferred_effects_count: number;
  overall_confidence_score: number;
  disclaimer: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  status: "created" | "uploading" | "uploaded" | "analyzing" | "completed" | "failed";
  video_filename?: string;
  video_path?: string;
  video_metadata?: VideoMetadata;
  timeline?: UnifiedTimeline;
  error_message?: string;
}

export interface JobStatus {
  id: string;
  project_id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  current_stage: number;
  stage_name: string;
  logs: string[];
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface HardwareInfo {
  cpu_count_physical: number;
  cpu_count_logical: number;
  cpu_percent: number;
  ram_total_gb: number;
  ram_available_gb: number;
  ram_used_percent: number;
  disk_total_gb: number;
  disk_free_gb: number;
  disk_used_percent: number;
  platform: string;
  device: string;
  cuda_available: boolean;
  ffmpeg_available: boolean;
}
