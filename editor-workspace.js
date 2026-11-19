(() => {
  const $ = id => document.getElementById(id);
  const video = $("preview"), start = $("startTime"), end = $("endTime"), fileInput = $("videoFile");
  if (!video || !start || !end) return;
  const panel = document.createElement("section");
  panel.className = "panel workspace-panel";
  panel.id = "workspacePanel";
  panel.innerHTML = `
    <div class="section-head"><div><span class="step">08</span><h2>Editing workspace</h2></div><span class="muted">Local session</span></div>
    <p class="notice">A lightweight mobile timeline and clip organiser. Each queued range can be selected or batch-exported.</p>
    <div class="wave-wrap"><canvas id="waveform" width="900" height="150" aria-label="Audio waveform overview"></canvas></div>
    <div class="timeline-track"><div class="timeline-selection" id="timelineSelection"></div></div>
    <div class="timeline-ticks"><span id="timelineStart">0:00</span><span id="timelineMiddle">—</span><span id="timelineEnd">—</span></div>
    <div class="workspace-toolbar"><button class="secondary" id="addClipBtn" type="button">＋ Add current range to queue</button><button class="secondary" id="clearQueueBtn" type="button">Clear queue</button></div>
    <div class="section-head subhead"><div><h2>Clip queue</h2></div><span class="muted" id="queueCount">0 clips</span></div>
    <div id="clipQueue" class="queue-list"><div class="workspace-empty">Your saved clip ranges will appear here.</div></div>
    <div class="section-head subhead"><div><h2>Subtitle cue builder</h2></div><span class="muted">Export as .SRT</span></div>
    <div class="cue-form">
      <label>Start (seconds)<input id="cueStart" type="number" min="0" step="0.1" value="0"></label>
      <label>End (seconds)<input id="cueEnd" type="number" min="0.1" step="0.1" value="3"></label>
      <label class="wide">Subtitle text<textarea id="cueText" rows="2" maxlength="400" placeholder="Type what is being said…"></textarea></label>
    </div>
    <div class="workspace-toolbar"><button class="secondary" id="addCueBtn" type="button">＋ Add subtitle cue</button><button class="primary" id="downloadSrtBtn" type="button">Download .SRT file</button></div>
    <div id="cueList" class="cue-list"><div class="workspace-empty">No subtitle cues added in this workspace yet.</div></div>
    <p class="workspace-note">To burn these cues into a video, download the SRT, then load it in the Timed subtitles field above before exporting.</p>`;
  $("editorPanel").after(panel);

  let queue = [], cues = [], waveToken = 0;
  const seconds = n => `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,"0")}`;
  const updateTimeline = () => {
    const d = Number.isFinite(video.duration) ? video.duration : 0;
    const a = Math.max(0, Number(start.value)||0), b = Math.max(a, Number(end.value)||0);
    $("timelineSelection").style.left = d ? `${a/d*100}%` : "0%";
    $("timelineSelection").style.width = d ? `${Math.max(0,(b-a)/d*100)}%` : "100%";
    $("timelineStart").textContent = "0:00";
    $("timelineMiddle").textContent = d ? `Selected ${seconds(a)}–${seconds(b)}` : "—";
    $("timelineEnd").textContent = d ? seconds(d) : "—";
  };
  ["input","change"].forEach(evt => {start.addEventListener(evt,updateTimeline);end.addEventListener(evt,updateTimeline);});
  video.addEventListener("loadedmetadata",updateTimeline);

  async function drawWaveform(file) {
    const token = ++waveToken, canvas = $("waveform"), ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (!file) { ctx.fillStyle="#8793aa";ctx.font="16px system-ui";ctx.fillText("Upload a video to view its waveform",18,78);return; }
    let ac;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) throw Error("Web Audio unavailable");
      ac = new Ctx();
      const decoded = await ac.decodeAudioData(await file.arrayBuffer());
      if (token !== waveToken) return;
      const data = decoded.getChannelData(0), bins = canvas.width, block = Math.max(1,Math.floor(data.length/bins));
      let max = 0, peaks = [];
      for (let x=0;x<bins;x++) {let peak=0;const from=x*block,to=Math.min(data.length,from+block);for(let i=from;i<to;i+=3)peak=Math.max(peak,Math.abs(data[i]));peaks.push(peak);max=Math.max(max,peak);}
      ctx.fillStyle="#151d2c";ctx.fillRect(0,0,canvas.width,canvas.height);
      const mid=canvas.height/2;ctx.fillStyle="#8d7cff";
      peaks.forEach((v,x)=>{const h=Math.max(2,(v/(max||1))*(canvas.height*.78));ctx.fillRect(x,mid-h/2,1.2,h);});
      ctx.strokeStyle="#4ed8c5";ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(0,mid);ctx.lineTo(canvas.width,mid);ctx.stroke();ctx.globalAlpha=1;
    } catch (err) {
      ctx.fillStyle="#8793aa";ctx.font="14px system-ui";ctx.fillText("Waveform unavailable for this file/browser",18,78);
    } finally { if(ac)try{await ac.close();}catch{} }
  }
  fileInput.addEventListener("change",()=>drawWaveform(fileInput.files && fileInput.files[0]));
  $("addClipBtn").addEventListener("click",()=>{
    const a=Number(start.value),b=Number(end.value),d=video.duration;
    if (!Number.isFinite(d) || !(b>a) || b>d) { alert("Load a video and choose a valid time range first."); return; }
    queue.push({id:Date.now()+Math.random(),start:a,end:b});renderQueue();
  });
  function renderQueue() {
    const host=$("clipQueue");host.innerHTML="";$("queueCount").textContent=`${queue.length} clip${queue.length===1?"":"s"}`;
    if(!queue.length){host.innerHTML='<div class="workspace-empty">Your saved clip ranges will appear here.</div>';return;}
    queue.forEach((clip,index)=>{
      const row=document.createElement("div");row.className="queue-item";
      const info=document.createElement("div"),strong=document.createElement("strong"),small=document.createElement("small"),actions=document.createElement("div");
      strong.textContent=`Clip ${index+1}`;small.textContent=`${seconds(clip.start)} – ${seconds(clip.end)} · ${(clip.end-clip.start).toFixed(1)} sec`;
      info.append(strong,small);actions.className="queue-actions";
      const use=document.createElement("button");use.className="secondary";use.textContent="Select";use.addEventListener("click",()=>{start.value=clip.start;end.value=clip.end;start.dispatchEvent(new Event("change"));end.dispatchEvent(new Event("change"));video.currentTime=clip.start;document.getElementById("editorPanel").scrollIntoView({behavior:"smooth"});});
      const del=document.createElement("button");del.className="secondary";del.textContent="Remove";del.addEventListener("click",()=>{queue=queue.filter(x=>x.id!==clip.id);renderQueue();});
      actions.append(use,del);row.append(info,actions);host.append(row);
    });
  }
  $("clearQueueBtn").addEventListener("click",()=>{queue=[];renderQueue();});

  const stamp = n => {const h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=Math.floor(n%60),ms=Math.round((n-Math.floor(n))*1000);return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")},${String(ms).padStart(3,"0")}`;};
  $("addCueBtn").addEventListener("click",()=>{
    const a=Number($("cueStart").value),b=Number($("cueEnd").value),text=$("cueText").value.trim();
    if(!text||!(b>a)){alert("Enter subtitle text and a valid start/end time.");return;}
    cues.push({start:a,end:b,text});cues.sort((x,y)=>x.start-y.start);$("cueText").value="";renderCues();
  });
  function renderCues(){
    const host=$("cueList");host.innerHTML="";
    if(!cues.length){host.innerHTML='<div class="workspace-empty">No subtitle cues added in this workspace yet.</div>';return;}
    cues.forEach((cue,i)=>{const row=document.createElement("div");row.className="cue-item";const info=document.createElement("div"),strong=document.createElement("strong"),small=document.createElement("small"),del=document.createElement("button");strong.textContent=cue.text;small.textContent=`${stamp(cue.start)} → ${stamp(cue.end)}`;info.append(strong,small);del.className="secondary";del.textContent="Remove";del.addEventListener("click",()=>{cues.splice(i,1);renderCues();});row.append(info,del);host.append(row);});
  }
  $("downloadSrtBtn").addEventListener("click",()=>{
    if(!cues.length){alert("Add at least one subtitle cue first.");return;}
    const body=cues.map((c,i)=>`${i+1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}`).join("\n\n")+"\n";
    const url=URL.createObjectURL(new Blob([body],{type:"text/plain;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download="clipforge-subtitles.srt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });

  // Public workspace API for exact-time project recovery and batch export.
  window.clipforgeWorkspace = {
    getQueue: () => queue.map(x => ({start:x.start,end:x.end})),
    setQueue: items => {
      queue = (Array.isArray(items) ? items : [])
        .filter(x => Number.isFinite(+x.start) && Number.isFinite(+x.end) && +x.end > +x.start)
        .map(x => ({id:Date.now()+Math.random(),start:+x.start,end:+x.end}));
      renderQueue();
    },
    getCues: () => cues.map(x => ({start:x.start,end:x.end,text:x.text})),
    setCues: items => {
      cues = (Array.isArray(items) ? items : [])
        .filter(x => Number.isFinite(+x.start) && Number.isFinite(+x.end) && +x.end > +x.start && String(x.text||"").trim())
        .map(x => ({start:+x.start,end:+x.end,text:String(x.text)}));
      renderCues();
    }
  };
  drawWaveform(null);updateTimeline();
})();