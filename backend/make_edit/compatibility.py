"""
FAMONEMEDIA Make Your Edit - Compatibility Diagnostics Engine
Analyzes media replacements against target component requirements,
generating non-destructive warnings and actionable remedies.
"""

from __future__ import annotations
from typing import List, Optional
from backend.make_edit.models import ComponentItem, AssetLibraryItem, CompatibilityWarning


def evaluate_replacement_compatibility(
    component: ComponentItem,
    asset: AssetLibraryItem,
) -> List[CompatibilityWarning]:
    """
    Checks duration, aspect ratio, resolution, and effect compatibility.
    Never silently distorts or stretches media.
    """
    warnings: List[CompatibilityWarning] = []

    # 1. Type Compatibility Check
    target_types = component.compatible_replacement_types
    if asset.media_type not in target_types:
        warnings.append(
            CompatibilityWarning(
                code="INCOMPATIBLE_MEDIA_TYPE",
                severity="error",
                message=f"Media type '{asset.media_type}' is incompatible with {component.category} (requires: {', '.join(target_types)}).",
                suggested_action=f"Select an asset of type: {', '.join(target_types)}.",
            )
        )
        return warnings

    # 2. Duration Check for Video / Audio
    if asset.duration_sec is not None and asset.duration_sec > 0:
        target_dur = component.duration
        if asset.duration_sec < target_dur - 0.2:
            warnings.append(
                CompatibilityWarning(
                    code="DURATION_TOO_SHORT",
                    severity="warning",
                    message=(
                        f"Replacement asset duration ({asset.duration_sec:.2f}s) is shorter "
                        f"than the target shot duration ({target_dur:.2f}s)."
                    ),
                    suggested_action="Select 'Loop Media' or adjust playback speed to 0.8x to cover full shot duration.",
                )
            )
        elif asset.duration_sec > target_dur + 2.0:
            warnings.append(
                CompatibilityWarning(
                    code="DURATION_LONGER",
                    severity="info",
                    message=(
                        f"Replacement asset is longer ({asset.duration_sec:.2f}s vs {target_dur:.2f}s). "
                        "Media will be automatically trimmed at the cut boundary."
                    ),
                    suggested_action="Adjust 'Trim In' time in Inspector if you want to use a specific portion.",
                )
            )

    # 3. Aspect Ratio & Orientation Check for Video / Images
    if asset.width and asset.height and component.intrinsic_properties.get("width"):
        target_w = component.intrinsic_properties.get("width", 1920)
        target_h = component.intrinsic_properties.get("height", 1080)
        target_ratio = target_w / target_h if target_h > 0 else 1.777

        asset_ratio = asset.width / asset.height if asset.height > 0 else 1.777
        is_target_vertical = target_ratio < 0.9
        is_asset_vertical = asset_ratio < 0.9

        if is_target_vertical != is_asset_vertical:
            target_str = "9:16 (Vertical)" if is_target_vertical else "16:9 (Horizontal)"
            asset_str = "9:16 (Vertical)" if is_asset_vertical else "16:9 (Horizontal)"
            warnings.append(
                CompatibilityWarning(
                    code="ORIENTATION_MISMATCH",
                    severity="warning",
                    message=f"Orientation mismatch: asset is {asset_str} but target frame is {target_str}.",
                    suggested_action="Choose 'Center Crop' to fill canvas, or 'Fit with Pillarbox' to show full frame.",
                )
            )
        elif abs(target_ratio - asset_ratio) > 0.25:
            warnings.append(
                CompatibilityWarning(
                    code="ASPECT_RATIO_DIFFERENCE",
                    severity="info",
                    message=f"Aspect ratio differs slightly ({asset.aspect_ratio} vs {component.intrinsic_properties.get('aspect_ratio')}).",
                    suggested_action="Select 'Crop to Fill' or 'Fit (Letterbox)'. Never stretch.",
                )
            )

    # 4. Inferred Effect Notice
    if component.category == "effect" and component.is_inferred:
        warnings.append(
            CompatibilityWarning(
                code="INFERRED_EFFECT_METADATA",
                severity="info",
                message="This effect was inferred by statistical motion analysis. Effect metadata is retained.",
                suggested_action="Confirm in preview player whether motion corresponds to your creative intent.",
            )
        )

    return warnings
