# ClipForge AI — Editing Workspace Batch 2

## New in this batch
- Audio waveform overview generated locally from the selected file.
- Timeline selection overview linked to the existing start/end trim fields.
- Multi-clip queue: save multiple time ranges, select one to edit, or remove it.
- Subtitle cue builder: add timed text cues, review/remove them, and download a standard `.srt` file.
- The generated SRT can be loaded into the existing timed-subtitle input and burned into a WebM export where browser support permits.
- Existing link preview, local audio peak analysis, crop, captions, post-text templates and WebM export are preserved.

## Honest limitations
- The queue stores clip ranges only for the current browser session. It does not batch-export all clips automatically.
- Waveform is a visual audio-amplitude overview, not AI transcription or semantic understanding.
- The subtitle cue builder requires manual text entry; it does not perform speech recognition.
- Export remains WebM, not MP4. Device/browser codec and memory limits apply.
- YouTube/Twitch URLs remain embedded previews, not downloadable VOD sources.
- Use only videos you own or are authorized to edit. This app does not bypass platform access controls.

## Install
Replace `index.html` and `style.css`, keep your existing `app.js` and `link-import.js` unchanged, and add `editor-workspace.js` to the repository root. The `index.html` in this package loads the new script after the existing scripts.
