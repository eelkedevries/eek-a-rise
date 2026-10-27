"""Reference implementation of the compound-face RISE stimuli of de Vries & Baldauf (2019).

de Vries, E., & Baldauf, D. (2019). Attentional weighting in the face processing network.
Journal of Cognitive Neuroscience, 31(10), 1573-1588. https://doi.org/10.1162/jocn_a_01428

RISE: Sadr, J., & Sinha, P. (2004). Object recognition and Random Image Structure Evolution.
Cognitive Science, 28, 259-287 (Section 2.1).

This module is the numerical reference for the browser implementation. The TypeScript port must
reproduce `spectrum`, `noise_phase`, `rise_target`, `rise_frame`, `spec_match` and `schedule`
on the golden data in ./golden (see make_golden.py). Randomness is always passed in as arrays,
so both implementations can be compared exactly. Values not reported in either paper are marked
ASSUMPTION; docs-dev/reference/primary_authoritative/specification.md is binding.
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass, field

import numpy as np

SIZE = 400
FPS = 60  # ASSUMPTION: inferred from the published clip (tags at 2.000 and 1.340 Hz at 60 frames/s)
EYE_ROWS = (0, 160)
MASK_ROWS = (160, 240)
MOUTH_ROWS = (240, 400)
F_EYES = 2.0
F_MOUTH = 4.0 / 3.0     # reported as 1.33 Hz
F_IDENTITY = 2.0 / 3.0  # reported as 0.66 Hz
BASELINE_S, STIMULUS_S, POST_S = 1.0, 4.5, 0.5
MASK_LOOP = 10          # ASSUMPTION: the clip's mask band repeats every 10 frames (6 Hz at 60 Hz)


# ------------------------------------------------------------------ Fourier helpers

def neg(a: np.ndarray) -> np.ndarray:
    """Value at frequency -k for every k (row-major index -k mod N)."""
    return np.roll(np.flip(a, (0, 1)), 1, (0, 1))


def half_plane(shape) -> np.ndarray:
    """True for one representative of every conjugate pair: row-major index <= index of -k."""
    idx = np.arange(np.prod(shape)).reshape(shape)
    return idx <= neg(idx)


def self_conjugate(shape) -> np.ndarray:
    ky, kx = np.indices(shape)
    return ((-ky) % shape[0] == ky) & ((-kx) % shape[1] == kx)


def antisymmetric(phase: np.ndarray) -> np.ndarray:
    """Force phi(-k) = -phi(k) (keep the half-plane value), so the inverse FFT is real.

    np.angle returns +pi for both members of a pair with a negative-real coefficient, which
    breaks antisymmetry once the phase is interpolated.
    """
    return np.where(half_plane(phase.shape), phase, -neg(phase))


def spectrum(img: np.ndarray):
    """(amplitude, antisymmetric phase) of a real image."""
    F = np.fft.fft2(img)
    return np.abs(F), antisymmetric(np.angle(F))


def from_spectrum(amp: np.ndarray, phase: np.ndarray) -> np.ndarray:
    return np.real(np.fft.ifft2(amp * np.exp(1j * phase)))


# ------------------------------------------------------------------ image preparation

def to_grey_square(img: np.ndarray, size: int = SIZE) -> np.ndarray:
    """RGB or grey array -> centre-cropped, resized grey image in [0, 1] (Rec. 601 luma)."""
    from PIL import Image
    a = np.asarray(img, float)
    if a.ndim == 3:
        a = a[..., :3] @ np.array([0.299, 0.587, 0.114])
    if a.max() > 1:
        a = a / 255.0
    h, w = a.shape
    s = min(h, w)
    a = a[(h - s) // 2:(h - s) // 2 + s, (w - s) // 2:(w - s) // 2 + s]
    return np.asarray(Image.fromarray(a).resize((size, size), Image.LANCZOS), float)


def on_mean_background(img: np.ndarray, face_mask: np.ndarray) -> np.ndarray:
    """Replace everything outside the face outline by the mean luminance inside it.

    ASSUMPTION: 'mean overall luminance of the image' is read as the mean inside the outline.
    """
    out = img.copy()
    out[~face_mask] = img[face_mask].mean()
    return out


def spec_match(images: list[np.ndarray]):
    """Impose the set-average amplitude spectrum on every image, keeping each phase.

    Equivalent to SHINE's specMatch without its 0-255 clipping. Equal amplitude spectra imply equal
    mean luminance (DC term) and equal RMS contrast (Parseval), so luminance is equated too.
    Returns (images, common amplitude spectrum).
    """
    amps, phases = zip(*(spectrum(im) for im in images))
    amp = np.mean(amps, axis=0)
    return [from_spectrum(amp, ph) for ph in phases], amp


# ------------------------------------------------------------------ RISE

def noise_phase(u: np.ndarray) -> np.ndarray:
    """Random phase spectrum from a uniform noise image u (values in [0, 1))."""
    return antisymmetric(np.angle(np.fft.fft2(u)))


def rise_target(src_phase: np.ndarray, rand_phase: np.ndarray, r: np.ndarray) -> np.ndarray:
    """End-point phase for RISE (Sadr & Sinha, 2004, Section 2.1).

    r is a uniform array in [0, 1). The component pairs with r(k) + r(-k) < 1 (half of them on
    average) get rand_phase + 2*pi*sign(src_phase), so the target has the sign of the source phase.
    The end-point image is unchanged (phase is modulo 2*pi), but linear interpolation no longer
    concentrates phases near zero mid-sequence, which would brighten the image corners and lower
    contrast elsewhere. DC and the other self-conjugate bins keep the source phase.
    """
    pick = (r + neg(r)) < 1.0
    target = rand_phase + pick * 2 * np.pi * np.sign(src_phase)
    fixed = self_conjugate(src_phase.shape)
    target[fixed] = src_phase[fixed]
    return antisymmetric(target)


def rise_frame(amp: np.ndarray, src_phase: np.ndarray, target: np.ndarray, a: float) -> np.ndarray:
    """a = 1: the source image; a = 0: noise with the source's amplitude spectrum."""
    return from_spectrum(amp, a * src_phase + (1.0 - a) * target)


def noise_path(start_phase: np.ndarray, target: np.ndarray, w: float) -> np.ndarray:
    """Phase on the path from one noise end-point to the next (target from rise_target)."""
    return antisymmetric((1.0 - w) * start_phase + w * target)


def monotonic_target(amp, src_phase, rand_phase, rng, n_levels=21, max_tries=30):
    """Redraw the 2*pi assignment until the distance to the source falls monotonically.

    Sadr & Sinha (2004) recommend this check. The end-point is kept so that consecutive cycles
    still share it. Returns (target, tries); tries = -1 means none passed within max_tries and the
    least non-monotonic assignment is returned. With a fixed end-point a strict pass is often
    impossible, because at low weights the frame is unrelated noise.
    """
    src_img = from_spectrum(amp, src_phase)
    levels = np.linspace(0, 1, n_levels)
    best, best_bad = None, np.inf
    for tries in range(1, max_tries + 1):
        target = rise_target(src_phase, rand_phase, rng.random(src_phase.shape))
        d = np.array([np.sqrt(((rise_frame(amp, src_phase, target, a) - src_img) ** 2).mean()) for a in levels])
        bad = np.clip(np.diff(d), 0, None).sum()
        if bad == 0:
            return target, tries
        if bad < best_bad:
            best, best_bad = target, bad
    return best, -1


# ------------------------------------------------------------------ frame schedule

def period_frames(f: float, fps: int = FPS) -> int:
    p = fps / f
    if abs(p - round(p)) > 1e-9:
        raise ValueError(f"{f} Hz is not a whole number of frames at {fps} frames/s")
    return int(round(p))


def weight(p: int, period: int, a_min: float = 0.0, a_max: float = 1.0) -> float:
    """Raised-cosine phase-interpolation weight at frame p of a cycle (a_min at p = 0).

    ASSUMPTION: the paper's 'sinusoidal visibility' is read as a sinusoidal interpolation weight
    from 0 to 1; the clip's duty cycle (face visible about a third of each cycle) supports this.
    """
    return a_min + (a_max - a_min) * (0.5 - 0.5 * np.cos(2 * np.pi * p / period))


def schedule(fps=FPS, f_eyes=F_EYES, f_mouth=F_MOUTH, f_identity=F_IDENTITY,
             baseline_s=BASELINE_S, stimulus_s=STIMULUS_S, post_s=POST_S, mask_loop=MASK_LOOP):
    """One row per frame. Integer frame arithmetic only, so every implementation agrees.

    Band columns: cycle (index of the image in that band's sequence), half ('on' while the weight
    rises, 'off' while it falls) and weight. Noise end-points: cycle k runs from R[k + 1] (on) to
    R[k + 2] (off); the baseline drifts from R[0] to R[1]; the post period from R[n + 1] to R[n + 2]
    (n = number of cycles in the band).
    """
    nb, ns, npost = (int(round(s * fps)) for s in (baseline_s, stimulus_s, post_s))
    pe, pm, pi_ = period_frames(f_eyes, fps), period_frames(f_mouth, fps), period_frames(f_identity, fps)
    rows = []
    for n in range(nb + ns + npost):
        row = {"frame": n, "time_s": n / fps, "mask_step": n % mask_loop}
        if n < nb:
            row.update(segment="baseline", stim_frame=-1, identity=-1, noise_w=n / nb)
            for b in ("eyes", "mouth"):
                row.update({f"{b}_cycle": -1, f"{b}_half": "", f"{b}_weight": 0.0})
        elif n < nb + ns:
            i = n - nb
            row.update(segment="stimulus", stim_frame=i, identity=i // pi_, noise_w=float("nan"))
            for b, P in (("eyes", pe), ("mouth", pm)):
                p = i % P
                row.update({f"{b}_cycle": i // P, f"{b}_half": "on" if 2 * p < P else "off",
                            f"{b}_weight": float(weight(p, P))})
        else:
            j = n - nb - ns
            row.update(segment="post", stim_frame=-1, identity=-1, noise_w=(j + 1) / npost)
            for b in ("eyes", "mouth"):
                row.update({f"{b}_cycle": -1, f"{b}_half": "", f"{b}_weight": 0.0})
        rows.append(row)
    return rows


# ------------------------------------------------------------------ composite trial

@dataclass
class Trial:
    eye_images: list[np.ndarray]     # one per eye cycle: 9 for 4.5 s at 2 Hz (3 per identity)
    mouth_images: list[np.ndarray]   # one per mouth cycle: 6 for 4.5 s at 1.33 Hz (2 per identity)
    cue: str = "E"                   # 'P' identity, 'E' eyes, 'M' mouth, '' none
    seed: int = 1
    a_min: float = 0.0
    a_max: float = 1.0
    monotonic: bool = False          # Sadr & Sinha's check; not reported for the study, and slow
    frames: np.ndarray = field(init=False, repr=False)
    tries: list = field(init=False, default_factory=list)
    clipped: float = field(init=False, default=0.0)

    def render(self) -> np.ndarray:
        rng = np.random.default_rng(self.seed)
        rows = schedule()
        n_eye = 1 + max(r["eyes_cycle"] for r in rows)
        n_mouth = 1 + max(r["mouth_cycle"] for r in rows)
        if len(self.eye_images) != n_eye or len(self.mouth_images) != n_mouth:
            raise ValueError(f"need {n_eye} eye and {n_mouth} mouth images")
        eq, amp = spec_match(self.eye_images + self.mouth_images)
        bands = {}
        for name, images in (("eyes", eq[:n_eye]), ("mouth", eq[n_eye:])):
            bands[name] = self._band(rows, name, images, amp, rng)
        mask = self._mask(rows, amp, rng)
        e0, e1 = EYE_ROWS
        k0, k1 = MASK_ROWS
        m0, m1 = MOUTH_ROWS
        self.frames = np.concatenate([bands["eyes"][:, e0:e1], mask[:, k0:k1], bands["mouth"][:, m0:m1]], axis=1)
        return self.frames

    def _band(self, rows, name, images, amp, rng):
        """ASSUMPTION: a new random end-point per half cycle (the clip shows new noise at every
        minimum, and fade-in and fade-out are not mirror images). With equal amplitude spectra the
        pure-noise frames do not depend on the image, so cycles join seamlessly when a_min = 0."""
        n = len(images)
        R = [noise_phase(rng.random((SIZE, SIZE))) for _ in range(n + 3)]
        src = [spectrum(im)[1] for im in images]

        def target(k, rp):
            if self.monotonic:
                t, tries = monotonic_target(amp, src[k], rp, rng)
                self.tries.append(tries)
                return t
            return rise_target(src[k], rp, rng.random(rp.shape))

        t_on = [target(k, R[k + 1]) for k in range(n)]
        t_off = [target(k, R[k + 2]) for k in range(n)]
        t_base = rise_target(R[0], R[1], rng.random(R[0].shape))
        t_post = rise_target(R[n + 1], R[n + 2], rng.random(R[0].shape))
        out = np.empty((len(rows), SIZE, SIZE))
        for row in rows:
            f = row["frame"]
            if row["segment"] == "baseline":
                out[f] = from_spectrum(amp, noise_path(R[0], t_base, row["noise_w"]))
            elif row["segment"] == "post":
                out[f] = from_spectrum(amp, noise_path(R[n + 1], t_post, row["noise_w"]))
            else:
                k = row[f"{name}_cycle"]
                a = self.a_min + (self.a_max - self.a_min) * row[f"{name}_weight"]
                out[f] = rise_frame(amp, src[k], t_on[k] if row[f"{name}_half"] == "on" else t_off[k], a)
        return out

    def _mask(self, rows, amp, rng):
        """Dynamic RISE mask looping every MASK_LOOP frames: each component rotates by +/-2*pi."""
        R = noise_phase(rng.random((SIZE, SIZE)))
        step = antisymmetric(np.sign(noise_phase(rng.random((SIZE, SIZE)))) * 2 * np.pi / MASK_LOOP)
        return np.stack([from_spectrum(amp, R + row["mask_step"] * step) for row in rows])

    def to_uint8(self) -> np.ndarray:
        """round(clamp(v, 0, 1) * 255) with fixation cross and cue; self.clipped is the clipped fraction."""
        self.clipped = float(((self.frames < 0) | (self.frames > 1)).mean())
        out = (np.clip(self.frames, 0, 1) * 255).round().astype(np.uint8)
        draw_fixation(out, self.cue)
        return out


def draw_fixation(frames: np.ndarray, cue: str):
    """Black fixation cross at the centre and the cue letter 20 px below it (in the mask band)."""
    from PIL import Image, ImageDraw, ImageFont
    font = ImageFont.load_default(size=14)
    c = SIZE // 2
    for i in range(len(frames)):
        im = Image.fromarray(frames[i])
        d = ImageDraw.Draw(im)
        d.line([(c - 6, c), (c + 6, c)], fill=0, width=2)
        d.line([(c, c - 6), (c, c + 6)], fill=0, width=2)
        if cue:
            d.text((c, c + 20), cue, fill=0, font=font, anchor="mm")
        frames[i] = np.asarray(im)


def write_mp4(frames: np.ndarray, path: str, fps: int = FPS):
    """H.264 at the stimulus frame rate (the published clip plays at 50/60 speed)."""
    h, w = frames.shape[1:]
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{w}x{h}",
           "-r", str(fps), "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "12",
           "-pix_fmt", "yuv420p", path]
    subprocess.run(cmd, input=frames.tobytes(), check=True)
