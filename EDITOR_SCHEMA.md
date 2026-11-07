# FAMONEMEDIA Canonical Editor Schema Specification (V1)

## 1. Overview
The **FAMONEMEDIA Canonical Editor Schema (V1)** provides an unambiguous, versioned, multitrack timeline representation supporting high-fidelity non-linear editing (NLE) in the web browser, direct rendering via local CPU FFmpeg, and seamless format translation to OpenTimelineIO, OpenCut, and Shotcut MLT XML.

---

## 2. JSON Schema Definition

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FamonemediaEditorProjectV1",
  "type": "object",
  "required": ["version", "id", "name", "aspect_ratio", "width", "height", "fps", "tracks"],
  "properties": {
    "version": { "type": "string", "enum": ["1.0.0"] },
    "id": { "type": "string" },
    "name": { "type": "string" },
    "aspect_ratio": { "type": "string", "enum": ["16:9", "9:16", "1:1", "4:5", "21:9", "custom"] },
    "width": { "type": "integer", "minimum": 320, "maximum": 7680 },
    "height": { "type": "integer", "minimum": 240, "maximum": 4320 },
    "fps": { "type": "number", "minimum": 1.0, "maximum": 120.0 },
    "total_duration_sec": { "type": "number", "minimum": 0.0 },
    "tracks": {
      "type": "array",
      "items": { "$ref": "#/$defs/EditorTrack" }
    },
    "transitions": {
      "type": "array",
      "items": { "$ref": "#/$defs/EditorTransition" }
    },
    "markers": {
      "type": "array",
      "items": { "$ref": "#/$defs/TimelineMarker" }
    },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" }
  },
  "$defs": {
    "EditorTrack": {
      "type": "object",
      "required": ["id", "name", "type", "order", "clips"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "type": { "type": "string", "enum": ["video", "overlay", "text", "audio"] },
        "order": { "type": "integer" },
        "is_muted": { "type": "boolean", "default": false },
        "is_locked": { "type": "boolean", "default": false },
        "clips": {
          "type": "array",
          "items": { "$ref": "#/$defs/EditorClip" }
        }
      }
    },
    "EditorClip": {
      "type": "object",
      "required": ["id", "track_id", "name", "media_type", "start_time", "duration"],
      "properties": {
        "id": { "type": "string" },
        "track_id": { "type": "string" },
        "name": { "type": "string" },
        "media_type": { "type": "string", "enum": ["video", "image", "audio", "text"] },
        "file_path": { "type": ["string", "null"] },
        "media_url": { "type": ["string", "null"] },
        "start_time": { "type": "number", "minimum": 0.0 },
        "duration": { "type": "number", "minimum": 0.05 },
        "trim_in": { "type": "number", "default": 0.0 },
        "trim_out": { "type": ["number", "null"] },
        "speed": { "type": "number", "default": 1.0, "minimum": 0.1, "maximum": 100.0 },
        "volume": { "type": "number", "default": 1.0, "minimum": 0.0, "maximum": 5.0 },
        "is_muted": { "type": "boolean", "default": false },
        "transform": { "$ref": "#/$defs/ClipTransform" },
        "keyframes": {
          "type": "array",
          "items": { "$ref": "#/$defs/ClipKeyframe" }
        },
        "text_properties": { "$ref": "#/$defs/TextProperties" },
        "effects": {
          "type": "array",
          "items": { "$ref": "#/$defs/ClipEffect" }
        }
      }
    },
    "ClipTransform": {
      "type": "object",
      "properties": {
        "x": { "type": "number", "default": 0.0 },
        "y": { "type": "number", "default": 0.0 },
        "scale": { "type": "number", "default": 1.0 },
        "rotation": { "type": "number", "default": 0.0 },
        "opacity": { "type": "number", "default": 1.0, "minimum": 0.0, "maximum": 1.0 }
      }
    },
    "ClipKeyframe": {
      "type": "object",
      "required": ["time_offset", "property", "value", "easing"],
      "properties": {
        "time_offset": { "type": "number" },
        "property": { "type": "string", "enum": ["scale", "x", "y", "rotation", "opacity", "volume"] },
        "value": { "type": "number" },
        "easing": { "type": "string", "enum": ["linear", "ease_in", "ease_out", "ease_in_out", "bezier"] }
      }
    },
    "TextProperties": {
      "type": "object",
      "required": ["text"],
      "properties": {
        "text": { "type": "string" },
        "font_family": { "type": "string", "default": "Arial" },
        "font_size": { "type": "integer", "default": 48 },
        "font_color": { "type": "string", "default": "#ffffff" },
        "background_color": { "type": ["string", "null"] },
        "alignment": { "type": "string", "enum": ["left", "center", "right"], "default": "center" }
      }
    },
    "EditorTransition": {
      "type": "object",
      "required": ["id", "from_clip_id", "to_clip_id", "type", "duration"],
      "properties": {
        "id": { "type": "string" },
        "from_clip_id": { "type": "string" },
        "to_clip_id": { "type": "string" },
        "type": { "type": "string", "enum": ["cross_dissolve", "fade_black", "fade_white", "wipe_left", "wipe_right", "slide_left"] },
        "duration": { "type": "number", "default": 0.5 }
      }
    },
    "TimelineMarker": {
      "type": "object",
      "required": ["time", "label", "color"],
      "properties": {
        "time": { "type": "number" },
        "label": { "type": "string" },
        "color": { "type": "string", "default": "#00f2fe" }
      }
    }
  }
}
```
