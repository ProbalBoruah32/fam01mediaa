"""
FAMONEMEDIA Make Your Edit - Smart Asset Suggestion & Matching Engine
Compares user-uploaded media against detected timeline components using duration,
orientation, aspect ratio, semantic category, and description keywords.
"""

from __future__ import annotations
from typing import List, Optional
from backend.make_edit.models import (
    AssetLibraryItem,
    ComponentManifest,
    MatchSuggestion,
)
from backend.make_edit.compatibility import evaluate_replacement_compatibility


def suggest_component_matches(
    asset: AssetLibraryItem,
    manifest: ComponentManifest,
    top_k: int = 5,
) -> List[MatchSuggestion]:
    """
    Ranks unreplaced components by suitability for the given replacement asset.
    """
    suggestions: List[MatchSuggestion] = []

    for comp in manifest.components:
        if not comp.is_replaceable or comp.is_locked:
            continue

        # Media type must be compatible
        if asset.media_type not in comp.compatible_replacement_types:
            continue

        score = 0.30
        reasons: List[str] = [f"Compatible media type ({asset.media_type})"]

        # 1. Duration proximity (for video and audio)
        if asset.duration_sec and comp.duration > 0:
            delta = abs(asset.duration_sec - comp.duration)
            ratio = delta / max(asset.duration_sec, comp.duration)
            if delta <= 0.5:
                score += 0.35
                reasons.append(f"Near-exact duration match ({asset.duration_sec:.1f}s vs {comp.duration:.1f}s)")
            elif delta <= 2.0:
                score += 0.25
                reasons.append(f"Close duration match ({delta:.1f}s difference)")
            elif ratio <= 0.5:
                score += 0.15
                reasons.append("Usable duration range")

        # 2. Aspect Ratio & Orientation match (for video and image)
        if asset.width and asset.height:
            asset_aspect = asset.width / asset.height
            target_w = comp.intrinsic_properties.get("width", 1920)
            target_h = comp.intrinsic_properties.get("height", 1080)
            target_aspect = target_w / target_h if target_h > 0 else 1.777

            is_asset_vert = asset_aspect < 0.95
            is_target_vert = target_aspect < 0.95

            if is_asset_vert == is_target_vert:
                score += 0.20
                orient_label = "Vertical (9:16)" if is_asset_vert else "Horizontal (16:9)"
                reasons.append(f"Matched {orient_label} camera orientation")
            else:
                score -= 0.10

        # 3. Semantic / keyword match
        asset_name_lower = asset.name.lower()
        comp_text = f"{comp.title} {comp.description}".lower()
        tags = [t.lower() for t in asset.tags] + [w for w in asset_name_lower.replace("_", " ").split() if len(w) > 3]

        matched_keywords = [t for t in tags if t in comp_text]
        if matched_keywords:
            score += 0.15
            reasons.append(f"Semantic keyword match: '{', '.join(matched_keywords[:2])}'")

        # 4. Prefer original/unreplaced components
        if comp.status == "original":
            score += 0.10

        score = max(0.1, min(0.99, score))

        warnings = evaluate_replacement_compatibility(comp, asset)

        suggestions.append(
            MatchSuggestion(
                component_id=comp.id,
                component_title=comp.title,
                component_category=comp.category,
                asset_id=asset.id,
                asset_name=asset.name,
                match_score=round(score, 2),
                reasons=reasons,
                compatibility_warnings=warnings,
            )
        )

    # Sort descending by match score
    suggestions.sort(key=lambda s: s.match_score, reverse=True)
    return suggestions[:top_k]
