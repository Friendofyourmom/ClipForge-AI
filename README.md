# ClipForge AI — Batch 3 upgrade

## Install on Android
1. Extract this ZIP.
2. Open your GitHub repository `Friendofyourmom/ClipForge-AI`.
3. Upload `batch3.js` and `batch3.css` to the repository root.
4. Open the existing `index.html` and add this line immediately after the existing `editor-workspace.js` script:
   `<script src="batch3.js"></script>`
5. Add this line in the `<head>` after the existing `style.css` line:
   `<link rel="stylesheet" href="batch3.css">`
6. Commit the changes. Keep your existing `app.js`, `link-import.js`, `editor-workspace.js`, `style.css` and all other files unchanged.

## Features
- Automatic subtitles using the free Whisper Tiny model through Transformers.js. The model downloads on first use; transcription runs in the browser and the generated SRT is loaded into the existing subtitle input.
- Multi-signal highlight ranking combines audio energy, a simple speech-activity heuristic and visual frame changes.
- Batch export packages queued clip ranges into one ZIP containing WebM files.
- Shorts, TikTok and Reels presets select the existing 9:16 output; source preset keeps the source aspect ratio.
- Project recovery autosaves editing settings, clip ranges and subtitle cues to local browser storage.

## Limits
- First-time model download is large (roughly 150 MB class; exact transfer varies). Android performance and memory vary; short ranges are recommended.
- Review generated captions for errors. Highlight ranking is not semantic AI and cannot understand the meaning of the video.
- Export is WebM, not MP4. Batch ZIP temporarily uses memory; keep batches small on phones.
- Transformers.js and JSZip load from jsDelivr, so these features need an internet connection.
- The video file itself is not saved in project recovery; reselect it after reopening.
- YouTube/Twitch links remain official previews, not downloadable source files. Use videos you own or are authorized to edit.
