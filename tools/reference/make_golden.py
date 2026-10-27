"""Write golden test data for the TypeScript port into ./golden.

Inputs are stored exactly: images as uint8, uniform random arrays as uint32 (value = x / 2**32,
which a float64 represents exactly). Expected outputs are float64 ('f64') or float32 ('f32'),
little-endian, row-major. golden/manifest.json lists every case, its files, shapes, dtypes and the
tolerance the port must meet. Usage: uv run make_golden.py
"""
import csv
import json
from pathlib import Path

import numpy as np

import rise_reference as rr

OUT = Path(__file__).parent / "golden"
rng = np.random.default_rng(20191001)
manifest = {"format": "little-endian, row-major; uniform = uint32 / 2**32", "cases": []}


def save(name, arr, dtype):
    arr = np.ascontiguousarray(arr, dtype=dtype)
    arr.tofile(OUT / f"{name}.{np.dtype(dtype).name}")
    return {"file": f"{name}.{np.dtype(dtype).name}", "dtype": np.dtype(dtype).name, "shape": list(arr.shape)}


def uniform(shape):
    x = rng.integers(0, 2**32, size=shape, dtype=np.uint64).astype(np.uint32)
    return x, x.astype(np.float64) / 2**32


def smooth_image(shape):
    """Natural-looking test image (1/f noise) as uint8."""
    fy, fx = np.meshgrid(np.fft.fftfreq(shape[0]), np.fft.fftfreq(shape[1]), indexing="ij")
    f = np.real(np.fft.ifft2(np.fft.fft2(rng.normal(size=shape)) / np.maximum(np.hypot(fx, fy), 1 / max(shape))))
    f = (f - f.mean()) / f.std() * 40 + 128
    return np.clip(f, 0, 255).round().astype(np.uint8)


def case(name, description, tolerance, **files):
    manifest["cases"].append({"name": name, "description": description, "tolerance": tolerance, "files": files})


OUT.mkdir(exist_ok=True)

# 1. FFT at the stimulus size and at sizes with factors 3 and a prime
for shape, tag in (((400, 400), "fft_400"), ((45, 60), "fft_45x60"), ((13, 17), "fft_13x17")):
    img = smooth_image(shape)
    F = np.fft.fft2(img.astype(np.float64))
    dt = np.float32 if tag == "fft_400" else np.float64
    case(tag, f"fft2 of a uint8 image {shape}; numpy.fft.fft2 convention (no scaling forward)",
         {"max_abs_over_max_abs": 1e-6} if tag == "fft_400" else {"max_abs_over_max_abs": 1e-10},
         input=save(f"{tag}_in", img, np.uint8), re=save(f"{tag}_re", F.real, dt), im=save(f"{tag}_im", F.imag, dt))

# 2. spectrum and RISE frames at 200 x 200
img = smooth_image((200, 200))
u_x, u = uniform((200, 200))
r_x, r = uniform((200, 200))
amp, src = rr.spectrum(img.astype(np.float64))
R = rr.noise_phase(u)
target = rr.rise_target(src, R, r)
naive = rr.rise_target(src, R, np.ones_like(r))  # no 2*pi shifts: r(k) + r(-k) = 2
levels = [0.0, 0.25, 0.5, 0.75, 1.0]
frames = np.stack([rr.rise_frame(amp, src, target, a) for a in levels])
case("rise_200", "spectrum -> noise_phase(u) -> rise_target(src, R, r) -> rise_frame at weights "
     f"{levels}; plus the naive target (r = 1 everywhere) at 0.5",
     {"max_abs": 1e-9}, input=save("rise_200_in", img, np.uint8), u=save("rise_200_u", u_x, np.uint32),
     r=save("rise_200_r", r_x, np.uint32), weights={"values": levels},
     frames=save("rise_200_frames", frames, np.float64),
     naive_frame_0p5=save("rise_200_naive_0p5", rr.rise_frame(amp, src, naive, 0.5), np.float64),
     amplitude=save("rise_200_amp", amp, np.float64))

# 3. spectrum matching of three images (64 x 64)
imgs = [smooth_image((64, 64)) for _ in range(3)]
eq, amp3 = rr.spec_match([im.astype(np.float64) for im in imgs])
case("spec_match_64", "spec_match of three uint8 images: set-average amplitude, own phase",
     {"max_abs": 1e-9}, inputs=save("spec_match_64_in", np.stack(imgs), np.uint8),
     outputs=save("spec_match_64_out", np.stack(eq), np.float64), amplitude=save("spec_match_64_amp", amp3, np.float64))

# 4. noise path between two end-points and the looping mask (64 x 64, amplitude from case 3)
u0_x, u0 = uniform((64, 64))
u1_x, u1 = uniform((64, 64))
rp_x, rp = uniform((64, 64))
R0, R1 = rr.noise_phase(u0), rr.noise_phase(u1)
t = rr.rise_target(R0, R1, rp)
path = np.stack([rr.from_spectrum(amp3, rr.noise_path(R0, t, w)) for w in (0.0, 0.5, 1.0)])
us_x, us = uniform((64, 64))
step = rr.antisymmetric(np.sign(rr.noise_phase(us)) * 2 * np.pi / rr.MASK_LOOP)
mask = np.stack([rr.from_spectrum(amp3, R0 + j * step) for j in range(rr.MASK_LOOP + 1)])
case("noise_and_mask_64", "noise_path(R0, rise_target(R0, R1, r), w) for w in [0, 0.5, 1]; mask frames "
     "R0 + j * step for j = 0..10 with step = antisymmetric(sign(noise_phase(us)) * 2*pi/10); "
     "frame 10 equals frame 0", {"max_abs": 1e-9}, amplitude=save("noise_and_mask_64_amp", amp3, np.float64),
     u0=save("noise_and_mask_64_u0", u0_x, np.uint32), u1=save("noise_and_mask_64_u1", u1_x, np.uint32),
     r=save("noise_and_mask_64_r", rp_x, np.uint32), us=save("noise_and_mask_64_us", us_x, np.uint32),
     path=save("noise_and_mask_64_path", path, np.float64), mask=save("noise_and_mask_64_mask", mask, np.float64))

# 5. default frame schedule
rows = rr.schedule()
with open(OUT / "schedule_default.csv", "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(rows[0]), lineterminator="\n")
    w.writeheader()
    for row in rows:
        w.writerow({k: (f"{v:.12f}" if isinstance(v, float) else v) for k, v in row.items()})
case("schedule_default", "rise_reference.schedule() with the paper's defaults at 60 frames/s",
     {"weights_max_abs": 1e-12, "other_columns": "exact"}, csv={"file": "schedule_default.csv"})

(OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"wrote {len(manifest['cases'])} cases, {sum(p.stat().st_size for p in OUT.iterdir()) / 1e6:.2f} MB")
