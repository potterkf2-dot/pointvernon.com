#!/bin/zsh

set -eu
set -o pipefail

script_dir=${0:A:h}
repo_dir=${script_dir:h}
manifest=${POINTVERNON_MANIFEST:-"$repo_dir/photo-manifest.tsv"}
source_dir=${1:-}
output_dir=${2:-"$repo_dir/images"}

if [[ -z "$source_dir" ]]; then
  print -u2 "Usage: ./scripts/build-images.sh /path/to/full-size-originals [output-directory]"
  exit 64
fi

if [[ ! -d "$source_dir" ]]; then
  print -u2 "Originals folder not found: $source_dir"
  exit 66
fi

if [[ ! -f "$manifest" ]]; then
  print -u2 "Manifest not found: $manifest"
  exit 66
fi

duplicate_stems=$(awk -F '\t' 'NR > 1 && $1 != "" {seen[$1]++; if (seen[$1] == 2) print $1}' "$manifest")
if [[ -n "$duplicate_stems" ]]; then
  print -u2 "Duplicate filename stems in the manifest:"
  print -u2 "$duplicate_stems"
  exit 65
fi

for required_tool in sips cwebp avifenc awk stat; do
  if ! command -v "$required_tool" >/dev/null 2>&1; then
    print -u2 "Missing required tool: $required_tool"
    print -u2 "Install the encoders with: brew install webp libavif"
    exit 69
  fi
done

mkdir -p "$output_dir"
if [[ -n "$(find "$output_dir" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  print -u2 "Output folder must be empty: $output_dir"
  exit 73
fi

work_dir=$(mktemp -d "${TMPDIR:-/tmp}/pointvernon-images.XXXXXX")
trap 'rm -rf "$work_dir"' EXIT INT TERM

integer processed=0
integer output_count=0
integer warnings=0

dimensions_for() {
  local ratio=$1
  local width=$2
  local height

  case "$ratio" in
    16:9) height=$(( (width * 9 + 8) / 16 )) ;;
    16:10) height=$(( (width * 10 + 8) / 16 )) ;;
    3:2) height=$(( (width * 2 + 1) / 3 )) ;;
    4:3) height=$(( (width * 3 + 2) / 4 )) ;;
    4:5) height=$(( (width * 5 + 2) / 4 )) ;;
    1:1) height=$width ;;
    *) print -u2 "Unsupported crop ratio: $ratio"; exit 65 ;;
  esac

  print "$width $height"
}

find_original() {
  local stem=$1
  local candidate
  local -a matches
  matches=()

  # macOS uses a case-insensitive filesystem by default, so one extension
  # spelling also finds uppercase variants without counting the same file twice.
  for extension in jpg jpeg heic png tif tiff; do
    candidate="$source_dir/$stem.$extension"
    [[ -f "$candidate" ]] && matches+=("$candidate")
  done

  if (( ${#matches[@]} == 0 )); then
    print -u2 "Missing original for: $stem"
    return 1
  fi

  if (( ${#matches[@]} > 1 )); then
    print -u2 "More than one original matches: $stem"
    return 1
  fi

  print "$matches[1]"
}

render_jpeg() {
  local source_file=$1
  local ratio=$2
  local target_width=$3
  local target_height=$4
  local output_file=$5
  local quality=$6
  local source_width source_height crop_width crop_height
  local staged="$work_dir/staged-${processed}-${target_width}-${target_height}.jpg"

  source_width=$(sips -g pixelWidth "$source_file" | awk '/pixelWidth/ {print $2}')
  source_height=$(sips -g pixelHeight "$source_file" | awk '/pixelHeight/ {print $2}')

  crop_width=$source_width
  crop_height=$(( source_width * target_height / target_width ))
  if (( crop_height > source_height )); then
    crop_height=$source_height
    crop_width=$(( source_height * target_width / target_height ))
  fi

  if (( crop_width < target_width || crop_height < target_height )); then
    print -u2 "Original is too small for ${target_width}×${target_height}: $source_file"
    exit 65
  fi

  sips -s format jpeg -s formatOptions 92 \
    --cropToHeightWidth "$crop_height" "$crop_width" \
    "$source_file" --out "$staged" >/dev/null
  sips -s format jpeg -s formatOptions "$quality" \
    --resampleHeightWidth "$target_height" "$target_width" \
    "$staged" --out "$output_file" >/dev/null
}

file_size_kb() {
  local bytes
  bytes=$(stat -f %z "$1")
  print $(( (bytes + 1023) / 1024 ))
}

cap_for() {
  local role=$1
  local format=$2
  local variant=$3

  if [[ "$variant" == social ]]; then
    print 200
    return
  fi

  if [[ "$variant" == card ]]; then
    case "$format" in
      avif) print 70 ;;
      webp) print 105 ;;
      jpg) print 150 ;;
    esac
    return
  fi

  if [[ "$role" == hero ]]; then
    case "$format" in
      avif) print 120 ;;
      webp) print 180 ;;
      jpg) print 250 ;;
    esac
  else
    case "$format" in
      avif) print 60 ;;
      webp) print 90 ;;
      jpg) print 125 ;;
    esac
  fi
}

encode_set() {
  local source_file=$1
  local stem=$2
  local role=$3
  local ratio=$4
  local width=$5
  local height=$6
  local suffix=$7
  local variant=$8
  local jpg_file="$output_dir/${stem}-${suffix}.jpg"
  local webp_file="$output_dir/${stem}-${suffix}.webp"
  local avif_file="$output_dir/${stem}-${suffix}.avif"
  local modern_source="$work_dir/modern-${processed}-${suffix}.jpg"
  local jpg_cap webp_cap avif_cap actual

  jpg_cap=$(cap_for "$role" jpg "$variant")
  webp_cap=$(cap_for "$role" webp "$variant")
  avif_cap=$(cap_for "$role" avif "$variant")

  # Give the modern encoders a high-quality, correctly cropped source rather
  # than recompressing the smaller JPEG fallback.
  render_jpeg "$source_file" "$ratio" "$width" "$height" "$modern_source" 92

  for quality in 82 76 70 64 58; do
    render_jpeg "$source_file" "$ratio" "$width" "$height" "$jpg_file" "$quality"
    (( $(file_size_kb "$jpg_file") <= jpg_cap )) && break
  done

  for quality in 80 74 68 62 56; do
    cwebp -quiet -mt -preset photo -q "$quality" "$modern_source" -o "$webp_file"
    (( $(file_size_kb "$webp_file") <= webp_cap )) && break
  done

  for quality in 64 58 52 46 40; do
    avifenc -q "$quality" -s 6 -j all "$modern_source" "$avif_file" >/dev/null
    (( $(file_size_kb "$avif_file") <= avif_cap )) && break
  done

  for format_and_file in "jpg:$jpg_file:$jpg_cap" "webp:$webp_file:$webp_cap" "avif:$avif_file:$avif_cap"; do
    local format=${format_and_file%%:*}
    local remainder=${format_and_file#*:}
    local file=${remainder%%:*}
    local cap=${remainder##*:}
    actual=$(file_size_kb "$file")
    if (( actual > cap )); then
      print -u2 "Size warning: ${file:t} is ${actual} KB; target is ${cap} KB"
      (( warnings += 1 ))
    fi
  done

  (( output_count += 3 ))
}

while IFS=$'\t' read -r stem role ratio card_crop; do
  [[ "$stem" == stem ]] && continue
  [[ -z "$stem" ]] && continue

  source_file=$(find_original "$stem") || exit 66
  (( processed += 1 ))

  for width in 1600 1000 640; do
    read -r target_width target_height <<< "$(dimensions_for "$ratio" "$width")"
    encode_set "$source_file" "$stem" "$role" "$ratio" \
      "$target_width" "$target_height" "$width" standard
  done

  if [[ "$role" == hero ]]; then
    encode_set "$source_file" "$stem" "$role" 1200:630 \
      1200 630 social-1200 social
  fi

  case "$card_crop" in
    4:3) encode_set "$source_file" "$stem" "$role" 4:3 800 600 card-800 card ;;
    square) encode_set "$source_file" "$stem" "$role" 1:1 800 800 card-800 card ;;
    none) ;;
    *) print -u2 "Unsupported card crop for $stem: $card_crop"; exit 65 ;;
  esac
done < "$manifest"

print "Processed $processed originals into $output_count files in $output_dir."
if (( warnings > 0 )); then
  print "Review $warnings size warnings before committing. The script does not hide over-target files."
else
  print "All outputs meet the configured file-size targets."
fi
