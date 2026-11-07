# Models Directory - FAMONEMEDIA Reverse AI

This directory houses local, offline open-source model weights. All inference executes entirely on Windows CPU hardware without paid API keys, external cloud calls, or GPU requirements.

---

## Directory Structure

```
models/
├── transnetv2/
│   └── transnetv2.onnx        # (Optional) Deep shot boundary detector weights (~40 MB)
├── whisper/
│   └── models--Systran--*     # Local faster-whisper int8 quantized models (~75 MB for tiny)
└── qwen2.5-vl-3b/
    ├── config.json            # (Optional) Multimodal visual understanding weights (~7 GB)
    └── *.safetensors
```

---

## Automated Downloader

Before downloading any model, our downloader script checks your CPU cores, free RAM, and disk space:

```powershell
# Run the downloader with hardware verification:
python scripts/download_models.py --model all
```

Or download specific components:
```powershell
python scripts/download_models.py --model transnetv2
python scripts/download_models.py --model whisper --whisper-size tiny
python scripts/download_models.py --model qwen
```

---

## Guaranteed CPU-Only Fallbacks

If any deep learning weight is not downloaded, FAMONEMEDIA Reverse AI never crashes, fabricates data, or fails:
1. **Shot Boundary Detection**: PySceneDetect (AdaptiveDetector + ContentDetector + ThresholdDetector) is automatically active.
2. **Visual Understanding**: The built-in Computer Vision Heuristic Visual Engine automatically extracts shot framing (Extreme Wide, Wide, Medium, Close-Up), lighting styles, subjects, and composition.
3. **On-Screen Text**: PP-OCRv4 / RapidOCR runs locally via ONNX Runtime CPU.
4. **Speech Transcription**: Faster-Whisper runs locally via CTranslate2 `int8` CPU quantization.
5. **Motion & Transitions**: OpenCV Farneback optical flow and color quantization run natively on CPU.
