# Explainer texts

Approved wording for the public page, written with the owner on 2026-10-27, and
the rules any new public text must follow. British English, no contractions,
house writing style. Section 1 is the owner's blog post about the published clip;
sections 2–5 adapt it for this page. Where an adaptation differs from the blog,
the reason is given.

**Re-scoped on 2026-10-27 (specification 0.2):** the page makes sequences of
whole images, not the compound stimulus. Sections 2, 3 and 4 were adapted
accordingly by the agent and await the owner's review; the approved versions of
those sections are kept under *Superseded* at the end.

## Claim rules

1. Say **overall** (whole-image) brightness, contrast and level of detail stay the
   same. Never say the pixels or the image stay the same, and never say every
   region stays the same: the contrast of a region changes as the image emerges
   (about 7–10 % for 160-row bands of the demo faces).
2. The method is "an algorithm" that "scrambles" or "shuffles where the detail
   sits"; not "a computer", and not "scrambles the pixels".
3. Do not compare the noise with old-TV static.
4. Hedge inferences: the gradual change makes it "much more likely" that
   responses reflect the face content; it does not prove face-specific processing.
5. Give the paper's rates as the experiment's rates. The published clip plays
   at 5/6 speed; mention this only where the clip itself is shown or linked.
6. Mark parameters inferred from the clip, not from the paper, as such.

## 1. Blog post about the clip (as approved)

**Faces from noise**

A face that suddenly appears on a screen triggers a strong response in the
brain's early visual areas. That response can drown out the weaker signals from
the areas that process faces.

This clip shows how an MEG study on attention and face processing avoided that
problem: the faces gradually emerge from noise and then dissolve back into it.

To create this, all photos were first converted to black and white and matched
in brightness, contrast and level of detail. An algorithm then scrambled each
photo, shuffling where the detail sits without changing how much detail there is.
Take a chessboard as an example. Scrambled this way, it would lose its neat
squares. It would, however, still show about as many dark as light spots, on
average roughly the size of a chess square. Fully scrambled, a face was reduced
to unrecognisable noise. Gradually unscrambling it made the face reappear.
Brightness, contrast and level of detail stayed the same throughout; only the
amount of recognisable face changed.

In the clip, the eyes appear in the top band and the mouth in the bottom band,
separated by a strip of noise. Each fades in and out at its own pace. In the
experiment, the eyes did so twice per second and the mouth four times every three
seconds, while the person shown changed about every 1.5 seconds. This technique
is called frequency tagging. Each rhythm acts as a label: a brain area that
follows the eyes shows activity at the eyes' rhythm, and one that tracks the
person's identity follows the slower rhythm of identity changes.

Participants watched sequences like this one while paying attention to the eyes,
the mouth or the identity. Because the images did not differ between conditions,
differences in their brain responses can be attributed to attention rather than
to what was on the screen.

Paper: de Vries & Baldauf (2019), *Journal of Cognitive Neuroscience*.
<https://doi.org/10.1162/jocn_a_01428>

## 2. Page: "How it works" (general)

Adapted from section 1: "this clip" becomes "this page", "overall" is added
(claim rule 1), and the compound stimulus is replaced by sequences of whole
images (specification 0.2).

**Faces from noise**

A face that suddenly appears on a screen triggers a strong response in the
brain's early visual areas. That response can drown out the weaker signals from
the areas that process faces. The stimuli on this page avoid that problem: the
images gradually emerge from noise and then dissolve back into it.

All images are first converted to black and white and matched in brightness,
contrast and level of detail. An algorithm then scrambles each image, shuffling
where the detail sits without changing how much detail there is. Take a
chessboard as an example. Scrambled this way, it loses its neat squares. It
still shows about as many dark as light spots, however, on average roughly the
size of a chess square. Fully scrambled, a face is reduced to unrecognisable
noise. Gradually unscrambling it makes the face reappear. The image's overall
brightness, contrast and level of detail stay the same throughout; only the amount
of recognisable content changes.

In a sequence, each image fades in and out at a fixed pace, for example twice
per second, and the next image follows in the next cycle. This technique is
called frequency tagging. The rhythm acts as a label: a brain area that responds
to the content of the images shows activity at that rhythm. Because the overall
brightness and contrast do not change, such a response is much more likely to
reflect the content than a flicker of light.

In the original study, the eyes and the mouth of a face were tagged at different
rates in one compound stimulus, and participants watched the same sequences
while paying attention to the eyes, the mouth or the identity. Because the
images did not differ between conditions, differences in their brain responses
could be attributed to attention rather than to what was on the screen. This
page makes the simpler case: sequences of whole images.

## 3. Page: "For researchers" (expert)

**Frequency tagging without luminance flicker**

Steady-state paradigms commonly drive their tags with luminance or contrast
modulation, which evokes strong responses in early visual cortex. Here the tag is
carried by image content. Images are converted to greyscale, optionally cropped
to an elliptical outline on a mean-grey background, and given the set-average
Fourier amplitude spectrum, which equates mean luminance and RMS contrast
exactly. Their visibility is then modulated with Random Image Structure
Evolution (RISE; Sadr & Sinha, 2004). The Fourier phase moves linearly from a
random phase spectrum to the image's own, so every frame keeps the common
amplitude spectrum and therefore the same mean luminance and RMS contrast, up to
8-bit rounding.

Each phase travels the shorter way round the circle, and a random half of the
phases make one extra full turn in a random direction, so that the image stays
hidden until about halfway and is recognisable for about a third of each cycle.
Interpolating the raw phase values instead, with the extra turn following the
sign of the image's phase, avoids the bright corners of plain interpolation only
at the halfway point: earlier the corners brighten, later they darken. The page
offers that reading of Sadr and Sinha as an option; the example clip of the
original study shows no such corners.

The procedure follows de Vries and Baldauf (2019), who applied it to separate
eye and mouth bands of a compound face; this page applies it to whole images
only. Three parameters are not reported in the paper and were inferred from its
published example clip:

- a 60 Hz frame rate (adjustable here);
- a raised-cosine interpolation weight from pure noise to the full image;
- a new noise end-point every half cycle.

Some caveats apply. Whole-image statistics are constant, but local statistics
are not: a face concentrates its contrast in some regions, whereas noise spreads
it evenly, so the contrast of any part of the image changes as the image emerges
(by about 7–10 % for the upper and lower 160 rows of the demo faces). With the
extra turns, the visibility waveform is narrower than a sinusoid and carries
harmonics of the tag frequency. Emerging phase structure also forms local edges
that early visual cortex encodes. Constant global statistics reduce low-level
confounds; they do not remove them. Finally, the statistics are defined in pixel
values: on the screen they hold for luminance only on a display that is
linearised (gamma-corrected) or measured.

## 4. Captions

- **RISE on a photograph** (`rise_methods.png`): From noise (0) to the
  photograph (1). Top: RISE as made on this page. Middle: the sign rule, whose
  corners brighten early and darken late. Bottom: plain phase interpolation,
  which brightens the corners halfway. Overall brightness and contrast are the
  same in every frame.
- **Chessboard** (`chessboard_on_grey.png`): A chessboard on a grey background,
  and the same image scrambled: no neat squares, but about as many dark as light
  spots of roughly square size.
- **Demo sequence** (`demo_sequence.png`): The first 1.5 s of the default
  sequence after the baseline (1.0–2.5 s), every third frame: three faces, each
  emerging from and dissolving into noise.

## 5. Short texts

- **Privacy:** Everything happens in your browser. Your images are not uploaded,
  stored or sent anywhere.
- **Downloads:** PNG frames are lossless: use them for research, presented with
  Psychtoolbox or PsychoPy on a display locked to the frame rate. Video is
  compressed, which changes pixel values and can undo the matched brightness and
  contrast. It is meant for viewing and sharing.
- **Player:** This preview shows frames by elapsed time at 60 frames per second.
  Browsers do not guarantee exact frame timing, so use the downloads for
  experiments.
- **Published clip:** The example clip published with the paper plays at 5/6 of
  the experiment's speed, because frames made for a 60 Hz display were saved at
  50 frames per second.

## References

- de Vries, E., & Baldauf, D. (2019). Attentional weighting in the face processing
  network: A magnetic response image-guided magnetoencephalography study using
  multiple cyclic entrainments. *Journal of Cognitive Neuroscience, 31*(10),
  1573–1588. <https://doi.org/10.1162/jocn_a_01428>
- Sadr, J., & Sinha, P. (2004). Object recognition and Random Image Structure
  Evolution. *Cognitive Science, 28*, 259–287.
- Willenbockel, V., Sadr, J., Fiset, D., Horne, G. O., Gosselin, F., & Tanaka,
  J. W. (2010). Controlling low-level image properties: The SHINE toolbox.
  *Behavior Research Methods, 42*, 671–684.

## Superseded (approved 2026-10-27, compound stimulus)

Kept for reference; replaced by the adapted sections 2–4 above.

### 2. "How it works", third and fourth paragraphs

In the compound stimulus, the eyes appear in the top band and the mouth in the
bottom band, separated by a strip of noise. Each fades in and out at its own
pace: the eyes twice per second and the mouth four times every three seconds,
while the person shown changes about every 1.5 seconds. This technique is called
frequency tagging. Each rhythm acts as a label: a brain area that follows the
eyes shows activity at the eyes' rhythm, and one that tracks the person's identity
follows the slower rhythm of identity changes.

In the original study, participants watched sequences like these while paying
attention to the eyes, the mouth or the identity. Because the images did not
differ between conditions, differences in their brain responses could be
attributed to attention rather than to what was on the screen.

### 3. "For researchers", second and third paragraphs

The compound stimulus follows de Vries and Baldauf (2019): an eye band (upper
160 px) at 2.00 Hz, a phase-scrambled mask band (80 px) with fixation cross and
cue, and a mouth band (lower 160 px) at 1.33 Hz, with identity changing at
0.66 Hz. Three parameters are not reported in the paper and were inferred from
its published example clip: a 60 Hz frame rate; a raised-cosine interpolation
weight from pure noise to the full image; a new noise end-point every half cycle,
with a mask that loops every 10 frames.

Some caveats apply. Whole-image statistics are constant, but within each band the
RMS contrast varies by about 7–9 % at its tag rate, because a face concentrates
its contrast in some regions while noise spreads it evenly. With the 2π step, a
face is recognisable for only about a third of each cycle, so the visibility
waveform is narrower than a sinusoid and carries harmonics. Emerging phase
structure also forms local edges that early visual cortex encodes. Finally, the
tags are harmonically related (1.33 and 2.00 Hz are the second and third
harmonics of 0.66 Hz), and the paper did not counterbalance them across face
components.

### 4. Caption of the demo trial

**Demo trial** (`demo_trial_first_identity.png`): The first identity block of a
trial (1.0–2.5 s), every third frame: three eye and two mouth expressions, each
emerging from and dissolving into noise.
