# Usage

The page at <https://eelkedevries.com/eek-a-rise/> has two modes under *Try it*.
Everything runs in the browser; images never leave the device.

## One image

Pick an example or use your own image (button or drag and drop). The image is
converted to grey (Rec. 601 luma), cropped to a centred square and shown at
400 × 400 px.

- **Weight** moves from noise (0) to the image (1).
- **Play** runs one emerge–dissolve cycle per second, frames chosen by elapsed
  time.
- **New noise** draws a new random phase spectrum; its seed is shown.
- **Method**: *RISE* (the default, see below), *Sign rule* (Sadr and Sinha's
  2π step read literally) or *Plain interpolation*. The last two brighten (and,
  for the sign rule, later darken) the image corners at intermediate weights.
- **Outline** sets everything outside a default ellipse to the mean grey inside it.
- The readouts show mean and RMS contrast (values from 0 to 1) of the source, of
  the frame before the display mapping, and of the 8-bit frame on the screen.

## Sequence

A sequence is: noise, then each image emerging from noise and dissolving into it
once per cycle, then noise again. Every frame has the same amplitude spectrum,
hence the same mean luminance and RMS contrast.

1. **Images, in order.** The nine eye-expression demo faces by default. Click a
   thumbnail to add it; reorder or remove with the arrows and ×; *Reset to demo
   set* restores the default. Cycle *k* shows image `floor(k / cycles per image)`,
   counting round the list.
2. **Preparation.** Image size (256 to 800 px) and an optional elliptical outline
   with adjustable centre and radii. All images are given the set-average
   amplitude spectrum when the sequence is built.
3. **Timing and method.** Each field is tagged with its source:

   | Parameter | Default | Source |
   |---|---|---|
   | Frame rate | 60 frames/s | inferred from the published clip |
   | Tag frequency | 2 Hz (30 frames) | paper (eye band) |
   | Cycles per image | 1 | paper (a new expression every eye cycle) |
   | Noise before, images, noise after | 1.0, 4.5, 0.5 s | paper |
   | Peak weight | 1 (the full image) | assumption, supported by the clip |
   | Method | RISE (circular target) | this project |
   | Mean and RMS contrast | the set's own | assumption |
   | Fixation cross | off | this project |
   | Seed | 1 | – |

   The page refuses settings that do not fit whole frames: the period
   `fps / tag frequency` must be a whole number of frames (at least 2), each
   duration must be a whole number of frames, and the image part must hold a
   whole number of cycles, so that the sequence starts and ends in noise and
   joins it without a jump. It suggests the nearest valid values.
4. **Schedule.** A timeline of the segments and cycles, coloured by image, with
   the interpolation weight.
5. **Build.** Rendering runs in a Web Worker with a progress bar and *Cancel*. The
   default sequence takes about 10 s on a laptop.

After the build, the player shows the sequence by elapsed time (play, step,
scrubber, loop) and measures the display's refresh rate. The plot shows, for
every frame, the similarity to the image of its cycle (Pearson correlation) and
the mean and RMS contrast as percentages from their averages; the line under it
summarises them.

## Downloads

- **PNG frames (ZIP):** `eek-a-rise_<seed>/frame_0000.png …`, 8-bit grey,
  lossless, with `parameters.json`, `schedule.csv`, `frame_stats.csv` and
  `README.txt`. Use these for research.
- **Video:** H.264 MP4 (VP9 WebM where H.264 encoding is unavailable), frame *n*
  at exactly *n* / fps. Compression changes pixel values, so the video is for
  viewing and sharing only.
- `parameters.json` and `schedule.csv` can also be downloaded on their own.

To check a ZIP independently: `cd tools/reference && uv run verify_export.py
path/to/eek-a-rise_<seed>.zip` (see `validation.md`). To check a video:
`bash scripts/verify-export.sh path/to/video.mp4 [frames] [fps]`.

## Research use

- **Frame rate.** Run the display at the sequence's frame rate (or a whole
  multiple of it, showing each frame for the same number of refreshes). The tag
  period is a whole number of frames by construction.
- **Presentation.** Load all frames as textures before the sequence starts, flip
  once per frame, log dropped frames, and verify the timing of the first frames
  with a photodiode (Bridges et al., 2020, found sub-millisecond precision for
  Psychtoolbox and PsychoPy in the lab, but display lag is invisible to software).
- **Gamma.** Mean and RMS contrast are equal in pixel values. On a screen they are
  equal in luminance only on a linearised (gamma-corrected) or measured display.
- **Background.** Present the frames on a background of the frames' mean grey
  (`parameters.json`, `measured.mean_range`), so that the edge of the image does
  not add a luminance step.
- **Local statistics.** Whole-image statistics are constant; the contrast of any
  region changes as the image emerges (about 7–10 % for the upper and lower
  160 rows of the demo faces). Analyse harmonics of the tag frequency, and
  consider controls such as phase-scrambled or inverted images.

The two loops below show the pattern. They were written for this page but not
run here; check them on your own set-up.

**PsychoPy**

```python
import json
from pathlib import Path
from psychopy import core, visual

folder = Path("eek-a-rise_1")
params = json.loads((folder / "parameters.json").read_text())
mean = sum(params["measured"]["mean_range"]) / 2
grey = 2 * mean - 1                                       # PsychoPy rgb runs from -1 to 1
win = visual.Window(fullscr=True, units="pix", color=[grey] * 3, colorSpace="rgb")
win.recordFrameIntervals = True
rate = win.getActualFrameRate()
if rate is None or abs(rate - params["frame_rate_hz"]) > 1:
    raise RuntimeError(f"The display runs at {rate} Hz, not {params['frame_rate_hz']} Hz.")
size = params["image_size_px"]
frames = [visual.ImageStim(win, image=str(p), size=(size, size), interpolate=False)
          for p in sorted(folder.glob("frame_*.png"))]   # textures are made here, before showing
for stim in frames:
    stim.draw()
    win.flip()                                            # one frame per refresh
print("Dropped frames:", win.nDroppedFrames)
win.close()
core.quit()
```

**Psychtoolbox (MATLAB)**

```matlab
folder = 'eek-a-rise_1';
params = jsondecode(fileread(fullfile(folder, 'parameters.json')));
files = dir(fullfile(folder, 'frame_*.png'));
grey = mean(params.measured.mean_range) * 255;
win = PsychImaging('OpenWindow', max(Screen('Screens')), grey);
ifi = Screen('GetFlipInterval', win);
assert(abs(1 / ifi - params.frame_rate_hz) < 1, 'The display does not run at the frame rate.');
tex = zeros(1, numel(files));
for k = 1:numel(files)
    tex(k) = Screen('MakeTexture', win, imread(fullfile(folder, files(k).name)));
end
missed = 0;
vbl = Screen('Flip', win);
for k = 1:numel(tex)
    Screen('DrawTexture', win, tex(k), [], [], 0, 0);   % rotation 0, no filtering
    [vbl, ~, ~, m] = Screen('Flip', win, vbl + 0.5 * ifi);
    missed = missed + (m > 0);
end
Screen('Close', tex);
sca;
fprintf('Missed flip deadlines: %d\n', missed);
```

For gamma correction in Psychtoolbox, see `PsychImaging('AddTask',
'FinalFormatting', 'DisplayColorCorrection', 'SimpleGamma')` or a measured
lookup table.

## Build

```bash
npm ci
npm run dev       # http://localhost:5173/eek-a-rise/
npm run check     # types, tests, claim check, build, public-build check
npm run e2e       # end-to-end check of the built page (Playwright, Chromium)
```
