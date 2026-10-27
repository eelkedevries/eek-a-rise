# Reference implementation

The numerical reference for eek-a-rise, in Python. The browser code must match it
on the golden data; the binding definitions are in
`docs-dev/reference/primary_authoritative/specification.md` (*Domain rules*).

| File | Purpose |
|---|---|
| `rise_reference.py` | spectrum, both RISE targets, noise path, spectrum matching, normalisation, the full-image `Sequence` (what the page makes) and the paper's composite `Trial` (kept as the reference for the clip measurements) |
| `make_golden.py` | writes `golden/` (inputs stored exactly; manifest with tolerances) |
| `make_assets.py` | writes `demo-faces/` (15 synthetic faces), figures, a demo trial, a demo sequence and `out/verification.json` |
| `golden/` | test data for the TypeScript port; see `golden/manifest.json` |
| `demo-faces/` | example images for the page: 3 invented identities, 3 eye and 2 mouth expressions each |

## Running

```bash
uv sync                  # once: the pinned environment (uv.lock)
uv run make_golden.py    # regenerate the golden data (deterministic)
uv run make_assets.py    # demo faces, figures, demo trial; needs ffmpeg for the MP4
```

`out/` is generated and not committed. Regenerating `golden/` changes the test
data; do so only when the specification changes, and in the same commit.

## Golden data format

Little-endian, row-major. Images are `uint8`; uniform random arrays are `uint32`,
read as `x / 2**32`; expected outputs are `float64` or `float32`. Each case in
`manifest.json` gives its files, shapes and tolerance.
