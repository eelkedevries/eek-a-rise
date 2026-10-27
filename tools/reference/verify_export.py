"""Check a PNG ZIP exported by eek-a-rise, independently of the browser code.

Reads the frames, parameters.json and schedule.csv, and tests what the sequence is meant to be:
constant visual stimulation (every frame has the same mean, RMS contrast and amplitude spectrum,
within 8-bit rounding) with dynamic content (each image emerges and dissolves at the tag
frequency). Prints a JSON report and exits with status 1 if any check fails.

Usage: uv run verify_export.py path/to/eek-a-rise_<seed>.zip
"""
import csv
import io
import json
import sys
import zipfile

import numpy as np
from PIL import Image


def fixation_mask(size: int) -> np.ndarray:
    """The pixels of the optional fixation cross, as the page draws it."""
    mask = np.zeros((size, size), bool)
    c, arm = size // 2, int(np.floor(0.015 * size + 0.5))
    mask[c - 1:c + 1, c - arm:c + arm + 1] = True
    mask[c - arm:c + arm + 1, c - 1:c + 1] = True
    return mask


def peak_hz(x: np.ndarray, fs: float, f_min: float, f_max: float) -> float:
    n = 1 << 16
    p = np.abs(np.fft.rfft((x - x.mean()) * np.hanning(len(x)), n)) ** 2
    f = np.fft.rfftfreq(n, 1 / fs)
    m = (f >= f_min) & (f <= f_max)
    return float(f[m][np.argmax(p[m])])


def verify(path: str) -> dict:
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        folder = names[0].split("/")[0]
        params = json.loads(z.read(f"{folder}/parameters.json"))
        rows = list(csv.DictReader(io.StringIO(z.read(f"{folder}/schedule.csv").decode())))
        pngs = sorted(n for n in names if n.endswith(".png"))
        frames = np.stack([np.asarray(Image.open(io.BytesIO(z.read(n)))) for n in pngs]).astype(float) / 255

    size, fps, tag = params["image_size_px"], params["frame_rate_hz"], params["tag_frequency_hz"]
    keep = ~fixation_mask(size) if params["fixation_cross"] else np.ones((size, size), bool)
    values = frames[:, keep]
    means, sds = values.mean(1), values.std(1)

    # Amplitude spectra relative to the median spectrum (the cross, if drawn, is in every frame).
    amps = np.abs(np.fft.fft2(frames))
    ref = np.median(amps, axis=0)
    spectrum_dev = np.linalg.norm((amps - ref).reshape(len(frames), -1), axis=1) / np.linalg.norm(ref)

    # Content: correlation of every stimulus frame with the peak frame of its cycle.
    stim = [r for r in rows if r["segment"] == "stimulus"]
    peak_of = {}
    for r in stim:
        k = int(r["cycle"])
        if k not in peak_of or float(r["weight"]) > float(rows[peak_of[k]]["weight"]):
            peak_of[k] = int(r["frame"])
    sim = np.array([np.corrcoef(values[int(r["frame"])], values[peak_of[int(r["cycle"])]])[0, 1] for r in stim])
    minima = np.array([float(r["weight"]) == 0 for r in stim])
    high = np.array([float(r["weight"]) >= 0.95 * params["peak_weight"] for r in stim])

    clipped = params["clipped_share"]
    report = {
        "file": path,
        "frames": len(frames),
        "size_px": size,
        "mean_range": [round(float(means.min()), 6), round(float(means.max()), 6)],
        "rms_contrast_range": [round(float(sds.min()), 6), round(float(sds.max()), 6)],
        "amplitude_spectrum_max_rel_dev": round(float(spectrum_dev.max()), 5),
        "similarity_to_cycle_peak": {
            "near_peaks_min": round(float(sim[high].min()), 4),
            "at_minima_max_abs": round(float(np.abs(sim[minima]).max()), 4),
        },
        "content_peak_hz": round(peak_hz(sim, fps, tag / 4, min(fps / 2, 4 * tag)), 3),
        "tag_frequency_hz": tag,
        "clipped_share": clipped,
    }
    # 8-bit rounding moves the mean by far less than 1e-3 and the RMS contrast by far less than
    # 1 %; clipping adds to both, so the bounds widen with the reported clipped share.
    checks = {
        "frame count matches the schedule": len(frames) == len(rows) == params["frames"]["total"],
        "mean constant within 8-bit rounding": float(means.max() - means.min()) < 1e-3 + 2 * clipped,
        "RMS contrast constant within 1 %": float((sds.max() - sds.min()) / sds.mean()) < 0.01 + 20 * clipped,
        "amplitude spectrum constant within 2 %": float(spectrum_dev.max()) < 0.02 + 20 * clipped,
        "frames near each peak resemble the peak (r > 0.8)": float(sim[high].min()) > 0.8,
        "frames at each minimum do not (|r| < 0.5)": float(np.abs(sim[minima]).max()) < 0.5,
        "content changes at the tag frequency (within 5 %)": abs(report["content_peak_hz"] - tag) <= 0.05 * tag,
    }
    report["checks"] = checks
    report["passed"] = all(checks.values())
    return report


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    result = verify(sys.argv[1])
    print(json.dumps(result, indent=2))
    sys.exit(0 if result["passed"] else 1)
