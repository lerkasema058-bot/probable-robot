#!/usr/bin/env bash
set -euo pipefail

# Simple video helper using ffmpeg (bundled via imageio-ffmpeg in this environment).
# Usage:
#   scripts/video-tools.sh mp4 input.webm [output.mp4]
#   scripts/video-tools.sh gif input.mp4 [output.gif]
#   scripts/video-tools.sh audio input.mp4 [output.mp3]
#   scripts/video-tools.sh resize input.mp4 1280 720 [output.mp4]
#   scripts/video-tools.sh compress input.mp4 [output.mp4]

resolve_ffmpeg() {
  if command -v ffmpeg >/dev/null 2>&1; then
    command -v ffmpeg
    return
  fi
  local py_ffmpeg
  py_ffmpeg=$(python - <<'PY'
try:
    import imageio_ffmpeg
    print(imageio_ffmpeg.get_ffmpeg_exe())
except Exception:
    pass
PY
)
  if [ -n "${py_ffmpeg:-}" ] && [ -x "$py_ffmpeg" ]; then
    echo "$py_ffmpeg"
    return
  fi
  echo "ffmpeg not found. Install ffmpeg or: pip install imageio-ffmpeg --break-system-packages" >&2
  exit 1
}

FFMPEG=$(resolve_ffmpeg)
cmd=${1:-}
shift || true

case "$cmd" in
  mp4)
    in=${1:?input required}; out=${2:-${in%.*}.mp4}
    "$FFMPEG" -y -i "$in" -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart "$out"
    echo "Created $out"
    ;;
  gif)
    in=${1:?input required}; out=${2:-${in%.*}.gif}
    "$FFMPEG" -y -i "$in" -vf "fps=12,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "$out"
    echo "Created $out"
    ;;
  audio)
    in=${1:?input required}; out=${2:-${in%.*}.mp3}
    "$FFMPEG" -y -i "$in" -vn -c:a libmp3lame -q:a 2 "$out"
    echo "Created $out"
    ;;
  resize)
    in=${1:?input required}; w=${2:?width required}; h=${3:?height required}; out=${4:-${in%.*}_${w}x${h}.mp4}
    "$FFMPEG" -y -i "$in" -vf "scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -pix_fmt yuv420p -c:a aac "$out"
    echo "Created $out"
    ;;
  compress)
    in=${1:?input required}; out=${2:-${in%.*}.compressed.mp4}
    "$FFMPEG" -y -i "$in" -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 128k -movflags +faststart "$out"
    echo "Created $out"
    ;;
  *)
    echo "Usage: scripts/video-tools.sh {mp4|gif|audio|resize|compress} ..." >&2
    exit 2
    ;;
esac
