"""
FAMONEMEDIA Reverse AI - Local Model Downloader & Hardware Safety Verifier
Inspects CPU, RAM, and Disk Space before downloading open-source model weights.
Ensures zero paid APIs, zero GPU requirements, and CPU-only optimization.
"""

import sys
import os
import argparse
import urllib.request
import psutil
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "models"


def check_hardware_requirements(min_ram_gb: float = 2.0, min_disk_gb: float = 2.0) -> bool:
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage(str(PROJECT_ROOT))

    ram_avail_gb = mem.available / (1024**3)
    disk_free_gb = disk.free / (1024**3)

    print("=" * 60)
    print(" HARDWARE AUDIT BEFORE DOWNLOAD:")
    print(f" CPU Logical Cores:  {psutil.cpu_count(logical=True)}")
    print(f" Available RAM:      {ram_avail_gb:.2f} GB (Required: {min_ram_gb:.1f} GB)")
    print(f" Free Disk Space:    {disk_free_gb:.2f} GB (Required: {min_disk_gb:.1f} GB)")
    print("=" * 60)

    if ram_avail_gb < min_ram_gb:
        print(f"WARNING: Available RAM ({ram_avail_gb:.2f} GB) is less than recommended {min_ram_gb:.1f} GB.")
        return False

    if disk_free_gb < min_disk_gb:
        print(f"ERROR: Insufficient disk space ({disk_free_gb:.2f} GB free, need {min_disk_gb:.1f} GB).")
        return False

    return True


def download_transnetv2():
    target_dir = MODELS_DIR / "transnetv2"
    target_dir.mkdir(parents=True, exist_ok=True)
    target_file = target_dir / "transnetv2.onnx"

    if target_file.exists():
        print(f"[TransNetV2] Weights already exist at: {target_file}")
        return

    if not check_hardware_requirements(min_ram_gb=1.0, min_disk_gb=0.5):
        return

    # Direct community ONNX release for TransNetV2 CPU execution
    url = "https://github.com/warmshao/VideoFeatureExtraction/raw/master/models/transnetv2.onnx"
    print(f"[TransNetV2] Downloading ONNX weights (~40 MB) from {url}...")
    try:
        def reporthook(blocknum, blocksize, totalsize):
            readsofar = blocknum * blocksize
            if totalsize > 0:
                percent = readsofar * 1e2 / totalsize
                sys.stdout.write(f"\r  Progress: {percent:.1f}% ({readsofar/(1024*1024):.1f}MB)")
                sys.stdout.flush()

        urllib.request.urlretrieve(url, str(target_file), reporthook)
        print(f"\n[TransNetV2] Successfully downloaded to {target_file}")
    except Exception as e:
        print(f"\n[TransNetV2] Download encountered error: {e}")
        print("Note: PySceneDetect is already active as the guaranteed primary/fallback shot detector!")


def download_whisper(size: str = "tiny"):
    target_dir = MODELS_DIR / "whisper"
    target_dir.mkdir(parents=True, exist_ok=True)

    print(f"[Whisper] Pre-caching faster-whisper '{size}' model on CPU...")
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel(size, device="cpu", compute_type="int8", download_root=str(target_dir))
        print(f"[Whisper] Model '{size}' successfully downloaded and cached in {target_dir}")
    except Exception as e:
        print(f"[Whisper] Download error: {e}")


def download_qwen():
    print("[Qwen2.5-VL-3B] Checking hardware prerequisites...")
    if not check_hardware_requirements(min_ram_gb=6.0, min_disk_gb=8.0):
        print("Skipping Qwen2.5-VL download. The application's built-in CV Heuristic Visual Engine will run automatically on CPU without downloading 7GB weights.")
        return

    target_dir = MODELS_DIR / "qwen2.5-vl-3b"
    target_dir.mkdir(parents=True, exist_ok=True)

    print("[Qwen2.5-VL-3B] Downloading weights from HuggingFace (Qwen/Qwen2.5-VL-3B-Instruct)...")
    try:
        from huggingface_hub import snapshot_download
        snapshot_download(
            repo_id="Qwen/Qwen2.5-VL-3B-Instruct",
            local_dir=str(target_dir),
            local_dir_use_symlinks=False,
        )
        print(f"[Qwen2.5-VL-3B] Successfully downloaded to {target_dir}")
    except Exception as e:
        print(f"[Qwen2.5-VL-3B] Download failed: {e}")
        print("The application will seamlessly use the built-in Computer Vision Heuristic Visual Analyzer.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FAMONEMEDIA Reverse AI - Local Model Downloader")
    parser.add_argument("--model", choices=["transnetv2", "whisper", "qwen", "all"], default="all")
    parser.add_argument("--whisper-size", choices=["tiny", "base", "small"], default="tiny")
    args = parser.parse_args()

    print("FAMONEMEDIA Reverse AI - Local Model Downloader")
    if args.model in ["transnetv2", "all"]:
        download_transnetv2()
    if args.model in ["whisper", "all"]:
        download_whisper(args.whisper_size)
    if args.model in ["qwen", "all"]:
        download_qwen()
