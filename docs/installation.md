# Installation

Only needed to develop eek-a-rise or to check its output locally; the page itself
needs nothing but a browser.

## Prerequisites

- Node.js 22 and npm.
- For the Python reference and the export verifier: [uv](https://docs.astral.sh/uv/)
  (it installs Python, numpy, scipy, Pillow and scikit-image from
  `tools/reference/uv.lock`).
- For `scripts/verify-export.sh`: ffprobe (part of FFmpeg).
- For `npm run e2e`: a Chromium for Playwright (`npx playwright install chromium`).

## Install

```bash
git clone https://github.com/eelkedevries/eek-a-rise.git
cd eek-a-rise
npm ci
```

## Run locally

```bash
npm run dev
```

Open <http://localhost:5173/eek-a-rise/>.

## Reference tooling

```bash
cd tools/reference
uv sync
uv run make_golden.py       # regenerate the golden data (deterministic)
uv run verify_export.py path/to/eek-a-rise_<seed>.zip
```
