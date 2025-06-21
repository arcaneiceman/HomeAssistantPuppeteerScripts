#!/bin/bash
# Usage: ./compile-payload.sh script.js
#
# This script:
# 1. Removes full-line comments (lines that start with "//" after optional whitespace).
# 2. Removes inline comments that begin with whitespace followed by "//".
#    (This regex won’t touch "//" that appear immediately after non‐whitespace, e.g. inside URLs.)
# 3. Replaces newlines with spaces.
# 4. Collapses multiple spaces into one.
# 5. Trims leading and trailing spaces.
# 6. Escapes backslashes and double quotes for valid JSON.
# 7. Outputs the final minified code as a one-line JSON object.

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <input.js>" >&2
    exit 1
fi

FILE="$1"

# 1. Remove full-line comments (lines that, after trimming, start with "//")
CONTENT=$(sed -E '/^[[:space:]]*\/\//d' "$FILE")
# 2. Remove inline comments (only if preceded by whitespace)
CONTENT=$(echo "$CONTENT" | sed -E 's/([[:space:]])\/\/.*$/\1/g')
# 3. Replace newlines with spaces
CONTENT=$(echo "$CONTENT" | tr '\n' ' ')
# 4. Collapse multiple spaces into one
CONTENT=$(echo "$CONTENT" | sed -E 's/  +/ /g')
# 5. Trim leading/trailing spaces
CONTENT=$(echo "$CONTENT" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')
# 6. Escape backslashes and double quotes so the JSON remains valid
ESCAPED=$(echo "$CONTENT" | sed 's/\\/\\\\/g; s/"/\\"/g')
# 7. Output the final JSON object (single line)
echo "{\"code\": \"$ESCAPED\"}"
