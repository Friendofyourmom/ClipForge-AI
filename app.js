(() => {
  const $ = (id) => document.getElementById(id);
  const fileInput = $("videoFile"), video = $("preview"), empty = $("emptyPreview");
  const start = $("startTime"), end = $("endTime"), startRange = $("startRange"), endRange = $("endRange");
  const status = $("status"), exportBtn = $("exportBtn"), download = $("downloadLink");
  let sourceUrl = null, exportUrl = null, recording = false;

  function say(message) { status.textContent = message; }
  function clampTimes() {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    let a = Math.max(0, Math.min(Number(start.value) || 0, duration));
    let b = Math.max(0, Math.min(Number(end.value) || 0, duration));
    if (b <= a) b = Math.min(duration, a + 0.5);
    start.value = a.toFixed(1); end.value = b.toFixed(1);
    startRange.value = a; endRange.value = b;
  }
  function syncRange() { start.value = startRange.value; end.value = endRange.value; clampTimes(); }
  start.addEventListener("change", clampTimes); end.addEventListener("change", clampTimes);
  startRange.addEventListener("input", syncRange); endRange.addEventListener("input", syncRange);

  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { say("Please choose a video file."); return; }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    sourceUrl = URL.createObjectURL(file);
    video.src = sourceUrl;
    video.load();
    $("videoMeta").textContent = file.name;
    empty.classList.add("hidden");
    say("Video loaded. Scrub to a moment, then set the start and end.");
  });
  video.addEventListener("loadedmetadata", () => {
    const d = video.duration || 15;
    start.value = "0"; end.value = Math.min(15, d).toFixed(1);
    [startRange, endRange].forEach(r => r.max = d);
    endRange.value = end.value;
    exportBtn.disabled = false;
    clampTimes();
  });
  $("setStart").addEventListener("click", () => { start.value = video.currentTime.toFixed(1); clampTimes(); });
  $("setEnd").addEventListener("click", () => { end.value = video.currentTime.toFixed(1); clampTimes(); });

  function canvasStreamForVideo(layout, caption) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const portrait = layout === "portrait";
    canvas.width = portrait ? 720 : (video.videoWidth || 1280);
    canvas.height = portrait ? 1280 : (video.videoHeight || 720);
    let raf;
    const draw = () => {
      if (!recording) return;
      const vw = video.videoWidth || 16, vh = video.videoHeight || 9;
      const targetRatio = canvas.width / canvas.height, sourceRatio = vw / vh;
      let sx=0, sy=0, sw=vw, sh=vh;
      if (sourceRatio > targetRatio) { sw = vh * targetRatio; sx = (vw-sw)/2; }
      else { sh = vw / targetRatio; sy = (vh-sh)/2; }
      ctx.fillStyle = "#000"; ctx.fillRect(0,0,canvas.width,canvas.height);
      try { ctx.drawImage(video,sx,sy,sw,sh,0,0,canvas.width,canvas.height); } catch(e) {}
      if (caption) {
        const fontSize = Math.max(26, Math.round(canvas.width * 0.055));
        ctx.font = `800 ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.lineWidth = Math.max(4,fontSize*.16); ctx.strokeStyle = "#111";
        ctx.fillStyle = "#fff";
        const maxWidth = canvas.width * .88;
        const words = caption.split(/\s+/); let lines=[], line="";
        for (const word of words) {
          const test = line ? line+" "+word : word;
          if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line=word; } else line=test;
        }
        if (line) lines.push(line);
        lines.slice(-3).forEach((t,i,arr) => {
          const y = canvas.height - canvas.height*.08 - (arr.length-1-i)*fontSize*1.25;
          ctx.strokeText(t,canvas.width/2,y); ctx.fillText(t,canvas.width/2,y);
        });
      }
      raf = requestAnimationFrame(draw);
    };
    recording = true; draw();
    return {stream:canvas.captureStream(30), stop:()=>{recording=false;cancelAnimationFrame(raf);}};
  }

  exportBtn.addEventListener("click", async () => {
    if (!video.src || recording) return;
    const a = Number(start.value), b = Number(end.value);
    if (!(b > a) || b-a > 180) { say("Choose a valid clip up to 3 minutes for this mobile starter."); return; }
    if (!window.MediaRecorder) { say("This browser does not support local recording. Try a recent Chrome browser."); return; }
    const layout = $("layout").value, caption = $("caption").value.trim();
    const rendered = canvasStreamForVideo(layout, caption);
    const audioStream = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null);
    if (audioStream) audioStream.getAudioTracks().forEach(t => rendered.stream.addTrack(t));
    const mime = ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(t => MediaRecorder.isTypeSupported(t)) || "";
    let recorder;
    try { recorder = new MediaRecorder(rendered.stream, mime ? {mimeType:mime} : undefined); }
    catch(e) { rendered.stop(); say("This browser could not start video export."); return; }
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onerror = () => { rendered.stop(); say("Export failed. Try a shorter clip or another browser."); };
    recorder.onstop = () => {
      rendered.stop();
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      const blob = new Blob(chunks,{type:recorder.mimeType || "video/webm"});
      exportUrl = URL.createObjectURL(blob);
      download.href = exportUrl; download.classList.remove("hidden");
      download.textContent = `Download clip (${(blob.size/1024/1024).toFixed(1)} MB)`;
      exportBtn.disabled = false; exportBtn.textContent = "Export selected clip";
      say("Export ready. Your clip was processed in this browser.");
    };
    exportBtn.disabled = true; exportBtn.textContent = "Exporting…";
    download.classList.add("hidden"); say("Recording clip locally… keep this tab open.");
    video.pause(); video.currentTime = a;
    await new Promise(resolve => { const done=()=>{video.removeEventListener("seeked",done);resolve();}; video.addEventListener("seeked",done); });
    recorder.start(250);
    await video.play();
    const stopAt = () => {
      if (video.currentTime >= b || video.ended) {
        video.pause(); video.removeEventListener("timeupdate",stopAt);
        if (recorder.state !== "inactive") recorder.stop();
      }
    };
    video.addEventListener("timeupdate",stopAt);
    video.addEventListener("ended",stopAt,{once:true});
  });
  window.addEventListener("beforeunload", () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (exportUrl) URL.revokeObjectURL(exportUrl);
  });
})();