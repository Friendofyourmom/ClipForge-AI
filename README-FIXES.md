# ClipForge AI — consolidated fixes

## Upload these files to the repository root
- `index.html` (replace)
- `link-import.js` (replace)
- `batch3.js` (replace)
- `batch3.css` (add or replace)
- `editor-workspace.js` (replace)

Keep `style.css` and `app.js` unchanged. The updated index loads the new CSS and Batch 3 script with cache-busting versions.

## Fixes
- Batch 3 JavaScript and CSS are now loaded by index.html.
- Twitch VOD `/videos/123456789` URLs are recognized, alongside legacy `/v123456789` and Twitch clips.
- Project recovery restores exact clip ranges and subtitle cues through a small workspace API, without requiring a video to be loaded first.
- Highlight scan rejects ranges shorter than the chosen clip length instead of returning misleading empty results.
- Batch export reads exact queue times and cleans up media tracks on failure.

## Limits
- Link previews do not download VOD files.
- Whisper and JSZip load from jsDelivr; an internet connection is required.
- Speech recognition may be slow or fail on phones with limited memory. Try short ranges.
- Export remains WebM, not MP4. Batch ZIPs use memory; keep the queue small.
- Project recovery saves settings, clip ranges and subtitle cues, not the video itself.
- Highlight scoring is a loudness/activity heuristic, not semantic AI.
