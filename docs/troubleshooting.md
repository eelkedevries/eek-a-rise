# Troubleshooting

## The video button is disabled

The browser has no WebCodecs video encoder for H.264 or VP9 (for example an
older Safari or Firefox). The PNG frames (ZIP) are still available, and they are
the format to use for research. Chrome and Edge encode H.264.

## Building is slow, or the page runs out of memory

Rendering takes one inverse Fourier transform per frame; the default sequence
(360 frames at 400 × 400 px) takes about 10 s on a laptop and longer on a phone.
Long sequences or large images cost more: frames are held in memory as 8-bit
grey (one byte per pixel), and the page refuses sequences above 400 MB. Use a
smaller image size or a shorter sequence, or build on a desktop computer.
*Cancel* stops a build at once.

## "This display refreshes at … Hz, which is not a whole multiple …"

The preview shows frames by elapsed time; when the display's refresh rate is
not a whole multiple of the sequence's frame rate, some frames stay on the
screen longer than others. This affects the preview only. For experiments,
present the PNG frames with refresh-locked software on a display set to the
sequence's frame rate (see `usage.md`).

## "More than 0.1 % of the pixel values were clipped"

Some frames have values below 0 or above 1 before the 8-bit mapping, usually
because the images have high contrast. Clipping changes brightness and contrast
slightly. Tick *Set mean and RMS contrast* and choose a lower RMS contrast (for
example 0.10 at a mean of 0.5).

## "… Hz is not a whole number of frames …" or "… a whole number of … cycles"

The tag period must be a whole number of frames, and the image part a whole
number of cycles, so that every cycle starts and ends in noise. The message
names the nearest valid values. At 60 frames/s, for example, 1.5, 2, 2.4, 3, 4,
5 and 6 Hz give whole-frame periods (40, 30, 25, 20, 15, 12 and 10 frames); 7 Hz
does not. The image part must then be a multiple of the period: 4.5 s suits 2, 4
and 6 Hz, while 1.5 and 3 Hz need, for example, 4 s or 6 s.

## An uploaded image is rejected

Only image files of up to 25 MB that the browser can decode are accepted (JPEG
and PNG are safe). Larger images are reduced to at most 1600 px on the long side
before preparation; the sequence uses a centred square crop.

## Development server will not start

- Use Node.js 22 (`node --version`).
- Remove `node_modules/` and run `npm ci` again.
