# Task: Keep the example surround textured at full visibility

## Goal

Correct the remaining grey surround at weight 1, as requested in the owner's screenshots of 2026-11-04.

## Required changes

1. Prepare the 15 public synthetic face examples with a phase-noise surround and a soft transition at the face boundary, before whole-image RISE. Keep the original raw face images as reference inputs and document that this example preparation is a project adaptation.
2. Remove the workaround that caps demonstration playback at 0.85. Restore a peak of 1 for single-image playback and default sequences. Keep the corrected shared-peak algorithm for users who select partial peaks.
3. Refresh example image URLs so browsers load the corrected assets. Update the explanatory figure, public text, numerical audit, app/specification versions and current state.
4. Add a regression check that fails for the old grey-background assets: all 15 examples retain surround texture at weight 1, intermediate weights and in sequence peaks, while the Fourier invariants and existing golden tolerances remain satisfied.

## Acceptance criteria

- The One image slider at exactly 1 shows the face within a textured surround.
- Playback reaches 1 without the surround becoming grey; sequence peaks do the same.
- Every public synthetic face has a textured surround. The result is generated as a whole-image RISE stimulus, without adding an output overlay after measurement.
- `npm run check` and the independent Python demo check pass. Inspect the live result at exactly weight 1 after deployment.

## Commit and deploy

Commit to main using this exact filename, then deploy through the existing workflow. Record the commit, validation and live result in the final report.
