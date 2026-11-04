"""Prepare synthetic demo faces on a phase-noise surround, before RISE.

The raw mean-grey faces remain in demo-faces/ for reference. This example
preparation is an illustrative adaptation, not a recovered step of the study.
Usage: python tools/reference/make_textured_examples.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

import rise_reference as rr

HERE = Path(__file__).parent
ROOT = HERE.parent.parent


def main():
    entries = json.loads((ROOT / "public/examples/manifest.json").read_text())
    raw = [np.asarray(Image.open(HERE / "demo-faces" / e["file"]), float) / 255 for e in entries]
    _, amplitude = rr.spec_match(raw)
    noise = rr.from_spectrum(amplitude, rr.noise_phase(np.random.default_rng(20191001).random(raw[0].shape)))
    noise = (noise - noise.mean()) / noise.std()
    target = ROOT / "public/examples/faces"
    target.mkdir(parents=True, exist_ok=True)
    radii = {"ida": 130, "ben": 118, "cas": 112}
    y, x = np.indices(raw[0].shape)
    minimum = float("inf")
    for entry, image in zip(entries, raw):
        r = np.sqrt(((x - 200) / radii[entry["identity"]]) ** 2 + ((y - 215) / 182) ** 2)
        # Feather inward over the outer 10% of the ellipse. The mean-grey raw
        # surround never enters the prepared image; there is no hard oval edge.
        t = np.clip((1 - r) / 0.1, 0, 1)
        alpha = 0.5 - 0.5 * np.cos(np.pi * t)
        # Share the same noise pattern across expressions, avoiding a separate
        # expression-specific surround. Each raw face supplies its mean and SD.
        background = image[r < 0.9].mean() + image.std() * noise
        prepared = alpha * image + (1 - alpha) * background
        pixels = np.floor(np.clip(prepared, 0, 1) * 255 + 0.5).astype(np.uint8)
        Image.fromarray(pixels).save(target / entry["file"])
        outside = pixels[r >= 1].astype(float) / 255
        minimum = min(minimum, float(outside.std()))
        assert outside.std() > 0.02, entry["file"]
    print(json.dumps({"examples": len(entries), "minimum_surround_sd": minimum, "noise_seed": 20191001}))


if __name__ == "__main__":
    main()
