"""
FAMONEMEDIA Make Your Edit - Replacement Execution Engine
Applies, resets, and removes component replacements while strictly preserving
the original clip's timeline position, transitions, duration, speed, and layer order.
"""

from __future__ import annotations
from typing import List, Optional, Dict, Any
from datetime import datetime
from backend.make_edit.models import (
    ComponentItem,
    ComponentManifest,
    ReplacementData,
    AssetLibraryItem,
)
from backend.make_edit.compatibility import evaluate_replacement_compatibility


def apply_component_replacement(
    manifest: ComponentManifest,
    component_id: str,
    asset: Optional[AssetLibraryItem] = None,
    replacement_text: Optional[str] = None,
    fit_mode: str = "crop",
    trim_in: float = 0.0,
    trim_out: Optional[float] = None,
    volume: float = 1.0,
    playback_speed: float = 1.0,
    font_color: Optional[str] = None,
) -> ComponentItem:
    """
    Replaces content in target component while preserving all timeline timing and transitions.
    """
    comp = next((c for c in manifest.components if c.id == component_id), None)
    if not comp:
        raise ValueError(f"Component '{component_id}' not found in manifest")

    if not comp.is_replaceable or comp.is_locked:
        raise ValueError(f"Component '{component_id}' is locked or marked non-replaceable")

    # Construct replacement record
    rep_data = ReplacementData(
        asset_id=asset.id if asset else None,
        media_url=asset.file_url if asset else None,
        media_type=asset.media_type if asset else None,
        original_filename=asset.name if asset else None,
        replacement_text=replacement_text,
        font_color=font_color,
        trim_in=trim_in,
        trim_out=trim_out or (trim_in + comp.duration if asset and asset.duration_sec else None),
        playback_speed=playback_speed,
        volume=volume,
        fit_mode=fit_mode,  # type: ignore
        applied_at=datetime.utcnow().isoformat(),
    )

    comp.replacement = rep_data
    comp.status = "replaced"

    # Evaluate compatibility warnings
    if asset:
        comp.warnings = evaluate_replacement_compatibility(comp, asset)
    else:
        comp.warnings = []

    manifest.updated_at = datetime.utcnow().isoformat()
    return comp


def reset_component_to_original(
    manifest: ComponentManifest,
    component_id: str,
) -> ComponentItem:
    """Restores component to its original analyzed Reverse AI reference media."""
    comp = next((c for c in manifest.components if c.id == component_id), None)
    if not comp:
        raise ValueError(f"Component '{component_id}' not found in manifest")

    comp.replacement = None
    comp.status = "original"
    comp.warnings = []
    manifest.updated_at = datetime.utcnow().isoformat()
    return comp


def remove_component(
    manifest: ComponentManifest,
    component_id: str,
) -> ComponentItem:
    """Mutes/removes component from the rendered timeline while preserving track alignment."""
    comp = next((c for c in manifest.components if c.id == component_id), None)
    if not comp:
        raise ValueError(f"Component '{component_id}' not found in manifest")

    comp.status = "removed"
    manifest.updated_at = datetime.utcnow().isoformat()
    return comp


def bulk_replace_category(
    manifest: ComponentManifest,
    category: str,
    asset: AssetLibraryItem,
) -> List[ComponentItem]:
    """Replaces all unreplaced components of a specific category (e.g. all audio or all images)."""
    updated = []
    for comp in manifest.components:
        if comp.category == category and comp.is_replaceable and not comp.is_locked:
            apply_component_replacement(manifest, comp.id, asset=asset)
            updated.append(comp)
    return updated
