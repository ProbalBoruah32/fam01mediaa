import {
  MakeEditProject,
  ComponentManifest,
  ComponentItem,
  AssetLibraryItem,
  MatchSuggestion,
  RenderJob,
  ProjectVersion,
} from "./types";

const API_BASE = "";

export async function createMakeEditProject(
  reverseAiProjectId: string,
  name: string = "My Custom Edit"
): Promise<MakeEditProject> {
  const res = await fetch(`${API_BASE}/api/make-edit/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, reverse_ai_project_id: reverseAiProjectId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to create project" }));
    throw new Error(err.detail || "Failed to create project");
  }
  return res.json();
}

export async function listMakeEditProjects(): Promise<MakeEditProject[]> {
  const res = await fetch(`${API_BASE}/api/make-edit/projects`);
  if (!res.ok) throw new Error("Failed to list Make Your Edit projects");
  return res.json();
}

export async function getMakeEditProject(id: string): Promise<MakeEditProject> {
  const res = await fetch(`${API_BASE}/api/make-edit/projects/${id}`);
  if (!res.ok) throw new Error("Failed to get Make Your Edit project");
  return res.json();
}

export async function replaceComponent(
  projectId: string,
  componentId: string,
  data: {
    replacement_type?: string;
    asset_id?: string;
    user_label?: string;
    replacement_text?: string;
    fit_mode?: string;
    trim_in?: number;
    trim_out?: number;
    volume?: number;
    playback_speed?: number;
    font_color?: string;
  }
): Promise<ComponentItem> {
  const res = await fetch(`${API_BASE}/api/make-edit/projects/${projectId}/replace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ component_id: componentId, ...data }),
  });
  if (!res.ok) throw new Error("Failed to apply replacement");
  return res.json();
}

export async function resetComponent(projectId: string, componentId: string): Promise<ComponentItem> {
  const res = await fetch(`${API_BASE}/api/make-edit/projects/${projectId}/reset/${componentId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to reset component to original");
  return res.json();
}

export async function removeComponent(projectId: string, componentId: string): Promise<ComponentItem> {
  const res = await fetch(`${API_BASE}/api/make-edit/projects/${projectId}/remove/${componentId}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to remove component");
  return res.json();
}

export async function bulkReplaceCategory(
  projectId: string,
  category: string,
  data: {
    asset_id?: string;
    fit_mode?: string;
    volume?: number;
  }
): Promise<ComponentItem[]> {
  const res = await fetch(`${API_BASE}/api/make-edit/projects/${projectId}/bulk-replace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, ...data }),
  });
  if (!res.ok) throw new Error("Failed to bulk replace category");
  return res.json();
}

export async function uploadAsset(
  file: File,
  mediaType: "video" | "image" | "audio" = "video",
  tags: string = "",
  projectId?: string
): Promise<AssetLibraryItem> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("media_type", mediaType);
  formData.append("tags", tags);

  const url = projectId
    ? `${API_BASE}/api/make-edit/projects/${projectId}/assets`
    : `${API_BASE}/api/make-edit/assets/upload`;

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload asset");
  return res.json();
}

export async function listAssets(
  mediaType?: string,
  projectId?: string
): Promise<AssetLibraryItem[]> {
  const query = mediaType ? `?media_type=${mediaType}` : "";
  const url = projectId
    ? `${API_BASE}/api/make-edit/projects/${projectId}/assets${query}`
    : `${API_BASE}/api/make-edit/assets${query}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to list assets");
  return res.json();
}

export async function deleteAsset(assetId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/make-edit/assets/${assetId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete asset");
}

export async function matchAssets(
  projectId: string,
  assetId?: string,
  topK: number = 5
): Promise<{ suggestions: MatchSuggestion[] }> {
  const res = await fetch(`${API_BASE}/api/make-edit/projects/${projectId}/match-assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset_id: assetId, top_k: topK }),
  });
  if (!res.ok) throw new Error("Failed to match assets");
  return res.json();
}

export async function createVersion(
  projectId: string,
  name: string,
  description?: string
): Promise<ProjectVersion> {
  const res = await fetch(`${API_BASE}/api/make-edit/projects/${projectId}/versions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error("Failed to create snapshot version");
  return res.json();
}

export async function restoreVersion(
  projectId: string,
  versionNumber: number
): Promise<MakeEditProject> {
  const res = await fetch(
    `${API_BASE}/api/make-edit/projects/${projectId}/versions/${versionNumber}/restore`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error("Failed to restore version snapshot");
  return res.json();
}

export async function startRender(
  projectId: string,
  options?: {
    aspect_ratio?: "16:9" | "9:16" | "1:1";
    preset?: "high" | "standard" | "draft";
    include_text_overlays?: boolean;
    include_audio?: boolean;
  }
): Promise<RenderJob> {
  const preset = options?.aspect_ratio || "16:9";
  const quality = options?.preset === "high" ? "high" : options?.preset === "draft" ? "fast_draft" : "medium";

  const res = await fetch(`${API_BASE}/api/make-edit/projects/${projectId}/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ preset, quality }),
  });
  if (!res.ok) throw new Error("Failed to trigger render");
  return res.json();
}

export async function getRenderStatus(projectId: string, jobId: string): Promise<RenderJob> {
  const res = await fetch(`${API_BASE}/api/make-edit/jobs/${jobId}`);
  if (!res.ok) throw new Error("Failed to get render status");
  return res.json();
}

export async function getRenderJob(jobId: string): Promise<RenderJob> {
  const res = await fetch(`${API_BASE}/api/make-edit/jobs/${jobId}`);
  if (!res.ok) throw new Error("Failed to get render job status");
  return res.json();
}

export async function getOpenCutFormat(projectId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/make-edit/projects/${projectId}/timeline`);
  if (!res.ok) throw new Error("Failed to get OpenCut timeline format");
  return res.json();
}

export function getOtioExportUrl(projectId: string): string {
  return `${API_BASE}/api/make-edit/projects/${projectId}/export-otio`;
}
