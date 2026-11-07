import { Project, UnifiedTimeline, JobStatus, HardwareInfo } from "./types";

const API_BASE = ""; // Relative path proxied by Next.js rewrites to http://127.0.0.1:8000

export async function createProject(name: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/api/projects`);
  if (!res.ok) throw new Error("Failed to list projects");
  return res.json();
}

export async function getProject(projectId: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}`);
  if (!res.ok) throw new Error("Failed to get project");
  return res.json();
}

export async function uploadVideo(projectId: string, file: File): Promise<{ project: Project }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/projects/${projectId}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function analyzeProject(projectId: string): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/analyze`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Analysis request failed" }));
    throw new Error(err.detail || "Analysis request failed");
  }
  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
  if (!res.ok) throw new Error("Failed to get job status");
  return res.json();
}

export async function cancelJob(jobId: string): Promise<void> {
  await fetch(`${API_BASE}/api/jobs/${jobId}/cancel`, { method: "POST" });
}

export async function getTimeline(projectId: string): Promise<UnifiedTimeline> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/timeline`);
  if (!res.ok) throw new Error("Timeline not ready or not found");
  return res.json();
}

export async function patchTimeline(
  projectId: string,
  patchData: { clips: any[] }
): Promise<UnifiedTimeline> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/timeline`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patchData),
  });
  if (!res.ok) throw new Error("Failed to update timeline");
  return res.json();
}

export function getExportUrl(projectId: string, format: "otio" | "edl" | "json" | "srt" | "csv"): string {
  return `${API_BASE}/api/projects/${projectId}/export?format=${format}`;
}

export async function getHardwareInfo(): Promise<HardwareInfo> {
  const res = await fetch(`${API_BASE}/api/system/hardware`);
  if (!res.ok) throw new Error("Failed to get hardware specs");
  return res.json();
}

export async function getModelsStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/system/models`);
  if (!res.ok) throw new Error("Failed to get model status");
  return res.json();
}
