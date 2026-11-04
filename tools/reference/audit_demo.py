"""Measure the residual-noise demo and regenerate its explanatory figure.

Uses the committed, quantised demo images, NumPy FFTs and the Python reference.
Writes only to the ignored out/ directory; copy the figure after reviewing it.
Usage: python tools/reference/audit_demo.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import rise_reference as rr

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
OUT = HERE / "out"


def main():
    entries = json.loads((ROOT / "public/examples/manifest.json").read_text())
    images = [np.asarray(Image.open(HERE / "demo-faces" / e["file"]), float) / 255
              for e in entries if e["band"] == "eyes"]
    sequence = rr.Sequence(images, peak=rr.DEMO_PEAK)
    frames = sequence.render(np.random.default_rng(1).random)
    rows = sequence.schedule()
    matched, amp = rr.spec_match(images)
    pixels = np.floor(np.clip(frames, 0, 1) * 255 + 0.5).astype(np.uint8)
    means = frames.mean((1, 2))
    sds = frames.std((1, 2))
    outside = np.concatenate((frames[:, :, :24], frames[:, :, -24:]), axis=2)
    spectra = [np.linalg.norm(np.abs(np.fft.fft2(f)) - amp) / np.linalg.norm(amp) for f in frames]
    peak_rows = [r for r in rows if r["segment"] == "stimulus" and r["weight"] == rr.DEMO_PEAK]
    peak_sim = [float(np.corrcoef(frames[r["frame"]].ravel(), matched[r["image"]].ravel())[0, 1]) for r in peak_rows]
    report = {
        "implementation": "Python reference, NumPy FFT; browser seed stream differs",
        "peak_weight": rr.DEMO_PEAK,
        "images": len(images),
        "frames": len(frames),
        "float_mean_range": [float(means.min()), float(means.max())],
        "float_rms_range": [float(sds.min()), float(sds.max())],
        "float_spectrum_max_relative_error": max(spectra),
        "background_min_sd": float(outside.std((1, 2)).min()),
        "similarity_at_peaks": peak_sim,
        "clipped_share": float(np.count_nonzero((frames < 0) | (frames > 1)) / frames.size),
        "uint8_mean_range": [float(pixels.mean((1, 2)).min() / 255), float(pixels.mean((1, 2)).max() / 255)],
        "uint8_rms_range": [float(pixels.std((1, 2)).min() / 255), float(pixels.std((1, 2)).max() / 255)],
    }
    assert max(spectra) < 1e-9
    assert report["background_min_sd"] > 0.01
    assert min(peak_sim) > 0.5 and max(peak_sim) < 0.99
    assert np.ptp(means) < 1e-10 and np.ptp(sds) < 1e-10
    OUT.mkdir(exist_ok=True)
    sheet = Image.new("RGB", (2000, 600), "white")
    for j, n in enumerate(range(60, 150, 3)):
        tile = Image.fromarray(pixels[n]).convert("RGB").resize((200, 200), Image.Resampling.LANCZOS)
        ImageDraw.Draw(tile).text((4, 4), f"{n / 60:.2f} s", fill=(255, 60, 60))
        sheet.paste(tile, ((j % 10) * 200, (j // 10) * 200))
    sheet.save(OUT / "demo_sequence.webp", lossless=True)
    (OUT / "scientific_audit.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
