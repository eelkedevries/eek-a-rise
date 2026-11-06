# Task: Publish the prepared character sequence

## Goal

Put the corrected 21-portrait set and its RISE sequence on the live site.

## Required changes

1. Load the prepared portraits from a deployment-supplied manifest. Offer them in both galleries.
2. Add a Sequence preset with the prepared order and timing and an optional video preview.
3. Stage the approved media in the website deployment. Keep the standalone synthetic demo available.
4. Update usage, the specification and the app version.

## Acceptance criteria

- The live gallery contains 21 prepared portraits, including the corrected Frank Reynolds crop.
- The preset contains 21 successive reveals with a different character at each peak. The schedule has 1,350 frames at 60 frames/s.
- The preview plays in the browser, and the existing app checks pass.

## Commit and deploy

Run `npm run check`, commit to main using this filename and verify the deployed page and media.
