import {
  EditorProject,
  ShotcutExportPackage,
  EditorRenderJob,
  UploadedMediaAsset,
  AspectRatioPreset,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function createEditorProject(
  name: string = "New Creative Project",
  aspect_ratio: AspectRatioPreset = "16:9"
): Promise<EditorProject> {
  const res = await fetch(`${BASE_URL}/api/editor/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, aspect_ratio }),
  });
  if (!res.ok) throw new Error("Failed to create editor project");
  return res.json();
}

export async function listEditorProjects(): Promise<EditorProject[]> {
  const res = await fetch(`${BASE_URL}/api/editor/projects`);
  if (!res.ok) throw new Error("Failed to list editor projects");
  return res.json();
}

export async function getEditorProject(id: string): Promise<EditorProject> {
  const res = await fetch(`${BASE_URL}/api/editor/projects/${id}`);
  if (!res.ok) throw new Error("Failed to fetch editor project");
  return res.json();
}

export async function saveEditorProject(
  id: string,
  project: EditorProject
): Promise<EditorProject> {
  const res = await fetch(`${BASE_URL}/api/editor/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  if (!res.ok) throw new Error("Failed to save editor project");
  return res.json();
}

export async function deleteEditorProject(id: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/editor/projects/${id}`, {
    method: "DELETE",
  });
  return res.ok;
}

export async function uploadEditorMedia(
  file: File,
  projectId?: string
): Promise<UploadedMediaAsset> {
  const formData = new FormData();
  formData.append("file", file);
  if (projectId) {
    formData.append("project_id", projectId);
  }
  const res = await fetch(`${BASE_URL}/api/editor/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload media");
  return res.json();
}

export async function importReverseProject(
  projectId: string,
  reverseProjId: string
): Promise<EditorProject> {
  const res = await fetch(
    `${BASE_URL}/api/editor/projects/${projectId}/import-reverse/${reverseProjId}`,
    {
      method: "POST",
    }
  );
  if (!res.ok) throw new Error("Failed to import Reverse AI project");
  return res.json();
}

export async function exportShotcutPackage(
  projectId: string
): Promise<ShotcutExportPackage> {
  const res = await fetch(
    `${BASE_URL}/api/editor/projects/${projectId}/export-shotcut`,
    {
      method: "POST",
    }
  );
  if (!res.ok) throw new Error("Failed to generate Shotcut export package");
  return res.json();
}

export async function duplicateEditorProject(
  id: string
): Promise<EditorProject> {
  const res = await fetch(`${BASE_URL}/api/editor/projects/${id}/duplicate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to duplicate editor project");
  return res.json();
}

export async function generateAutoCaptions(
  id: string
): Promise<EditorProject> {
  const res = await fetch(`${BASE_URL}/api/editor/projects/${id}/auto-captions`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to generate auto-captions");
  return res.json();
}

export async function startEditorRender(
  projectId: string,
  crf: number = 23,
  export_format: string = "mp4",
  resolution: string = "1080p",
  fps?: number
): Promise<EditorRenderJob> {
  const res = await fetch(
    `${BASE_URL}/api/editor/projects/${projectId}/render`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        crf,
        export_format,
        resolution,
        fps,
      }),
    }
  );
  if (!res.ok) throw new Error("Failed to start timeline render");
  return res.json();
}

export async function getEditorRenderJob(
  jobId: string
): Promise<EditorRenderJob> {
  const res = await fetch(`${BASE_URL}/api/editor/jobs/${jobId}`);
  if (!res.ok) throw new Error("Failed to poll render job");
  return res.json();
}
