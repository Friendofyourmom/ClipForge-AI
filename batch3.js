(() => {
 const $=id=>document.getElementById(id), video=$('preview'), fileInput=$('videoFile');
 if(!video||!fileInput)return;
 const panel=document.createElement('section');panel.className='panel batch3-panel';panel.id='batch3Panel';
 panel.innerHTML=`
 <div class="section-head"><div><span class="step">09</span><h2>Automatic subtitles</h2></div><span class="muted">Optional local model</span></div>
 <p class="b3-note">Downloads Whisper Tiny on first use (large download). Speech is processed in your browser. Phone memory and speed vary; start with a short video or range.</p>
 <div class="b3-actions"><button class="primary" id="b3Transcribe" disabled>Transcribe selected range</button><button class="secondary" id="b3SaveSrt" disabled>Download SRT</button></div><div class="b3-progress"><i id="b3Progress"></i></div><div class="b3-status" id="b3TranscribeStatus">Choose a local video to enable transcription.</div>
 <div class="section-head subhead"><div><h2>Highlight scan</h2></div></div><p class="b3-note">Ranks windows using audio energy and a speech-activity heuristic. It does not understand the content of the video.</p><button class="secondary full" id="b3Analyze" disabled>Scan for highlight candidates</button><div class="b3-status" id="b3AnalyzeStatus"></div><div class="b3-list" id="b3Candidates"></div>
 <div class="section-head subhead"><div><h2>Batch export queue</h2></div><span class="muted" id="b3QueueCount">0 clips</span></div><p class="b3-note">Add ranges in the Editing Workspace, then export them together as a ZIP of WebM clips.</p><button class="primary full" id="b3BatchExport" disabled>Export queued clips as ZIP</button><div class="b3-status" id="b3BatchStatus"></div>
 <div class="section-head subhead"><div><h2>Format presets</h2></div></div><label>Platform preset<select id="b3Preset"><option value="shorts">YouTube Shorts · 9:16</option><option value="tiktok">TikTok · 9:16</option><option value="reels">Instagram Reels · 9:16</option><option value="source">Keep source aspect ratio</option></select></label><p class="b3-note" id="b3PresetNote">Vertical 9:16, exported as 720 × 1280 WebM.</p>
 <div class="section-head subhead"><div><h2>Project recovery</h2></div><span class="muted">This device only</span></div><p class="b3-note">Editing settings, queued ranges and subtitle cues are saved in this browser. Your video file is not saved; reselect it after reopening.</p><div class="b3-actions"><button class="secondary" id="b3Restore">Restore saved project</button><button class="secondary" id="b3ClearSave">Clear saved project</button></div><div class="b3-status" id="b3RecoveryStatus">Project recovery is ready.</div>`;
 ( $('workspacePanel')||$('editorPanel') ).after(panel);
 let file=null,asr=null,transcript=[],busy=false;
 const say=(id,msg)=>$(id).textContent=msg, progress=n=>$('b3Progress').style.width=Math.max(0,Math.min(100,n))+'%';
 const stamp=n=>{const h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=Math.floor(n%60),ms=Math.round((n-Math.floor(n))*1000);return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`};
 const makeSrt=()=>transcript.map((c,i)=>`${i+1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}`).join('\n\n')+'\n';
 const selectedRange=()=>{const d=Number(video.duration)||0;let a=0,b=d;if($('analysisScope').value==='range'){a=Number($('startTime').value)||0;b=Number($('endTime').value)||0;}a=Math.max(0,Math.min(a,d));b=Math.max(0,Math.min(b,d));return{a,b};};
 const queueApi=()=>window.clipforgeWorkspace;
 const queueItems=()=>queueApi()?.getQueue?.()||[];
 function refresh(){
   const q=queueItems();$('b3QueueCount').textContent=`${q.length} clips`;
   $('b3BatchExport').disabled=!file||!q.length;
   $('b3Analyze').disabled=!file;$('b3Transcribe').disabled=!file;
 }
 fileInput.addEventListener('change',()=>{file=fileInput.files?.[0]||null;refresh();});
 const waitSeek=t=>new Promise((resolve,reject)=>{
   if(Math.abs(video.currentTime-t)<.04)return resolve();
   let timer=setTimeout(()=>{video.removeEventListener('seeked',done);reject(Error('Video seek timed out'));},12000);
   function done(){clearTimeout(timer);resolve();}
   video.addEventListener('seeked',done,{once:true});video.currentTime=t;
 });
 $('b3Transcribe').onclick=async()=>{
   if(!file||busy)return;busy=true;const btn=$('b3Transcribe');btn.disabled=true;progress(1);
   let audioCtx=null;
   try{
     say('b3TranscribeStatus','Loading speech model…');
     if(!asr){const lib=await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');asr=await lib.pipeline('automatic-speech-recognition','Xenova/whisper-tiny',{progress_callback:p=>{if(p.status==='progress'&&p.total)progress(Math.min(65,Math.round(65*p.loaded/p.total)));}});}
     say('b3TranscribeStatus','Decoding audio…');
     const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Web Audio is unavailable in this browser.');
     audioCtx=new AC();const decoded=await audioCtx.decodeAudioData(await file.arrayBuffer());const {a,b}=selectedRange();
     if(!(b>a))throw Error('Choose a valid time range.');
     const first=Math.floor(a*decoded.sampleRate),last=Math.min(decoded.length,Math.floor(b*decoded.sampleRate));
     if(last<=first)throw Error('The selected range contains no audio.');
     const mono=new Float32Array(last-first);
     for(let ch=0;ch<decoded.numberOfChannels;ch++){const channel=decoded.getChannelData(ch);for(let i=first;i<last;i++)mono[i-first]+=channel[i]/decoded.numberOfChannels;}
     await audioCtx.close();audioCtx=null;
     const ratio=decoded.sampleRate/16000,out=new Float32Array(Math.max(1,Math.floor(mono.length/ratio)));
     for(let i=0;i<out.length;i++){const p=i*ratio,l=Math.floor(p),h=Math.min(mono.length-1,l+1);out[i]=mono[l]*(1-(p-l))+mono[h]*(p-l);}
     say('b3TranscribeStatus','Transcribing locally… keep this tab open.');
     const result=await asr(out,{chunk_length_s:20,stride_length_s:3,return_timestamps:true});
     transcript=(result.chunks||[]).map(c=>{const st=Number(c.timestamp?.[0]??0),en=Number(c.timestamp?.[1]??(st+3));return{start:a+st,end:a+Math.max(st+.1,en),text:String(c.text||'').trim()};}).filter(c=>c.text);
     if(!transcript.length&&result.text?.trim())transcript=[{start:a,end:b,text:result.text.trim()}];
     if(!transcript.length)throw Error('No speech was detected in that range.');
     const srtFile=new File([makeSrt()],'clipforge-auto-captions.srt',{type:'text/plain'});
     const transfer=new DataTransfer();transfer.items.add(srtFile);$('srtFile').files=transfer.files;$('srtFile').dispatchEvent(new Event('change',{bubbles:true}));
     $('b3SaveSrt').disabled=false;progress(100);say('b3TranscribeStatus',`Created ${transcript.length} subtitle segments. Review the captions before exporting.`);
   }catch(e){progress(0);say('b3TranscribeStatus','Transcription unavailable: '+(e.message||e)+'. Try a shorter range or another browser.');}
   finally{if(audioCtx)try{await audioCtx.close();}catch{}busy=false;btn.disabled=!file;}
 };
 $('b3SaveSrt').onclick=()=>{if(!transcript.length)return;const url=URL.createObjectURL(new Blob([makeSrt()],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='clipforge-auto-captions.srt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);};
 $('b3Analyze').onclick=async()=>{
   if(!file||busy)return;busy=true;$('b3Analyze').disabled=true;
   let ac=null;
   try{
     say('b3AnalyzeStatus','Measuring audio activity…');
     const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Web Audio is unavailable.');
     ac=new AC();const decoded=await ac.decodeAudioData(await file.arrayBuffer());const {a,b}=selectedRange();
     if(!(b>a))throw Error('Choose a valid analysis range.');
     const hop=.5,n=Math.ceil((b-a)/hop);if(n<1)throw Error('Selected range is too short to scan.');
     const values=new Float32Array(n);
     for(let k=0;k<n;k++){const st=Math.floor((a+k*hop)*decoded.sampleRate),en=Math.min(decoded.length,st+Math.floor(hop*decoded.sampleRate));let sum=0,count=0;for(let ch=0;ch<decoded.numberOfChannels;ch++){const d=decoded.getChannelData(ch);for(let i=st;i<en;i+=4){sum+=d[i]*d[i];count++;}}values[k]=Math.sqrt(sum/Math.max(1,count));}
     await ac.close();ac=null;
     const length=Number($('candidateLength').value)||20,span=b-a;
     if(span<length){throw Error(`The selected range is only ${span.toFixed(1)} seconds; choose a shorter candidate length.`);}
     const max=Math.max(0,...values)||1,candidates=[];
     for(let t=0;t+length<=span+.001;t+=Math.max(5,length/2)){
       const lo=Math.floor(t/hop),hi=Math.min(n,Math.ceil((t+length)/hop));let sum=0,active=0;
       for(let i=lo;i<hi;i++){sum+=values[i];if(values[i]>.012)active++;}
       const count=Math.max(1,hi-lo),energy=sum/count/max,activity=active/count;
       candidates.push({start:a+t,end:Math.min(b,a+t+length),score:.7*energy+.3*activity});
     }
     candidates.sort((x,y)=>y.score-x.score);const chosen=[];
     for(const c of candidates){if(chosen.every(x=>Math.abs(x.start-c.start)>length*.65))chosen.push(c);if(chosen.length===5)break;}
     const host=$('b3Candidates');host.innerHTML='';
     chosen.forEach((c,i)=>{const row=document.createElement('div'),title=document.createElement('strong'),small=document.createElement('small'),btn=document.createElement('button');row.className='b3-result';title.textContent=`Candidate ${i+1} · ${c.start.toFixed(1)}–${c.end.toFixed(1)} sec`;small.textContent=`Audio activity score ${Math.round(c.score*100)}/100`;btn.className='secondary';btn.textContent='Use this range';btn.onclick=()=>{$('startTime').value=c.start.toFixed(1);$('endTime').value=c.end.toFixed(1);$('startTime').dispatchEvent(new Event('change'));$('endTime').dispatchEvent(new Event('change'));video.currentTime=c.start;};row.append(title,small,btn);host.append(row);});
     say('b3AnalyzeStatus',`Ranked ${chosen.length} candidate windows. Listen to them before using; loudness is not the same as an interesting moment.`);
   }catch(e){say('b3AnalyzeStatus','Scan failed: '+(e.message||e));}
   finally{if(ac)try{await ac.close();}catch{}busy=false;$('b3Analyze').disabled=!file;}
 };
 $('b3BatchExport').onclick=async()=>{
   const ranges=queueItems();if(!file||!ranges.length){say('b3BatchStatus','Load a video and add ranges in the Editing Workspace first.');return;}
   const btn=$('b3BatchExport');btn.disabled=true;let activeStream=null,activeRecorder=null,raf=0;
   try{
     const mod=await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm'),zip=new mod.default();
     const portrait=$('layout').value==='portrait',staticCaption=$('caption').value.trim();
     const srtText=$('srtFile').files?.[0]?await $('srtFile').files[0].text():'';
     const cues=srtText.replace(/\r/g,'').trim().split(/\n{2,}/).map(block=>{const lines=block.split('\n'),ix=lines.findIndex(x=>x.includes('-->'));if(ix<0)return null;const parts=lines[ix].split('-->').map(x=>x.trim()),toSec=x=>{const m=x.match(/(\d+):(\d+):(\d+)[,.](\d+)/);return m?+m[1]*3600+ +m[2]*60+ +m[3]+ +m[4]/1000:NaN;};const start=toSec(parts[0]),end=toSec(parts[1]);return Number.isFinite(start)&&end>start?{start,end,text:lines.slice(ix+1).join(' ').trim()}:null;}).filter(Boolean);
     for(let j=0;j<ranges.length;j++){
       const {start,end}=ranges[j];if(!(end>start)||end>video.duration)throw Error(`Clip ${j+1} has an invalid time range.`);
       say('b3BatchStatus',`Exporting clip ${j+1} of ${ranges.length}…`);
       const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=portrait?720:(video.videoWidth||1280);canvas.height=portrait?1280:(video.videoHeight||720);
       activeStream=canvas.captureStream(30);const audio=video.captureStream?.()||video.mozCaptureStream?.();if(audio)audio.getAudioTracks().forEach(t=>activeStream.addTrack(t));
       const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x))||'';
       activeRecorder=new MediaRecorder(activeStream,mime?{mimeType:mime}:undefined);const chunks=[];
       activeRecorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
       await waitSeek(start);
       let drawing=true;
       const draw=()=>{if(!drawing)return;const vw=video.videoWidth||16,vh=video.videoHeight||9,tr=canvas.width/canvas.height,sr=vw/vh;let sx=0,sy=0,sw=vw,sh=vh;if(sr>tr){sw=vh*tr;sx=(vw-sw)/2;}else{sh=vw/tr;sy=(vh-sh)/2;}ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);try{ctx.drawImage(video,sx,sy,sw,sh,0,0,canvas.width,canvas.height);}catch{}const cue=cues.find(c=>video.currentTime>=c.start&&video.currentTime<=c.end);const caption=cue?.text||(!cues.length?staticCaption:'');if(caption){const fs=Math.max(24,Math.round(canvas.width*.052));ctx.font=`800 ${fs}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=Math.max(4,fs*.16);ctx.strokeStyle='#111';ctx.fillStyle='#fff';ctx.strokeText(caption,canvas.width/2,canvas.height*.82);ctx.fillText(caption,canvas.width/2,canvas.height*.82);}raf=requestAnimationFrame(draw);};
       draw();activeRecorder.start(250);await video.play();
       await new Promise((resolve,reject)=>{const check=()=>{if(video.currentTime>=end||video.ended){video.pause();resolve();}else raf=requestAnimationFrame(check);};const timeout=setTimeout(()=>{video.pause();reject(Error('Export timed out; try a shorter clip.'));},Math.max(30000,(end-start)*3000));const originalCheck=check;const checkWithTimeout=()=>{if(video.currentTime>=end||video.ended){clearTimeout(timeout);video.pause();resolve();}else raf=requestAnimationFrame(checkWithTimeout);};checkWithTimeout();});
       drawing=false;cancelAnimationFrame(raf);const recorder=activeRecorder;const blobPromise=new Promise(resolve=>{recorder.onstop=()=>resolve(new Blob(chunks,{type:recorder.mimeType||'video/webm'}));});recorder.stop();const blob=await blobPromise;activeStream.getTracks().forEach(t=>t.stop());activeStream=null;activeRecorder=null;zip.file(`clipforge-${String(j+1).padStart(2,'0')}.webm`,blob);
     }
     say('b3BatchStatus','Creating ZIP file…');const blob=await zip.generateAsync({type:'blob'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='clipforge-batch-clips.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);say('b3BatchStatus',`Finished: ${ranges.length} WebM clips packaged in one ZIP.`);
   }catch(e){say('b3BatchStatus','Batch export failed: '+(e.message||e)+'. Try fewer or shorter clips.');}
   finally{cancelAnimationFrame(raf);if(activeRecorder&&activeRecorder.state!=='inactive')try{activeRecorder.stop();}catch{}if(activeStream)activeStream.getTracks().forEach(t=>t.stop());btn.disabled=false;}
 };
 const storageKey='clipforge-project-v4';
 function saveProject(){
   try{const data={start:$('startTime').value,end:$('endTime').value,layout:$('layout').value,captionStyle:$('captionStyle').value,caption:$('caption').value,topic:$('topic').value,scope:$('analysisScope').value,length:$('candidateLength').value,queue:queueItems(),cues:queueApi()?.getCues?.()||[]};localStorage.setItem(storageKey,JSON.stringify(data));say('b3RecoveryStatus','Project settings and ranges autosaved on this device.');}
   catch(e){say('b3RecoveryStatus','Autosave unavailable; browser storage may be disabled or full.');}
 }
 let saveTimer;const scheduleSave=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(saveProject,400);};
 document.addEventListener('input',e=>{if(!e.target.closest('#batch3Panel'))scheduleSave();});
 document.addEventListener('change',e=>{if(!e.target.closest('#batch3Panel'))scheduleSave();});
 for(const id of ['clipQueue','cueList'])if($(id))new MutationObserver(()=>{scheduleSave();refresh();}).observe($(id),{childList:true,subtree:true});
 $('b3Restore').onclick=()=>{
   try{
     const data=JSON.parse(localStorage.getItem(storageKey)||'null');if(!data){say('b3RecoveryStatus','No saved project found on this device.');return;}
     const fields={startTime:data.start,endTime:data.end,layout:data.layout,captionStyle:data.captionStyle,caption:data.caption,topic:data.topic,analysisScope:data.scope,candidateLength:data.length};
     Object.entries(fields).forEach(([id,val])=>{if(val!==undefined&&$(id))$(id).value=val;});
     if(queueApi()?.setQueue)queueApi().setQueue(data.queue||[]);
     if(queueApi()?.setCues)queueApi().setCues(data.cues||[]);
     say('b3RecoveryStatus','Project restored. Reselect your video file to continue; the video itself is not saved.');
     refresh();
   }catch(e){say('b3RecoveryStatus','Could not restore saved project: '+(e.message||e));}
 };
 $('b3ClearSave').onclick=()=>{localStorage.removeItem(storageKey);say('b3RecoveryStatus','Saved project cleared from this browser.');};
 const presetText={shorts:'YouTube Shorts: vertical 9:16, 720 × 1280 WebM.',tiktok:'TikTok: vertical 9:16, 720 × 1280 WebM.',reels:'Instagram Reels: vertical 9:16, 720 × 1280 WebM.',source:'Source aspect ratio: original video dimensions.'};
 $('b3Preset').onchange=()=>{const p=$('b3Preset').value;$('layout').value=p==='source'?'original':'portrait';$('b3PresetNote').textContent=presetText[p];scheduleSave();};
 if($('clipQueue'))new MutationObserver(refresh).observe($('clipQueue'),{childList:true,subtree:true});
 fileInput.addEventListener('change',refresh);refresh();say('b3RecoveryStatus','Project recovery is ready. Settings and ranges autosave locally.');
})();