#!/usr/bin/env bash
# Builds the hero loop from the Higgsfield films, in order.
#   usage: scripts/encode-hero-loop.sh exterior.mp4 interior.mp4 [...]
# 1. Joins the films end to end. The interior film ends on the clean SUV in the driveway, which cuts back to
#    the same wide angle covered in foam at the top of the exterior film, so the loop closes on a shot change
#    like every other cut in it.
# 2. Keeps the 16:9 master; the page crops it with object-fit (centred), so the video and its poster line up in
#    every hero shape: full-bleed on desktop, tablets and unfolded foldables, a square band on phones.
# 3. Encodes silent VP9 WebM and H.264 MP4 (+faststart, no audio track) at 1920x1080, plus a poster from the
#    first frame.
set -euo pipefail
[ $# -ge 1 ] || { echo "usage: $0 film.mp4 [film.mp4 ...]" >&2; exit 1; }
out=src/assets/video
mkdir -p "$out"
tmp=$(mktemp -d)
inputs=(); chains=""; labels=""
for i in $(seq 0 $(($# - 1))); do
  inputs+=(-i "${@:$((i + 1)):1}")
  chains+="[$i:v]scale=1920:1080:flags=lanczos,setsar=1,fps=24,format=yuv420p[v$i];"
  labels+="[v$i]"
done
ffmpeg -loglevel error -y "${inputs[@]}" -filter_complex "${chains}${labels}concat=n=$#:v=1:a=0[v]" -map "[v]" -an \
  -c:v libx264 -crf 8 -preset slow "$tmp/loop.mp4"

ffmpeg -loglevel error -y -i "$tmp/loop.mp4" -an -c:v libvpx-vp9 -crf ${VP9CRF:-36} -b:v 0 -row-mt 1 -deadline good -cpu-used 1 -g 48 "$out/hero-loop.webm"
ffmpeg -loglevel error -y -i "$tmp/loop.mp4" -an -c:v libx264 -profile:v high -pix_fmt yuv420p -crf ${CRF:-24} -preset veryslow -tune film -g 48 -movflags +faststart "$out/hero-loop.mp4"
ffmpeg -loglevel error -y -i "$tmp/loop.mp4" -frames:v 1 -q:v 2 src/assets/hero-loop-poster.jpg
rm -rf "$tmp"
ls -la "$out" src/assets/hero-loop-poster.jpg
