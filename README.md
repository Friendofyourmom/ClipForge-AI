# ClipForge AI — consolidated free-first browser build

## Included in this batch
- Responsive dark mobile-first interface.
- YouTube and Twitch link recognition with official embedded preview.
- Local upload of creator-authorized video files.
- Full-video or selected-range local audio analysis that suggests up to five candidate windows based on audio peaks.
- Manual start/end trimming and 9:16 center crop.
- Static caption burn-in and timed `.srt` subtitle burn-in when browser export supports it.
- Topic-based title, description and hashtag templates with copy action.
- Local WebM export using MediaRecorder.

## Important limitations
- Link preview is not downloading or ingesting a VOD. This static GitHub Pages app cannot fetch arbitrary YouTube/Twitch media. Use a file you are authorized to edit and obtain it through an authorized source.
- The “moment finder” is a local audio-loudness heuristic, not semantic AI. It cannot identify jokes, gameplay events, conversations or meaning. Review candidates manually.
- Post text is generated from the topic you type, not from video understanding.
- Export is WebM, not MP4. Browser/device codec support and memory limits vary; long/high-resolution exports may fail on Android.
- Automatic speech recognition, semantic AI highlight ranking, direct VOD processing, reliable MP4 conversion and cloud processing are not included. They require additional processing infrastructure and, for platform media, authorized access.
- No DRM, access-control or platform restriction bypass is provided.

## Install
Replace `index.html`, `style.css`, `app.js`, `link-import.js`, and `README.md` in the repository root with the files in this package. Then wait for GitHub Pages to redeploy and refresh the site. No API keys are required for these local features.
