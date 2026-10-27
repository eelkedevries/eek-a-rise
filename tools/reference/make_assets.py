"""Synthetic demo faces, explanatory figures, a demo trial and a verification report.

Writes:
  demo-faces/*.png                      15 synthetic faces (no real people), 400 x 400 grey
  out/figures/*.png                     figures for the explainer and the docs
  out/demo_trial_60fps.mp4              one 6-s compound trial at the true 60 frames/s (the paper's layout)
  out/demo_sequence_60fps.mp4           one 6-s full-image sequence (the page's default)
  out/verification.json                 measured properties of the demo trial and the demo sequence
Usage: uv run make_assets.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage, stats
from skimage import data

import rise_reference as rr

HERE = Path(__file__).parent
FACES, OUT = HERE / "demo-faces", HERE / "out"
FIG = OUT / "figures"
FONT = ImageFont.load_default(size=13)

IDENTITIES = [
    dict(name="ida", rx=130, skin=170, brow=7, sep=52, dy=0),
    dict(name="ben", rx=118, skin=185, brow=5, sep=48, dy=5),
    dict(name="cas", rx=112, skin=160, brow=3, sep=47, dy=-3),
]
# order mirrors the published clip: 3 eye and 2 mouth expressions per identity
EYES = [["squeezed", "wide", "closed"], ["left-closed", "squeezed", "look-right"], ["right-closed", "closed", "look-left"]]
MOUTHS = [["smile", "smile-teeth"], ["neutral", "smile"], ["tongue", "smile-teeth"]]


def draw_face(idt: dict, eyes: str = "neutral", mouth: str = "neutral", ss: int = 4) -> np.ndarray:
    """Simple synthetic face with photographic-style shading and 1/f texture, in [0, 1]."""
    S = rr.SIZE * ss
    im, mask = Image.new("L", (S, S), 0), Image.new("L", (S, S), 0)
    d, dm = ImageDraw.Draw(im), ImageDraw.Draw(mask)
    P = lambda *v: [c * ss for c in v]
    cx, cy, rx, ry = 200, 215, idt["rx"], 182
    d.ellipse(P(cx - rx, cy - ry, cx + rx, cy + ry), fill=idt["skin"])
    dm.ellipse(P(cx - rx, cy - ry, cx + rx, cy + ry), fill=255)  # face outline only, as in the paper
    ey = 128 + idt["dy"]
    brow_up = {"wide": 12, "squeezed": -7}.get(eyes, 0)
    for side, ex in ((-1, cx - idt["sep"]), (1, cx + idt["sep"])):
        closed = eyes in ("closed", "squeezed") or (eyes == "left-closed" and side < 0) \
            or (eyes == "right-closed" and side > 0)
        by = ey - 32 - brow_up
        tilt = 5 if eyes == "squeezed" else -3
        d.line(P(ex - 27, by + (tilt if side < 0 else 0), ex + 27, by + (0 if side < 0 else tilt)),
               fill=55, width=idt["brow"] * ss)
        if closed:
            d.arc(P(ex - 22, ey - 10, ex + 22, ey + 8), 15, 165, fill=50, width=3 * ss)
            if eyes == "squeezed":
                for k in (-8, 0, 8):
                    d.line(P(ex + side * 24, ey + k / 2, ex + side * 36, ey + k), fill=95, width=2 * ss)
        else:
            h = 15 if eyes == "wide" else 10
            gx = {"look-right": 11, "look-left": -11}.get(eyes, 0)
            d.ellipse(P(ex - 22, ey - h, ex + 22, ey + h), fill=232, outline=70, width=2 * ss)
            d.ellipse(P(ex + gx - 9, ey - 9, ex + gx + 9, ey + 9), fill=75)
            d.ellipse(P(ex + gx - 4, ey - 4, ex + gx + 4, ey + 4), fill=20)
    d.line(P(cx, 160, cx - 6, 225), fill=idt["skin"] - 35, width=3 * ss)
    for s in (-1, 1):
        d.ellipse(P(cx + s * 12 - 5, 228, cx + s * 12 + 5, 236), fill=idt["skin"] - 70)
    my = 318
    if mouth == "neutral":
        d.line(P(cx - 36, my, cx + 36, my), fill=80, width=5 * ss)
    elif mouth == "smile":
        d.arc(P(cx - 46, my - 34, cx + 46, my + 12), 20, 160, fill=80, width=5 * ss)
    elif mouth == "smile-teeth":
        d.pieslice(P(cx - 44, my - 24, cx + 44, my + 24), 0, 180, fill=236, outline=70, width=4 * ss)
    elif mouth == "tongue":
        d.ellipse(P(cx - 24, my - 14, cx + 24, my + 14), fill=40, outline=110, width=5 * ss)
        d.ellipse(P(cx - 15, my - 2, cx + 15, my + 38), fill=150, outline=110, width=2 * ss)
    im = np.asarray(im.resize((rr.SIZE, rr.SIZE), Image.LANCZOS), float) / 255
    mask = np.asarray(mask.resize((rr.SIZE, rr.SIZE), Image.LANCZOS)) > 127
    y, x = np.indices(im.shape)
    r2 = np.clip(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2, 0, 1)
    blob = lambda x0, y0, sx, sy: np.exp(-((x - x0) / sx) ** 2 / 2 - ((y - y0) / sy) ** 2 / 2)
    shade = 1.15 - 0.45 * r2 ** 1.5 - 0.12 * (x - cx) / rx - 0.08 * (y - cy) / ry
    for s in (-1, 1):
        shade -= 0.22 * blob(cx + s * idt["sep"], ey - 4, 26, 16)
        shade += 0.06 * blob(cx + s * 70, 250, 30, 25)
    shade -= 0.15 * blob(cx + 14, 200, 8, 30) + 0.25 * blob(cx, 392, 70, 18)
    rng = np.random.default_rng(sum(map(ord, eyes + mouth)) + idt["rx"])
    fy, fx = np.meshgrid(np.fft.fftfreq(rr.SIZE), np.fft.fftfreq(rr.SIZE), indexing="ij")
    pink = np.real(np.fft.ifft2(np.fft.fft2(rng.normal(size=im.shape)) / np.maximum(np.hypot(fx, fy), 1 / rr.SIZE)))
    im = ndimage.gaussian_filter(im * shade + pink / pink.std() * 0.035, 0.7)
    return rr.on_mean_background(im, mask)


def to8(x, lo=0.0, hi=1.0):
    return np.clip((x - lo) / (hi - lo) * 255, 0, 255).round().astype(np.uint8)


def label(arr, text):
    im = Image.fromarray(arr).convert("RGB")
    ImageDraw.Draw(im).text((6, 4), text, fill=(255, 60, 60), font=FONT)
    return im


def grid(tiles, cols, tile=200):
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tile, rows * tile), "white")
    for j, t in enumerate(tiles):
        sheet.paste(t.resize((tile, tile), Image.LANCZOS), ((j % cols) * tile, (j // cols) * tile))
    return sheet


def proxy(band):
    """Visibility proxy: excess kurtosis of a band-pass response (about 0 for phase noise)."""
    d = ndimage.gaussian_filter(band, 1) - ndimage.gaussian_filter(band, 4)
    return float(stats.kurtosis(d.ravel()))


def peak_hz(x, fs=rr.FPS):
    n = 16384
    p = np.abs(np.fft.rfft((x - x.mean()) * np.hanning(len(x)), n)) ** 2
    f = np.fft.rfftfreq(n, 1 / fs)
    m = (f > 0.3) & (f < 6)
    return float(f[m][np.argmax(p[m])])


def amp_at(x, f, fs=rr.FPS):
    x = x - x.mean()
    return float(2 * np.abs(np.mean(x * np.exp(-2j * np.pi * f * np.arange(len(x)) / fs))))


def scramble(img, rng):
    amp, src = rr.spectrum(img)
    return rr.from_spectrum(amp, rr.noise_phase(rng.random(img.shape)))


def figures():
    rng = np.random.default_rng(7)
    # RISE on a photograph: Sadr & Sinha target (top) against plain interpolation (bottom)
    img = rr.to_grey_square(data.chelsea())
    amp, src = rr.spectrum(img)
    R = rr.noise_phase(rng.random(img.shape))
    good, naive = rr.rise_target(src, R, rng.random(img.shape)), rr.rise_target(src, R, np.ones(img.shape))
    lo, hi = img.min() - 0.15, img.max() + 0.15
    levels = [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1.0]
    tiles = [label(to8(rr.rise_frame(amp, src, good, a), lo, hi), f"a = {a:.1f}") for a in levels]
    tiles += [label(to8(rr.rise_frame(amp, src, naive, a), lo, hi), f"plain, a = {a:.1f}") for a in levels]
    grid(tiles, len(levels)).save(FIG / "rise_photo_sadr_sinha_vs_plain.png")
    # chessboards: full board (stays periodic) and board on grey (irregular), same grey scale
    c = 0.5 / 3.8
    y, x = np.indices((400, 400))
    full = 0.5 + c * (2 * (((x // 50) + (y // 50)) % 2) - 1)
    ong = np.full((512, 512), 0.5)
    yy, xx = np.indices((320, 320))
    ong[96:416, 96:416] = 0.5 + c * (2 * (((xx // 40) + (yy // 40)) % 2) - 1)
    for name, board in (("chessboard_full", full), ("chessboard_on_grey", ong)):
        pair = np.concatenate([to8(board), np.full((board.shape[0], 12), 255, np.uint8), to8(scramble(board, rng))], 1)
        Image.fromarray(pair).save(FIG / f"{name}.png")
    # the page's default (circular) against the sign rule and plain interpolation, same noise (drawn after the chessboards, so earlier figures are unchanged)
    circ = rr.circular_target(src, R, rng.random(img.shape))
    rows3 = [("RISE", circ), ("sign rule", good), ("plain", naive)]
    tiles3 = [label(to8(rr.rise_frame(amp, src, t, a), lo, hi), f"{name}, a = {a:.1f}") for name, t in rows3 for a in levels]
    grid(tiles3, len(levels)).save(FIG / "rise_methods.png")
    # similarity to the source against the interpolation weight
    curve = {"weight": [round(a, 1) for a in np.linspace(0, 1, 11)], "circular": [], "sadr_sinha": [], "plain": []}
    for a in curve["weight"]:
        curve["circular"].append(round(float(np.corrcoef(rr.rise_frame(amp, src, circ, a).ravel(), img.ravel())[0, 1]), 3))
        curve["sadr_sinha"].append(round(float(np.corrcoef(rr.rise_frame(amp, src, good, a).ravel(), img.ravel())[0, 1]), 3))
        curve["plain"].append(round(float(np.corrcoef(rr.rise_frame(amp, src, naive, a).ravel(), img.ravel())[0, 1]), 3))
    return curve


def trial_and_checks():
    eye = [draw_face(IDENTITIES[i], eyes=e) for i in range(3) for e in EYES[i]]
    mouth = [draw_face(IDENTITIES[i], mouth=m) for i in range(3) for m in MOUTHS[i]]
    for i in range(3):
        for e in EYES[i]:
            Image.fromarray(to8(draw_face(IDENTITIES[i], eyes=e))).save(FACES / f"{IDENTITIES[i]['name']}_eyes_{e}.png")
        for m in MOUTHS[i]:
            Image.fromarray(to8(draw_face(IDENTITIES[i], mouth=m))).save(FACES / f"{IDENTITIES[i]['name']}_mouth_{m}.png")
    trial = rr.Trial(eye, mouth, cue="E", seed=3)
    fr = trial.render()
    u8 = trial.to_uint8()
    rr.write_mp4(u8, str(OUT / "demo_trial_60fps.mp4"))
    grid([label(u8[i], f"{i / rr.FPS:.2f} s") for i in range(60, 150, 3)], 10).save(FIG / "demo_trial_first_identity.png")

    rows = rr.schedule()
    e0, e1 = rr.EYE_ROWS
    m0, m1 = rr.MOUTH_ROWS
    stim = slice(60, 330)
    vis = {b: np.array([proxy(f[r0:r1]) for f in fr]) for b, (r0, r1) in (("eyes", (e0, e1)), ("mouth", (m0, m1)))}
    steps = np.abs(np.diff(fr, axis=0)).mean((1, 2))
    joins = [n for n in range(1, len(rows)) if rows[n]["segment"] != rows[n - 1]["segment"]
             or rows[n]["eyes_cycle"] != rows[n - 1]["eyes_cycle"] or rows[n]["mouth_cycle"] != rows[n - 1]["mouth_cycle"]]
    eq, amp = rr.spec_match(eye + mouth)
    src = rr.spectrum(eq[0])[1]
    tg = rr.rise_target(src, rr.noise_phase(np.random.default_rng(0).random(src.shape)), np.random.default_rng(1).random(src.shape))
    full = [rr.rise_frame(amp, src, tg, a) for a in np.linspace(0, 1, 11)]
    report = {
        "tag_frequency_hz": {b: round(peak_hz(vis[b][stim]), 3) for b in vis},
        "visibility_proxy_at_minima_max": round(float(max(vis["eyes"][60 + 30 * k] for k in range(10))), 3),
        "whole_image_mean_range": [round(min(f.mean() for f in full), 6), round(max(f.mean() for f in full), 6)],
        "whole_image_sd_range": [round(min(f.std() for f in full), 6), round(max(f.std() for f in full), 6)],
        "largest_step_at_joins_vs_median_step": [round(float(steps[[j - 1 for j in joins]].max()), 4), round(float(np.median(steps)), 4)],
        "share_of_cycle_visible_above_half_peak": {},
        "band_contrast_modulation_at_tag_pct": {},
        "band_mean_modulation_at_tag_pct": {},
        "pixels_outside_0_1": float(((fr < 0) | (fr > 1)).mean()),
    }
    for b, (r0, r1), f, P in (("eyes", (e0, e1), rr.F_EYES, 30), ("mouth", (m0, m1), rr.F_MOUTH, 45)):
        v = vis[b][stim]
        n = len(v) // P
        report["share_of_cycle_visible_above_half_peak"][b] = round(float(np.mean([(c > 0.5 * c.max()).mean() for c in v[:n * P].reshape(n, P)])), 3)
        sd, mu = fr[stim, r0:r1].std((1, 2)), fr[stim, r0:r1].mean((1, 2))
        report["band_contrast_modulation_at_tag_pct"][b] = round(100 * amp_at(sd, f) / sd.mean(), 2)
        report["band_mean_modulation_at_tag_pct"][b] = round(100 * amp_at(mu, f) / mu.mean(), 2)
    return report


def similarity(a, b):
    return float(np.corrcoef(a.ravel(), b.ravel())[0, 1])


def corner_z(frames):
    """Largest |z| (frame mean and SD) among the 3 x 3 pixels at each corner, over all frames."""
    z = (frames - frames.mean((1, 2), keepdims=True)) / frames.std((1, 2), keepdims=True)
    c = np.concatenate([z[:, :3, :3], z[:, :3, -3:], z[:, -3:, :3], z[:, -3:, -3:]], axis=1)
    return round(float(np.abs(c).max()), 1)


def sequence_and_checks():
    """The page's default: the nine eye images of the demo trial as whole faces, 2 Hz, one image per cycle."""
    images = [draw_face(IDENTITIES[i], eyes=e) for i in range(3) for e in EYES[i]]
    seq = rr.Sequence(images)
    fr = seq.render(np.random.default_rng(3).random)
    sign = rr.Sequence(images, method="sign").render(np.random.default_rng(3).random)
    rows = seq.schedule()
    eq, amp = rr.spec_match(images)
    u8 = (np.clip(fr, 0, 1) * 255).round().astype(np.uint8)
    rr.write_mp4(u8, str(OUT / "demo_sequence_60fps.mp4"))
    grid([label(u8[i], f"{i / rr.FPS:.2f} s") for i in range(60, 150, 3)], 10).save(FIG / "demo_sequence.png")

    src_of = lambda r: eq[r["image"]] if r["image"] >= 0 else None
    stim = [r for r in rows if r["segment"] == "stimulus"]
    sim = np.array([similarity(fr[r["frame"]], src_of(r)) for r in stim])
    q = u8.astype(float) / 255
    steps = np.abs(np.diff(fr, axis=0)).mean((1, 2))
    joins = [n for n in range(1, len(rows)) if rows[n]["segment"] != rows[n - 1]["segment"] or rows[n]["cycle"] != rows[n - 1]["cycle"]]
    spec_dev = [float(np.linalg.norm(np.abs(np.fft.fft2(f)) - amp) / np.linalg.norm(amp)) for f in fr]
    spec_dev8 = [float(np.linalg.norm(np.abs(np.fft.fft2(f)) - amp) / np.linalg.norm(amp)) for f in q]
    P = rr.period_frames(rr.F_EYES)
    n = len(sim) // P
    report = {
        "frames": len(rows),
        "float_mean_range": [float(fr.mean((1, 2)).min()), float(fr.mean((1, 2)).max())],
        "float_rms_range": [float(fr.std((1, 2)).min()), float(fr.std((1, 2)).max())],
        "float_amplitude_spectrum_max_rel_dev": max(spec_dev),
        "uint8_mean_range": [round(float(q.mean((1, 2)).min()), 6), round(float(q.mean((1, 2)).max()), 6)],
        "uint8_rms_range": [round(float(q.std((1, 2)).min()), 6), round(float(q.std((1, 2)).max()), 6)],
        "uint8_amplitude_spectrum_max_rel_dev": round(max(spec_dev8), 5),
        "similarity_to_source_at_peaks": [round(float(sim[k * P + P // 2]), 4) for k in range(n)],
        "similarity_to_source_at_minima_max_abs": round(float(np.abs(sim[::P]).max()), 3),
        "similarity_tag_frequency_hz": round(peak_hz(sim), 3),
        "share_of_cycle_with_similarity_above_half": round(float((sim > 0.5).mean()), 3),
        "largest_step_at_joins_vs_median_step": [round(float(steps[[j - 1 for j in joins]].max()), 4), round(float(np.median(steps)), 4)],
        "region_contrast_modulation_at_tag_pct": {},
        "pixels_outside_0_1": float(((fr < 0) | (fr > 1)).mean()),
        "pixels_outside_0_1_sign_rule": float(((sign < 0) | (sign > 1)).mean()),
        "corner_3x3_max_abs_z": {"circular": corner_z(fr), "sign_rule": corner_z(sign)},
    }
    s0, s1 = rows.index(stim[0]), rows.index(stim[-1]) + 1
    for name, (r0, r1) in (("upper_160_rows", (0, 160)), ("lower_160_rows", (240, 400))):
        sd = fr[s0:s1, r0:r1].std((1, 2))
        report["region_contrast_modulation_at_tag_pct"][name] = round(100 * amp_at(sd, rr.F_EYES) / sd.mean(), 2)
    return report


if __name__ == "__main__":
    for p in (FACES, OUT, FIG):
        p.mkdir(parents=True, exist_ok=True)
    rep = {"similarity_to_source_by_weight": figures(), "demo_trial": trial_and_checks(),
           "demo_sequence": sequence_and_checks()}
    (OUT / "verification.json").write_text(json.dumps(rep, indent=2))
    print(json.dumps(rep, indent=2))
