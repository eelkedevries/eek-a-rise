#!/usr/bin/env bash
# Checks a video downloaded from eek-a-rise with ffprobe: frame count, frame rate,
# duration (within one frame) and strictly increasing timestamps. For the owner and
# agents; not part of `npm run check`. Usage:
#   bash scripts/verify-export.sh eek-a-rise_<seed>.mp4 [frames] [fps]
# The defaults (360 frames at 60 frames/s) are those of the default sequence.
set -euo pipefail

file="${1:?usage: verify-export.sh VIDEO [frames] [fps]}"
frames="${2:-360}"
fps="${3:-60}"
command -v ffprobe >/dev/null || { echo "ffprobe is not installed." >&2; exit 1; }

fail=0
count="$(ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames -of csv=p=0 "$file")"
rate="$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$file")"
duration="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$file")"
mapfile -t pts < <(ffprobe -v error -select_streams v:0 -show_entries frame=pts_time -of csv=p=0 "$file")

echo "frames:   $count (expected $frames)"
[[ "$count" == "$frames" ]] || fail=1
echo "rate:     $rate (expected $fps/1)"
[[ "$rate" == "$fps/1" ]] || fail=1
expected="$(awk -v n="$frames" -v f="$fps" 'BEGIN { printf "%.3f", n / f }')"
echo "duration: $duration s (expected $expected s, within one frame)"
awk -v d="$duration" -v e="$expected" -v f="$fps" 'BEGIN { exit !((d - e) < 1 / f && (e - d) < 1 / f) }' || fail=1
if printf '%s\n' "${pts[@]}" | awk 'NR > 1 && $1 <= prev { bad = 1 } { prev = $1 } END { exit bad }'; then
  echo "timestamps: strictly increasing"
else
  echo "timestamps: NOT strictly increasing"
  fail=1
fi
step="$(printf '%s\n' "${pts[@]}" | awk -v f="$fps" 'NR > 1 { d = $1 - prev; if (d - 1 / f > m) m = d - 1 / f; if (1 / f - d > m) m = 1 / f - d } { prev = $1 } END { printf "%.6f", m }')"
echo "largest deviation of a frame step from 1/$fps s: $step s"

if [[ "$fail" -ne 0 ]]; then
  echo "Video check FAILED." >&2
  exit 1
fi
echo "Video check passed."
