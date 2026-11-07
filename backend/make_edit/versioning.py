"""
FAMONEMEDIA Make Your Edit - Project Versioning & Snapshot History
Saves, restores, and manages immutable version snapshots for non-destructive editing.
"""

from __future__ import annotations
import copy
from typing import List, Optional
from datetime import datetime
from backend.make_edit.models import (
    MakeEditProject,
    ProjectVersion,
    ComponentManifest,
)


def create_project_version(
    project: MakeEditProject,
    name: Optional[str] = None,
    description: Optional[str] = None,
) -> ProjectVersion:
    """
    Captures an immutable snapshot of the active manifest as a new version.
    """
    next_num = len(project.versions) + 1
    v_id = f"v{next_num:03d}"
    v_name = name or f"Version {next_num}"
    
    replaced_count = sum(1 for c in project.manifest.components if c.status == "replaced")
    
    version = ProjectVersion(
        version_id=v_id,
        version_number=next_num,
        name=v_name,
        description=description or f"Snapshot with {replaced_count} replaced components.",
        manifest_snapshot=copy.deepcopy(project.manifest),
        replaced_count=replaced_count,
    )
    
    project.versions.append(version)
    project.active_version_number = next_num
    project.updated_at = datetime.utcnow().isoformat()
    return version


def restore_project_version(
    project: MakeEditProject,
    version_number: int,
) -> MakeEditProject:
    """
    Restores an earlier version snapshot as the active manifest.
    """
    target = next((v for v in project.versions if v.version_number == version_number), None)
    if not target:
        raise ValueError(f"Version {version_number} not found in project {project.id}")

    # Set deep copy of snapshot as active manifest
    project.manifest = copy.deepcopy(target.manifest_snapshot)
    project.active_version_number = version_number
    project.updated_at = datetime.utcnow().isoformat()
    return project
