(() => {
  const $ = id => document.getElementById(id);
  const input = $('videoUrl'), status = $('linkStatus'), wrap = $('embedWrap'), frame = $('videoEmbed'), next = $('linkNextStep');
  function parseLink(raw) {
    let u; try { u = new URL(raw.trim()); } catch { return null; }
    const host = u.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? {platform:'YouTube', embed:`https://www.youtube-nocookie.com/embed/${id}`} : null;
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
      let id = u.searchParams.get('v');
      if (!id) { const m = u.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})/); id = m && m[1]; }
      return id && /^[\w-]{11}$/.test(id) ? {platform:'YouTube', embed:`https://www.youtube-nocookie.com/embed/${id}`} : null;
    }
    if (host === 'twitch.tv' || host === 'm.twitch.tv' || host === 'clips.twitch.tv') {
      const parts = u.pathname.split('/').filter(Boolean);
      if (host === 'clips.twitch.tv' || parts[0] === 'clip') {
        const slug = host === 'clips.twitch.tv' ? parts[0] : parts[1];
        return slug ? {platform:'Twitch clip', embed:`https://clips.twitch.tv/embed?clip=${encodeURIComponent(slug)}&parent=${encodeURIComponent(location.hostname)}`} : null;
      }
      const videoIndex = parts.findIndex(p => /^v\d+$/.test(p));
      if (videoIndex >= 0) {
        const id = parts[videoIndex].slice(1);
        return /^\d+$/.test(id) ? {platform:'Twitch VOD', embed:`https://player.twitch.tv/?video=${id}&parent=${encodeURIComponent(location.hostname)}`} : null;
      }
    }
    return null;
  }
  $('previewLinkBtn').addEventListener('click', () => {
    const result = parseLink(input.value);
    if (!result) { wrap.classList.add('hidden'); next.classList.add('hidden'); frame.removeAttribute('src'); status.textContent = 'That link is not recognized. Paste a standard YouTube video/Short/live link or Twitch VOD/clip link.'; return; }
    frame.src = result.embed; wrap.classList.remove('hidden'); next.classList.remove('hidden');
    status.textContent = `${result.platform} link recognized. Loading the official embedded preview…`;
  });
  $('clearLinkBtn').addEventListener('click', () => { input.value=''; frame.removeAttribute('src'); wrap.classList.add('hidden'); next.classList.add('hidden'); status.textContent='Paste a supported link to preview it here.'; });
  $('goToUploadBtn').addEventListener('click', () => $('videoFile').click());
  input.addEventListener('keydown', e => { if (e.key === 'Enter') $('previewLinkBtn').click(); });
})();
