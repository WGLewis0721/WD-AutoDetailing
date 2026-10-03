#!/usr/bin/env bash
# Turns the square Higgsfield master into the hero loop files.
#   usage: scripts/encode-hero-loop.sh master.mp4
# 1. Closes the loop. The Seedance take opens on the keyframe for a single frame, then cuts to the wheel;
#    that flash frame is dropped (HEAD frames) so the calm empty-fender ending cuts cleanly into the empty
#    wheel opening, the same editorial cut the clip already uses inside. SEAM>0 instead dissolves the
#    last SEAM seconds into the opening (only for takes whose two ends share a composition).
# 2. Keeps the square framing; the page crops it with object-fit/object-position, so the video and its
#    poster line up exactly in the 4:5 desktop frame, the 4:3 phone frame and anything in between.
# 3. Encodes silent H.264 MP4 (+faststart) and VP9 WebM at 1080 (sharp on 2x and 3x screens at every hero size), plus a poster.
set -euo pipefail
src=${1:?master video}
SEAM=${SEAM:-0}
HEAD=${HEAD:-1}
out=src/assets/video
mkdir -p "$out"
tmp=$(mktemp -d)
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
OFF=$(echo "$D - 2*$SEAM - $HEAD/24" | bc -l)

if [ "$SEAM" = 0 ]; then
  ffmpeg -loglevel error -y -i "$src" -vf "trim=start_frame=$HEAD,setpts=PTS-STARTPTS,scale=1080:1080:flags=lanczos,setsar=1,format=yuv420p" \
    -an -c:v libx264 -crf 10 -preset slow "$tmp/loop.mp4"
else
  ffmpeg -loglevel error -y -i "$src" -filter_complex \
    "[0:v]trim=start_frame=$HEAD,setpts=PTS-STARTPTS,scale=1080:1080:flags=lanczos,setsar=1,fps=24,split[x][y];\
     [x]trim=start=$SEAM,setpts=PTS-STARTPTS[a];[y]trim=end=$SEAM,setpts=PTS-STARTPTS[b];\
     [a][b]xfade=transition=fade:duration=$SEAM:offset=$OFF,format=yuv420p" \
    -an -c:v libx264 -crf 10 -preset slow "$tmp/loop.mp4"
fi

for s in 1080; do
  ffmpeg -loglevel error -y -i "$tmp/loop.mp4" -vf "scale=$s:$s:flags=lanczos" -an \
    -c:v libx264 -profile:v high -pix_fmt yuv420p -crf ${CRF:-22} -preset veryslow -tune film -g 48 -movflags +faststart "$out/hero-loop-$s.mp4"
  ffmpeg -loglevel error -y -i "$tmp/loop.mp4" -vf "scale=$s:$s:flags=lanczos" -an \
    -c:v libvpx-vp9 -crf ${VP9CRF:-34} -b:v 0 -row-mt 1 -deadline good -cpu-used 1 -g 48 "$out/hero-loop-$s.webm"
done
ffmpeg -loglevel error -y -i "$tmp/loop.mp4" -frames:v 1 -q:v 2 src/assets/hero-loop-poster.jpg
rm -rf "$tmp"
ls -la "$out" src/assets/hero-loop-poster.jpg
