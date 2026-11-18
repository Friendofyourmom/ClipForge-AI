# ClipForge AI

Free-first, Android-friendly browser clip editor prototype.

## Current features
- Recognizes standard YouTube video/Short/live links and Twitch VOD/clip links.
- Shows an official embedded preview where the platform permits it.
- Supports local upload of creator-authorized video files.
- Lets users select start/end times, crop to vertical 9:16, add a simple burned-in caption, and export WebM locally in supported browsers.

## Important limitations
- Link preview is **not** a video download. YouTube/Twitch embeds do not expose the underlying video file to this page.
- Do not use this app to bypass DRM, access controls, or platform restrictions. Obtain a file through an authorized creator/platform source, then upload it.
- GitHub Pages is static hosting; it cannot run long-running VOD downloads, AI analysis, or server-side video encoding. Those features require a separate backend and a lawful/authorized source workflow.
- Automatic highlight detection, speech-to-text captions, and MP4 export are not implemented in this prototype.
- Browser export currently creates WebM. Long/high-resolution videos may exceed Android browser memory/processing limits.

## Update existing repository
Upload/replace `index.html`, `style.css`, and `README.md` in the repository root, and add the new `link-import.js` file there. **Keep your existing `app.js` unchanged**; the updated page loads it for local clip editing/export.

## Publish
After uploading the files, use GitHub Settings → Pages → Deploy from a branch → `main` → `/(root)`.
