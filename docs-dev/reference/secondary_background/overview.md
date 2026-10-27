# Overview

*eek-a-rise*: non-binding orientation.

## What it is

Faces that emerge from noise: an in-browser implementation of the RISE
compound-face stimuli of de Vries and Baldauf (2019). The owner of this project
is the paper's first author.

## Stack

Vite + TypeScript, no UI framework, Web Worker; a Python reference implementation
in `tools/reference/`.

## Scope and platform

For the general public (watching a face emerge while overall brightness and
contrast stay the same) and for researchers (building and downloading the
compound stimulus). Desktop browsers first; it should work on phones, where
rendering a full trial may be slow. Out of scope for v1: running experiments,
servers, real face photographs among the examples.

## Files in this folder

- `science_background.md`: the paper, RISE, SHINE, what the published clip shows,
  the verification and the caveats.
- `explainer_texts.md`: approved public wording and the claim rules.
- `reference_verification.json`: measurements of the reference demo trial.
- `clip_analysis_results.json`: measurements of the published clip.
- `figures/`: the RISE photograph figure, two chessboard figures and a demo-trial
  contact sheet.
