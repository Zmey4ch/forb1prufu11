// ===== DTZ B1 тренажёр — логика =====
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
const pick=a=>a[Math.random()*a.length|0];
const norm=s=>String(s).toLowerCase().replace(/[.,!?;:„“"«»]/g," ").replace(/\s+/g," ").trim();

// ---------- хранение прогресса (только в этом браузере) ----------
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let STATS=store.get("dtz-stats",{});
function record(sec,ok){const s=STATS[sec]||(STATS[sec]={c:0,t:0});s.t++;if(ok)s.c++;store.set("dtz-stats",STATS);renderNav();}

// ---------- возможности Claude ----------
const CAPS={sample:null,tts:null,dict:null,ready:false};
// --- Запасные варианты для GitHub Pages ---
function apiSample(){
  const key=store.get("dtz-apikey","");if(!key)return null;
  const model=store.get("dtz-model","claude-sonnet-5-5")||"claude-sonnet-5-5";
  return async(input,opts={})=>{
    const messages=typeof input==="string"?[{role:"user",content:input}]:input;
    let res;
    try{res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model,max_tokens:2500,messages})});}
    catch(e){throw{code:"network",message:"Нет соединения с API"};}
    const j=await res.json().catch(()=>({}));
    if(!res.ok)throw{code:res.status===429?"rate_limited":res.status===401?"bad_key":"api_error",message:(j.error&&j.error.message)||("HTTP "+res.status)};
    const text=(j.content||[]).filter(c=>c.type==="text").map(c=>c.text).join("");
    if(opts.onText)opts.onText({text,delta:text});
    return{text,truncated:j.stop_reason==="max_tokens"};
  };
}
function browserDictation(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return null;
  let rec=null,cb={final:()=>{},partial:()=>{},state:()=>{}};
  return{browser:true,onFinal:f=>cb.final=f,onPartial:f=>cb.partial=f,onState:f=>cb.state=f,
    start(){return new Promise((ok,bad)=>{let started=false,lastErr=null;try{rec=new SR();rec.lang="de-DE";rec.continuous=true;rec.interimResults=true;
      rec.onresult=e=>{let interim="";for(let i=e.resultIndex;i<e.results.length;i++){const r=e.results[i];if(r.isFinal)cb.final({text:r[0].transcript.trim()});else interim+=r[0].transcript;}cb.partial({text:interim});};
      rec.onerror=e=>{lastErr=e.error;if(!started)bad({code:e.error});else cb.state({state:"idle",reason:e.error});};
      rec.onend=()=>{if(started)cb.state({state:"idle",reason:lastErr||"stopped"});else if(!lastErr)bad({code:"timeout"});};rec.onstart=()=>{started=true;clearTimeout(to);cb.state({state:"listening"});ok();};
      const to=setTimeout(()=>{if(!started){try{rec.abort();}catch(e){}bad({code:"timeout"});}},5000);rec.start();}catch(e){bad({code:"start-failed"});}});},
    stop(){try{rec&&rec.stop();}catch(e){}return Promise.resolve();}};
}
// --- Распознавание на устройстве (Whisper через transformers.js) — для Opera, Brave, Firefox и др. ---
let ASR=null,ASR_LOADING=null;
function loadASR(onProgress){
  if(ASR)return Promise.resolve(ASR);
  if(!ASR_LOADING)ASR_LOADING=(async()=>{
    const T=await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3");
    const files={};
    ASR=await T.pipeline("automatic-speech-recognition","Xenova/whisper-base",{progress_callback:p=>{
      if(p.status==="progress"&&p.total){files[p.file]=[p.loaded,p.total];const L=Object.values(files).reduce((a,b)=>a+b[0],0),Tt=Object.values(files).reduce((a,b)=>a+b[1],0);onProgress&&onProgress(Math.round(L/Tt*100));}}});
    return ASR;})().catch(e=>{ASR_LOADING=null;throw e;});
  return ASR_LOADING;
}
function whisperDictation(){
  if(!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder))return null;
  let cb={final:()=>{},partial:()=>{},state:()=>{}},rec=null,stream=null,chunks=[];
  return{whisper:true,onFinal:f=>cb.final=f,onPartial:f=>cb.partial=f,onState:f=>cb.state=f,
    async start(){
      try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}
      catch(e){throw{code:e&&e.name==="NotFoundError"?"audio-capture":"not-allowed"};}
      chunks=[];rec=new MediaRecorder(stream);rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      rec.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());
        try{cb.state({state:"processing"});
          const blob=new Blob(chunks,{type:rec.mimeType});
          const ctx=new (window.AudioContext||window.webkitAudioContext)({sampleRate:16000});
          const buf=await ctx.decodeAudioData(await blob.arrayBuffer());const pcm=buf.getChannelData(0);ctx.close();
          if(pcm.length<16000*0.4){cb.state({state:"idle",reason:"no-speech"});return;}
          cb.partial({text:ASR?"⏳ Распознаю речь…":"⏳ Загружаю модель распознавания…"});
          const asr=await loadASR(pc=>cb.partial({text:`⏳ Загружаю модель распознавания (только в первый раз): ${pc}%`}));
          cb.partial({text:"⏳ Распознаю речь…"});
          const out=await asr(pcm,{language:"german",task:"transcribe",chunk_length_s:30,stride_length_s:5});
          const text=(Array.isArray(out)?out.map(o=>o.text).join(" "):out.text||"").trim();
          if(text)cb.final({text});cb.state({state:"idle",reason:text?"stopped":"no-speech"});
        }catch(e){console.error(e);cb.state({state:"idle",reason:"whisper-failed"});}};
      rec.start();cb.state({state:"listening"});
      loadASR(pc=>cb.partial({text:`🎙 Запись идёт… (модель загружается: ${pc}%)`})).catch(()=>{});
    },
    stop(){try{if(rec&&rec.state!=="inactive")rec.stop();}catch(e){}return Promise.resolve();}};
}
const BROKEN_SR=/OPR\/|OPX\/|YaBrowser|Vivaldi|SamsungBrowser/.test(navigator.userAgent)||!!navigator.brave;
const MIC_ERR={"not-allowed":"Нет доступа к микрофону. Нажмите на значок 🔒/🎤 в адресной строке и разрешите микрофон, затем попробуйте снова.","not_granted":"Нет доступа к микрофону. Разрешите его в настройках браузера.",
  "service-not-allowed":"Браузер не разрешает распознавание речи на этой странице.","network":"Распознавание речи в этом браузере не работает (нужен интернет и Google Chrome или Microsoft Edge; в Opera, Brave, Яндекс.Браузере оно обычно не работает).",
  "audio-capture":"Микрофон не найден. Проверьте, что он подключён и выбран в Windows.","no-speech":"Ничего не слышно — говорите громче или ближе к микрофону и нажмите ещё раз.","language-not-supported":"Немецкий язык не поддерживается этим браузером.","start-failed":"Не удалось включить микрофон.","timeout":"Встроенное распознавание речи в этом браузере не отвечает.","whisper-failed":"Не получилось распознать речь (нужен интернет при первой загрузке модели). Попробуйте ещё раз."};
function micMsg(code){let m=MIC_ERR[code]||("Микрофон не сработал ("+code+").");
  if(location.protocol==="file:"&&/not-allowed|service|start-failed/.test(code))m+=" Внимание: при открытии файла двойным кликом браузер часто блокирует микрофон — откройте сайт через GitHub Pages.";return m;}
async function loadCaps(){
  for(let i=0;i<30&&!(window.claude&&window.claude.use);i++) await new Promise(r=>setTimeout(r,100));
  let s=null,t=null,d=null;
  if(window.claude&&window.claude.use){[s,t,d]=await Promise.all(["sample","tts","dictation"].map(n=>window.claude.use(n).catch(()=>null)));CAPS.inClaude=true;}
  CAPS.sample=s||apiSample();CAPS.tts=t;CAPS.dict=d||(BROKEN_SR?null:browserDictation())||whisperDictation();CAPS.lt=!CAPS.inClaude;CAPS.ready=true;
  registerDict(CAPS.dict);
  refreshCapUI();
}
function registerDict(D){
  if(D){D.onFinal(({text})=>{if(DICT.target){const ta=DICT.target;ta.value=(ta.value.trim()+" "+text).trim();ta.dispatchEvent(new Event("input"));}});
        D.onPartial(({text})=>{if(DICT.preview&&text)DICT.preview.textContent=/^[⏳🎙]/u.test(text)?text:"🎙 "+text;});
        D.onState(({state,reason})=>{DICT.state=state;$$(".mic").forEach(b=>{const on=state==="listening"&&b._ta===DICT.target;b.classList.toggle("on",on);b.textContent=on?"■ Стоп":(state==="processing"&&b._ta===DICT.target)?"⏳ …":"🎤 Говорить";b.disabled=state==="processing";});
          if(!DICT.preview)return;
          if(state==="processing")return;
          if(state==="listening")DICT.preview.textContent=D.whisper?"🎙 Запись идёт… говорите по-немецки, потом нажмите «Стоп» — текст появится через несколько секунд.":"🎙 Слушаю… говорите по-немецки. Нажмите «Стоп», когда закончите.";
          else if(reason&&MIC_ERR[reason]&&reason!=="aborted")DICT.preview.innerHTML=`<span style="color:var(--bad)">${esc(micMsg(reason))}</span>`;
          else DICT.preview.textContent="";});}
  refreshCapUI();
}
function refreshCapUI(){$$("[data-need]").forEach(el=>{const k=el.dataset.need;el.hidden=k==="speak"?!canSpeak():!CAPS[k];});$$("[data-noai]").forEach(el=>el.hidden=!!CAPS.sample||!CAPS.ready);}

// ---------- озвучка ----------
// Готовые аудиофайлы (Silero): audio/manifest.json = {"<hash>":"<file>"}
let AUDIO={};
function fnv(t){let h=0x811c9dc5;for(const b of new TextEncoder().encode(t)){h^=b;h=Math.imul(h,0x01000193)>>>0;}return h.toString(16).padStart(8,"0");}
async function loadAudio(){if(window.AUDIO_MANIFEST){AUDIO=window.AUDIO_MANIFEST;return;}try{const r=await fetch("audio/manifest.json",{cache:"no-cache"});if(r.ok)AUDIO=await r.json();}catch(e){}}
let curAudio=null;
function playFiles(lines,btn){return new Promise(res=>{let i=0;
  const next=()=>{if(i>=lines.length){curAudio=null;res();return;}const f=AUDIO[fnv(lines[i].t)];const a=new Audio("audio/"+f);a.playbackRate=lines.slow?.8:1;curAudio=a;i++;a.onended=next;a.onerror=next;a.play().catch(()=>{curAudio=null;res();});};
  next();});}
let speakingBtn=null;
async function speak(lines,btn){
  if(typeof lines==="string") lines=[{t:lines}];
  if(speakingBtn){speakingBtn.textContent=speakingBtn._label;}
  if(curAudio){curAudio.pause();curAudio=null;}
  if(lines.length&&lines.every(l=>AUDIO[fnv(l.t)])){
    if(btn){btn._label=btn._label||btn.textContent;btn.textContent="⏸ …";speakingBtn=btn;}
    await playFiles(lines,btn);if(btn)btn.textContent=btn._label;speakingBtn=null;return;
  }
  if(CAPS.tts){
    try{ if(btn){btn._label=btn._label||btn.textContent;btn.textContent="⏸ …";speakingBtn=btn;}
      await CAPS.tts.speak(lines.map(l=>({text:l.t,voice:l.v||"buttery",language:"de"})));
    }catch(e){} finally{if(btn)btn.textContent=btn._label;speakingBtn=null;}
    return;
  }
  if(window.speechSynthesis){
    speechSynthesis.cancel();
    const voices=speechSynthesis.getVoices().filter(v=>/^de/i.test(v.lang));
    lines.forEach((l,i)=>{const u=new SpeechSynthesisUtterance(l.t);u.lang="de-DE";u.rate=.92;if(voices.length)u.voice=voices[i%voices.length];speechSynthesis.speak(u);});
  }
}
const canSpeak=()=>!!CAPS.tts||!!window.speechSynthesis||Object.keys(AUDIO).length>0;
function playBtn(text,label="🔊"){const b=document.createElement("button");b.className="btn sec small";b.textContent=label;b.onclick=()=>speak(text,b);return b;}

// ---------- диктовка ----------
const DICT={target:null,preview:null,state:"idle"};
function micFor(ta,preview){
  const b=document.createElement("button");b.className="btn sec small mic";b.textContent="🎤 Говорить";b.dataset.need="dict";b.hidden=!CAPS.dict;b._ta=ta;
  b.onclick=()=>{const d=CAPS.dict;if(!d)return;
    if(DICT.state==="processing")return;
    if(DICT.state==="listening"){d.stop().catch(()=>{});return;}
    DICT.target=ta;DICT.preview=preview;if(preview)preview.textContent="Включаю микрофон…";
    d.start().catch(e=>{const c=(e&&e.code)||"start-failed";
      if(c==="timeout"&&!d.whisper){const w=whisperDictation();if(w){CAPS.dict=w;registerDict(w);if(preview)preview.innerHTML=`<span style="color:var(--bad)">Встроенное распознавание в этом браузере не отвечает — включил распознавание на устройстве. Нажмите «Говорить» ещё раз.</span>`;return;}}
      if(preview)preview.innerHTML=`<span style="color:var(--bad)">${esc(micMsg(c))}</span>`;});};
  return b;
}

// ---------- LanguageTool (бесплатно, без ключа; только вне Claude) ----------
async function ltCheck(text,box){
  if(text.trim().split(/\s+/).length<3){box.innerHTML=`<div class="fb info">Напишите хотя бы одно предложение.</div>`;return;}
  box.innerHTML=`<div class="fb info"><span class="spin"></span> Проверяю грамматику…</div>`;
  try{const r=await fetch("https://api.languagetool.org/v2/check",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({text,language:"de-DE",motherTongue:"ru",level:"default"})});
    if(r.status===429)throw new Error("Слишком много проверок подряд — подождите минуту.");
    if(!r.ok)throw new Error("Сервис ответил ошибкой "+r.status);
    const j=await r.json();const M=(j.matches||[]).filter(m=>!/WHITESPACE|PUNCTUATION_PARAGRAPH_END/.test(m.rule.id));
    let html="",last=0;const sorted=[...M].sort((a,b)=>a.offset-b.offset);
    sorted.forEach((m,i)=>{if(m.offset<last)return;html+=esc(text.slice(last,m.offset))+`<mark title="${esc(m.message)}" style="background:var(--bad-soft);color:var(--bad);border-radius:3px">${esc(text.slice(m.offset,m.offset+m.length))}<sup>${i+1}</sup></mark>`;last=m.offset+m.length;});
    html+=esc(text.slice(last));
    box.innerHTML=`<div class="card" style="margin:12px 0 0"><div class="row" style="justify-content:space-between"><b>Проверка грамматики</b><span class="score">${M.length?M.length+" замеч.":"✓"}</span></div>
      ${M.length?`<div class="textbox" style="margin:10px 0">${html}</div>${sorted.map((m,i)=>`<div class="err"><b style="color:var(--ink)">${i+1}.</b> <s>${esc(text.slice(m.offset,m.offset+m.length))}</s> ${m.replacements.length?"→ <b>"+m.replacements.slice(0,3).map(r=>esc(r.value)).join(" / ")+"</b>":""}<div class="small muted">${esc(m.message)}</div></div>`).join("")}`:`<div class="fb ok">Ошибок не найдено.</div>`}
      <p class="small muted">Проверка: <a href="https://languagetool.org" target="_blank">LanguageTool</a> (бесплатно, без ключа). Находит грамматику, согласование, орфографию, но не оценивает содержание и не все ошибки порядка слов.</p></div>`;
    record("languagetool",M.length===0);
  }catch(e){box.innerHTML=`<div class="fb bad">Не удалось проверить: ${esc(e.message==="Failed to fetch"?"нет соединения с LanguageTool (проверьте интернет или попробуйте позже)":e.message||"нет соединения")}</div>`;}
}
const ltBtn=()=>`<button class="btn sec lt" data-need="lt" hidden>Проверка грамматики (бесплатно)</button>`;

// ---------- ИИ ----------
function parseJSON(t){const a=t.indexOf("{"),b=t.lastIndexOf("}");if(a<0||b<0)throw new Error("no json");return JSON.parse(t.slice(a,b+1));}
async function askClaude(input,onText){
  const r=await CAPS.sample(input,{modelTier:"default",onText:onText?({text})=>onText(text):undefined});
  return r.text;
}
const CRIT={
  schreiben:["Erfüllung der Aufgabe (alle 4 Leitpunkte)","Textaufbau und Register (Anrede, Einleitung, Schluss, Gruß, Sie/du einheitlich)","Grammatik und Satzbau","Wortschatz"],
  sprechen1:["Inhalt (alle Punkte der Vorstellung)","Zusammenhang und Flüssigkeit","Grammatik und Satzbau","Wortschatz"],
  sprechen2:["Bildbeschreibung (passt zum Bild, Details, Position: links/rechts/vorne/hinten)","Über eigene Erfahrungen sprechen (Fragen beantwortet, Beispiele, Begründungen)","Grammatik und Satzbau","Wortschatz"],
  sprechen3:["Aufgabe gelöst (alle Punkte gemeinsam geplant)","Interaktion (Vorschläge machen, reagieren, zustimmen/ablehnen mit Begründung)","Grammatik und Satzbau","Wortschatz"],
};
async function aiEvaluate(kind,task,answer,box){
  box.innerHTML=`<div class="fb info"><span class="spin"></span> Claude проверяет ответ…</div>`;
  const oral=kind!=="schreiben";
  const prompt=`Du bist erfahrene Prüferin für den „Deutsch-Test für Zuwanderer“ (DTZ, Niveau A2–B1). Bewerte die Antwort eines Lernenden streng, aber fair und motivierend, nach den Kriterien des DTZ.
Die Muttersprache des Lernenden ist Russisch: Schreibe alle Felder mit der Endung _ru auf Russisch. Korrekturen (richtig) und die Musterlösung schreibst du auf Deutsch.
${oral?"Dies ist eine mündliche Aufgabe; der Text kann per Spracherkennung entstanden sein. Ignoriere deshalb Zeichensetzung und Groß-/Kleinschreibung, bewerte aber Grammatik, Wortstellung und Wortwahl.":"Dies ist eine schriftliche Aufgabe (ca. 80 Wörter, 30 Minuten). Bewerte auch Rechtschreibung."}

AUFGABE:
${task}

ANTWORT DES LERNENDEN:
"""${answer}"""

KRITERIEN (je 0–5 Punkte): ${CRIT[kind].map((c,i)=>(i+1)+". "+c).join("; ")}.

Antworte AUSSCHLIESSLICH mit gültigem JSON, ohne Text davor oder danach, nach diesem Schema:
{"niveau":"B1" | "A2" | "unter A2",
 "kriterien":[{"name":"<Kriterium auf Russisch>","punkte":0-5,"kommentar_ru":"<1–2 Sätze>"}],
 "leitpunkte":[{"punkt":"<Leitpunkt>","erfuellt":true|false,"kommentar_ru":"<kurz>"}],
 "fehler":[{"falsch":"<Originalstelle>","richtig":"<Korrektur>","erklaerung_ru":"<Regel kurz>"}],
 "lob_ru":"<was gut war>",
 "tipps_ru":["<konkreter Tipp>","<…>"],
 "musterloesung":"<verbesserte Version der Antwort des Lernenden auf B1-Niveau, seine Ideen beibehalten>"}
Liste bis zu 10 wichtigste Fehler. Wenn die Antwort leer oder nicht auf Deutsch ist, gib niveau "unter A2" und erkläre es.`;
  try{
    let t=await askClaude(prompt,txt=>{box.innerHTML=`<div class="fb info"><span class="spin"></span> Claude проверяет ответ… ${txt.length>20?"(пишет отчёт)":""}</div>`;});
    const r=parseJSON(t);renderEval(r,box);record("ai-"+kind,r.niveau==="B1");
  }catch(e){
    box.innerHTML=`<div class="fb bad">Не получилось получить проверку${e&&e.code==="rate_limited"?" — слишком много запросов, попробуйте через минуту":""}. ${e&&e.code==="not_granted"?"Доступ к Claude для этой страницы выключен.":e&&e.code==="bad_key"?"API-ключ не подходит — проверьте его в Настройках.":e&&e.message?esc(e.message):"Попробуйте ещё раз."}</div>`;
  }
}
function renderEval(r,box){
  const total=(r.kriterien||[]).reduce((s,k)=>s+(+k.punkte||0),0),max=(r.kriterien||[]).length*5||20;
  const col=r.niveau==="B1"?"ok":r.niveau==="A2"?"info":"bad";
  box.innerHTML=`<div class="card" style="margin:12px 0 0">
   <div class="row" style="justify-content:space-between"><div><div class="muted small">Оценка Claude</div><div class="score">Уровень: ${esc(r.niveau)}</div></div><div class="score">${total} / ${max}</div></div>
   <div class="bar" style="margin:10px 0 4px"><i style="width:${Math.round(total/max*100)}%;background:var(--${col==="info"?"gold":col})"></i></div>
   <h3>Критерии</h3><table>${(r.kriterien||[]).map(k=>`<tr><td><b>${esc(k.name)}</b><div class="muted small">${esc(k.kommentar_ru)}</div></td><td style="white-space:nowrap">${esc(k.punkte)} / 5</td></tr>`).join("")}</table>
   ${(r.leitpunkte||[]).length?`<h3>Пункты задания</h3><ul class="check-list">${r.leitpunkte.map(l=>`<li class="${l.erfuellt?"y":"n"}"><b>${esc(l.punkt)}</b> — <span class="muted">${esc(l.kommentar_ru)}</span></li>`).join("")}</ul>`:""}
   ${(r.fehler||[]).length?`<h3>Ошибки (${r.fehler.length})</h3>${r.fehler.map(f=>`<div class="err"><s>${esc(f.falsch)}</s> → <b>${esc(f.richtig)}</b><div class="small muted">${esc(f.erklaerung_ru)}</div></div>`).join("")}`:`<div class="fb ok">Ошибок не найдено 👏</div>`}
   ${r.lob_ru?`<h3>Что получилось</h3><p>${esc(r.lob_ru)}</p>`:""}
   ${(r.tipps_ru||[]).length?`<h3>Советы</h3><ul>${r.tipps_ru.map(t=>`<li>${esc(t)}</li>`).join("")}</ul>`:""}
   ${r.musterloesung?`<h3>Улучшенная версия</h3><div class="textbox" id="muster"></div><div class="row" style="margin-top:8px" id="musterbtn"></div>`:""}
  </div>`;
  if(r.musterloesung){$("#muster",box).textContent=r.musterloesung;if(canSpeak())$("#musterbtn",box).append(playBtn(r.musterloesung,"🔊 Прослушать"));}
}
const noAiNote=`<div class="note" data-noai hidden>Полная проверка ИИ не подключена. Она работает, когда сайт открыт в Claude, или с вашим собственным API-ключом Anthropic — см. <a href="#einstellungen">Настройки</a>. Быстрая проверка работает всегда.</div>`;

// ---------- общие компоненты ----------
function mcBlock(qs,sec,{instant=true,numbered=true}={}){
  // qs: [{q,o,a,e}]
  const wrap=document.createElement("div");
  qs.forEach((it,i)=>{
    const d=document.createElement("div");d.className="q";
    d.innerHTML=`<div>${numbered?`<span class="qnum">${i+1}.</span>`:""}${it.q?esc(it.q):""}</div><div class="opts"></div><div class="qfb"></div>`;
    const opts=$(".opts",d);
    it.o.forEach((o,j)=>{const b=document.createElement("button");b.className="opt";b.textContent=o;b.onclick=()=>{
      if(d._done)return;
      if(instant){d._done=true;const ok=j===it.a;b.classList.add(ok?"right":"wrong");if(!ok)opts.children[it.a].classList.add("right");
        $(".qfb",d).innerHTML=`<div class="fb ${ok?"ok":"bad"}">${ok?"Верно!":"Неверно."} ${it.e?esc(it.e):""}</div>`;record(sec,ok);}
      else{$$(".opt",opts).forEach(x=>x.classList.remove("sel"));b.classList.add("sel");d._sel=j;}
    };opts.append(b);});
    d._it=it;wrap.append(d);
  });
  wrap.check=()=>{let c=0;$$(".q",wrap).forEach(d=>{const it=d._it,opts=$(".opts",d);if(d._done){return;}d._done=true;
    const ok=d._sel===it.a;if(ok)c++;if(d._sel!=null)opts.children[d._sel].classList.add(ok?"right":"wrong");opts.children[it.a].classList.add("right");record(sec,ok);});return c;};
  return wrap;
}
function umlautBar(){const s=document.createElement("span");s.className="umlauts";["ä","ö","ü","ß"].forEach(ch=>{const b=document.createElement("button");b.textContent=ch;b.onmousedown=e=>e.preventDefault();b.onclick=()=>{const el=document.activeElement;if(el&&(el.tagName==="INPUT"||el.tagName==="TEXTAREA")){const p=el.selectionStart;el.value=el.value.slice(0,p)+ch+el.value.slice(el.selectionEnd);el.selectionStart=el.selectionEnd=p+1;el.dispatchEvent(new Event("input"));}};s.append(b);});return s;}
function tabs(names,onPick,start=0){const t=document.createElement("div");t.className="tabs";names.forEach((n,i)=>{const b=document.createElement("button");b.textContent=n;b.onclick=()=>{$$("button",t).forEach(x=>x.classList.remove("on"));b.classList.add("on");onPick(i);};t.append(b);if(i===start)setTimeout(()=>b.click());});return t;}
function el(html){const d=document.createElement("div");d.innerHTML=html;return d.firstElementChild||d;}

// ---------- проверка формы глагола ----------
function checkForm(user,right){const u=norm(user),r=norm(right);if(u===r)return"ok";if(u.replace(/ß/g,"ss")===r.replace(/ß/g,"ss"))return"almost";
  const deU=s=>s.replace(/ae/g,"ä").replace(/oe/g,"ö").replace(/ue/g,"ü");if(deU(u)===r)return"almost";return"bad";}

function formDrill(list,sec,label){
  const box=el(`<div class="card"><h3 style="margin-top:0">Тренировка: ${label}</h3><div class="muted small">Напишите правильную форму и нажмите Enter.</div>
   <div style="font-size:1.25rem;margin:14px 0" class="task"></div><div class="row"><input type="text" style="max-width:280px" autocomplete="off" spellcheck="false"><button class="btn">Проверить</button></div>
   <div class="row" style="margin-top:8px"></div><div class="fbx"></div><div class="muted small streak" style="margin-top:6px"></div></div>`);
  const inp=$("input",box),fb=$(".fbx",box);let cur,streak=0,answered=false;
  box.querySelectorAll(".row")[1].append(umlautBar());
  function next(){const v=pick(list),p=Math.random()*6|0;cur={v,p};answered=false;inp.value="";inp.className="";fb.innerHTML="";
    $(".task",box).innerHTML=`<span class="muted">${PERSONS[p]}</span> … <b>(${esc(v.inf)})</b>${v.ru?` <span class="muted small">— ${esc(v.ru)}</span>`:""}`;inp.focus();}
  function check(){if(answered){next();return;}const right=cur.v.f[cur.p],res=checkForm(inp.value,right);answered=true;
    inp.className=res==="bad"?"bad":"ok";
    fb.innerHTML=res==="ok"?`<div class="fb ok">Верно: ${PERSONS[cur.p]} <b>${esc(right)}</b>. Enter — дальше.</div>`:res==="almost"?`<div class="fb ok">Почти! Правильно пишется <b>${esc(right)}</b> (с умлаутом/ß).</div>`:`<div class="fb bad">Правильно: ${PERSONS[cur.p]} <b>${esc(right)}</b>. Enter — дальше.</div>`;
    streak=res==="bad"?0:streak+1;$(".streak",box).textContent=streak>1?`Серия правильных: ${streak} 🔥`:"";record(sec,res!=="bad");}
  $("button.btn",box).onclick=check;inp.onkeydown=e=>{if(e.key==="Enter")check();};
  setTimeout(next);return box;
}
function conjTable(list,title){
  const box=el(`<div class="card"><h3 style="margin-top:0">${title}</h3><select style="max-width:280px"></select><div class="tablewrap"></div></div>`);
  const sel=$("select",box);list.forEach((v,i)=>sel.add(new Option(v.inf+(v.ru?" — "+v.ru:"")+(v.type?" ("+v.type+")":""),i)));
  const show=()=>{const v=list[sel.value];$(".tablewrap",box).innerHTML=`<table>${PERSONS.map((p,i)=>`<tr><td class="muted" style="width:120px">${p}</td><td class="de">${esc(v.f[i])}</td></tr>`).join("")}</table>`;};
  sel.onchange=show;show();return box;
}

// =============== СТРАНИЦЫ ===============
const PAGES={};
PAGES.start={t:"Главная",g:"",r(m){
  m.innerHTML=`<h1>Подготовка к DTZ B1</h1><p class="lead">Тренажёр к «Deutsch-Test für Zuwanderer»: грамматика с упражнениями, лексика по темам экзамена и задания всех четырёх частей — с автоматической проверкой.</p>
  <div class="card"><h2 style="margin-top:0">Как устроен экзамен</h2><div class="tablewrap"><table>
   <tr><th>Часть</th><th>Время</th><th>Что делать</th></tr>
   <tr><td><b>Hören</b></td><td>≈ 25 мин</td><td>4 части: сообщения на автоответчике, объявления и радио, разговоры, мнения людей</td></tr>
   <tr><td><b>Lesen</b></td><td>≈ 45 мин</td><td>5 частей: указатели, объявления, письма и статьи, текст с пропусками</td></tr>
   <tr><td><b>Schreiben</b></td><td>30 мин</td><td>Одно письмо или e-mail (≈ 80 слов) по 4 пунктам; на выбор из двух тем</td></tr>
   <tr><td><b>Sprechen</b></td><td>≈ 16 мин</td><td>В паре: 1) рассказать о себе, 2) описать картинку и рассказать о своём опыте, 3) вместе что-то спланировать</td></tr></table></div>
   <p class="small muted">Hören и Lesen оцениваются вместе. Чтобы получить общий результат B1, нужен B1 в устной части и B1 в Hören/Lesen или в письме. Точные правила проверяйте в своей школе или на сайте g.a.s.t./BAMF.</p></div>
  <h2>Разделы</h2><div class="grid">${Object.entries(PAGES).filter(([k,p])=>k!=="start").map(([k,p])=>`<a class="tile" href="#${k}"><span class="k">${p.g}</span><b>${p.t}</b><p>${p.d||""}</p></a>`).join("")}</div>
  <div class="card"><h3 style="margin-top:0">Как работает проверка</h3><p>Тесты (грамматика, лексика, Hören, Lesen) проверяются сразу. Письмо и устные задания проверяются двумя способами: <b>быстрая проверка</b> (объём, обращение и прощание, все ли пункты раскрыты, связки) и <b>полная проверка Claude</b> — оценка по критериям DTZ, список ошибок с объяснениями на русском и исправленная версия.</p>${noAiNote}
   <p class="small muted">Прогресс сохраняется только в этом браузере.</p></div>`;
}};

PAGES.verben={t:"Глаголы",g:"Грамматика",d:"Präsens, Perfekt, Präteritum, Konjunktiv II, отделяемые, с предлогами",r(m){
  m.innerHTML=`<h1>Глаголы</h1><p class="lead">Глагол — главное слово в немецком предложении. На B1 нужно уверенно спрягать в настоящем времени, рассказывать о прошлом в Perfekt и вежливо просить через Konjunktiv II.</p>`;
  const body=document.createElement("div");
  m.append(tabs(["🔎 Любой глагол","🎯 Все глаголы","Präsens","Perfekt","Präteritum","Konjunktiv II","Отделяемые и возвратные","С предлогами"],i=>{body.innerHTML="";[anyVerb,allVerbsDrill,...VERB_TABS][i](body);}),body);
}};
const PNAMES=["ich","du","er/sie/es","wir","ihr","sie/Sie"];
function verbTables(c){
  const rows=TENSES.filter(([k])=>c[k]).map(([k,n])=>`<tr><th>${n}</th>${c[k].map(f=>`<td class="de">${esc(f)}</td>`).join("")}</tr>`).join("");
  const blocks=TENSES.filter(([k])=>c[k]).map(([k,n])=>`<div class="vblock"><b>${n}</b><table>${c[k].map((f,i)=>`<tr><td class="muted">${PNAMES[i]}</td><td class="de">${esc(f)}</td></tr>`).join("")}</table></div>`).join("");
  return `<div class="tablewrap only-wide"><table><tr><th></th>${PNAMES.map(p=>`<th>${p}</th>`).join("")}</tr>${rows}</table></div><div class="vblocks only-narrow">${blocks}</div>
   ${c.imperativ?`<p><b>Imperativ:</b> <span class="de">${c.imperativ.map(esc).join(" · ")}</span> <span class="small muted">(du · ihr · Sie)</span></p>`:""}
   <p class="small"><b>Perfekt</b> с <b>${c.aux==="s"?"sein":"haben"}</b>, Partizip II: <span class="de">${esc(c.p2)}</span>${c.sep?`. В придаточном пишется слитно: <span class="de">…, weil ich ${c.refl?"mich ":""}${esc(c.nebensatz[0])}.</span>`:""}</p>
   ${c.note?`<div class="note">${esc(c.note)}</div>`:""}`;
}
function anyVerb(b){
  const c=el(`<div class="card"><h2 style="margin-top:0">Любой глагол: все формы</h2><p class="muted small">Введите инфинитив (можно с «sich»): <i>fahren, anrufen, sich anmelden, verstehen…</i> Формы строятся прямо в браузере: ${ALL_VERBS.length} глаголов в словаре, остальные — по правилам слабых глаголов.</p>
    <div class="row"><input type="text" list="verblist" style="max-width:300px" placeholder="z. B. anrufen" autocomplete="off" spellcheck="false"><button class="btn">Показать</button><button class="btn sec rnd">🎲</button></div>
    <datalist id="verblist">${ALL_VERBS.map(v=>`<option value="${v}">`).join("")}</datalist><div class="ub row" style="margin-top:8px"></div><div class="out"></div></div>`);
  const chk=el(`<div class="card"><h3 style="margin-top:0">Проверить свою форму</h3><p class="muted small">Напишите форму сами — проверка покажет, правильно ли.</p>
    <div class="row"><input type="text" class="vi" placeholder="Infinitiv" style="max-width:180px" autocomplete="off" spellcheck="false"><select class="ts" style="max-width:170px">${TENSES.map(([k,n])=>`<option value="${k}">${n}</option>`).join("")}</select><select class="ps" style="max-width:120px">${PNAMES.map((p,i)=>`<option value="${i}">${p}</option>`).join("")}</select></div>
    <div class="row" style="margin-top:8px"><input type="text" class="fi" placeholder="ваша форма, напр. rufe … an" autocomplete="off" spellcheck="false" style="max-width:300px"><button class="btn ck">Проверить</button></div><div class="fbx"></div></div>`);
  b.append(c,chk);$(".ub",c).append(umlautBar());const inp=$("input",c);
  const show=()=>{const v=inp.value.trim();if(!v)return;const r=conjugate(v);$(".out",c).innerHTML=r?verbTables(r):`<div class="fb bad">Это не похоже на немецкий инфинитив (он оканчивается на -en или -n).</div>`;};
  $("button.btn",c).onclick=show;inp.onkeydown=e=>{if(e.key==="Enter")show();};
  $(".rnd",c).onclick=()=>{inp.value=pick(ALL_VERBS);show();};
  $(".ck",chk).onclick=()=>{const r=conjugate($(".vi",chk).value);if(!r){$(".fbx",chk).innerHTML=`<div class="fb bad">Введите инфинитив.</div>`;return;}
    const t=$(".ts",chk).value,p=+$(".ps",chk).value;const right=r[t]?r[t][p]:null;
    if(!right){$(".fbx",chk).innerHTML=`<div class="fb info">У этого глагола нет особой формы Konjunktiv II — используйте «würde + Infinitiv»: <b>${esc(r.wuerde[p])}</b></div>`;return;}
    const res=verbFormOk($(".fi",chk).value,right);
    $(".fbx",chk).innerHTML=`<div class="fb ${res?"ok":"bad"}">${res?"Верно!":"Неверно."} ${PNAMES[p]} <b>${esc(right)}</b>${r.note?"<br><span class='small'>"+esc(r.note)+"</span>":""}</div>`;record("verbcheck",res);};
  $(".fi",chk).onkeydown=e=>{if(e.key==="Enter")$(".ck",chk).click();};
}
function verbFormOk(user,right){const n=s=>norm(s).replace(/…|\.\.\./g," ").replace(/\s+/g," ").trim();const u=n(user),r=n(right);
  if(u===r||u.replace(/ß/g,"ss")===r.replace(/ß/g,"ss"))return true;
  // du lasest/last, aßest/aßt — обе формы допустимы
  if(r.replace(/est\b/,"st")===u)return true;return false;}
function allVerbsDrill(b){
  const TS=[["praesens","Präsens"],["praeteritum","Präteritum"],["perfekt","Perfekt"]];
  const box=el(`<div class="card"><h3 style="margin-top:0">Тренажёр: все ${ALL_VERBS.length} глаголов</h3><p class="muted small">Случайный глагол, время и лицо. Отделяемую приставку пишите в конце: <i>rufe an</i>. Perfekt — вместе с haben/sein: <i>bin gegangen</i>.</p>
    <div class="tabs tsel"></div><div style="font-size:1.25rem;margin:14px 0" class="task"></div><div class="row"><input type="text" style="max-width:320px" autocomplete="off" spellcheck="false"><button class="btn">Проверить</button></div>
    <div class="row ub" style="margin-top:8px"></div><div class="fbx"></div><div class="muted small streak" style="margin-top:6px"></div></div>`);
  b.append(box);$(".ub",box).append(umlautBar());const inp=$("input",box);let cur,done=false,streak=0,mode=-1;
  const modes=["Все времена",...TS.map(t=>t[1])];modes.forEach((n,i)=>{const bt=document.createElement("button");bt.textContent=n;if(i===0)bt.className="on";bt.onclick=()=>{$$(".tsel button",box).forEach(x=>x.classList.remove("on"));bt.classList.add("on");mode=i-1;next();};$(".tsel",box).append(bt);});
  function next(){const v=pick(ALL_VERBS),t=mode<0?pick(TS):TS[mode],p=Math.random()*6|0;const r=conjugate(v);cur={v,t,p,r};done=false;inp.value="";inp.className="";$(".fbx",box).innerHTML="";
    $(".task",box).innerHTML=`<span class="pill">${t[1]}</span> <span class="muted">${PNAMES[p]}</span> … <b>(${esc(v)})</b>`;inp.focus();}
  function check(){if(done){next();return;}done=true;const right=cur.r[cur.t[0]][cur.p];const ok=verbFormOk(inp.value,right);inp.className=ok?"ok":"bad";
    streak=ok?streak+1:0;$(".streak",box).textContent=streak>1?`Серия: ${streak} 🔥`:"";
    $(".fbx",box).innerHTML=`<div class="fb ${ok?"ok":"bad"}">${ok?"Верно!":"Правильно:"} ${PNAMES[cur.p]} <b>${esc(right)}</b>. Enter — дальше. <a href="#" class="see">Все формы</a></div><div class="all"></div>`;
    $(".see",box).onclick=e=>{e.preventDefault();$(".all",box).innerHTML=verbTables(cur.r);};record("allverbs",ok);}
  $("button.btn",box).onclick=check;inp.onkeydown=e=>{if(e.key==="Enter")check();};next();
}
const VERB_TABS=[
 b=>{b.append(el(`<div class="card"><h2 style="margin-top:0">Präsens — настоящее время</h2>
   <p>Основа глагола + окончание: <span class="de">mach<span class="v">e</span>, mach<span class="v">st</span>, mach<span class="v">t</span>, mach<span class="v">en</span>, mach<span class="v">t</span>, mach<span class="v">en</span></span>.</p>
   <ul><li>Основа на <b>-t/-d</b> → вставляем <b>e</b>: du arbeit<b>e</b>st, er arbeit<b>e</b>t.</li>
   <li>Сильные глаголы меняют гласную <b>только у du и er/sie/es</b>: fahren → du f<b>ä</b>hrst; sprechen → er spr<b>i</b>cht; sehen → du s<b>ie</b>hst.</li>
   <li>Модальные глаголы: у <b>ich</b> и <b>er</b> нет окончания: ich kann, er kann; ich muss, er muss. Второй глагол — в конце в инфинитиве: <span class="de">Ich <span class="v">muss</span> heute <span class="hl">arbeiten</span>.</span></li></ul></div>`));
   b.append(conjTable(PRAESENS,"Таблица спряжения"),formDrill(PRAESENS,"praesens","Präsens"));},
 b=>{b.append(el(`<div class="card"><h2 style="margin-top:0">Perfekt — прошедшее время для разговора и писем</h2>
   <p><b>haben/sein</b> (на 2-м месте) + <b>Partizip II</b> (в конце): <span class="de">Ich <span class="v">habe</span> gestern Pizza <span class="hl">gegessen</span>.</span></p>
   <h3>sein или haben?</h3><ul><li><b>sein</b> — движение из точки А в точку Б (gehen, fahren, fliegen, kommen, umziehen) и изменение состояния (aufstehen, einschlafen, werden), а также sein, bleiben, passieren.</li><li><b>haben</b> — все остальные (большинство), в т.ч. все возвратные: <i>Ich habe mich gefreut.</i></li></ul>
   <h3>Как образовать Partizip II</h3><table><tr><th>Тип</th><th>Схема</th><th>Пример</th></tr>
   <tr><td>слабые</td><td>ge- … -t</td><td class="de">machen → gemacht</td></tr><tr><td>сильные</td><td>ge- … -en (часто меняется корень)</td><td class="de">schreiben → geschrieben</td></tr>
   <tr><td>отделяемые</td><td>приставка + ge + корень</td><td class="de">einkaufen → eingekauft, anrufen → angerufen</td></tr>
   <tr><td>неотделяемые (be-, ver-, er-, ge-, ent-, emp-, zer-)</td><td>без ge-</td><td class="de">besuchen → besucht, verstehen → verstanden</td></tr>
   <tr><td>на -ieren</td><td>без ge-, -t</td><td class="de">telefonieren → telefoniert</td></tr></table></div>`));
   b.append(perfektDrill());
   b.append(el(`<div class="card"><h3 style="margin-top:0">Список (${PERFEKT.length} глаголов)</h3><div class="tablewrap"><table><tr><th>Infinitiv</th><th>Perfekt</th><th></th></tr>${PERFEKT.map(p=>`<tr><td class="de">${p[0]}</td><td><span class="${p[1]==="ist"?"v":""}">${p[1]}</span> ${p[2]}</td><td class="muted">${p[3]}</td></tr>`).join("")}</table></div></div>`));},
 b=>{b.append(el(`<div class="card"><h2 style="margin-top:0">Präteritum — для sein, haben и модальных</h2><p>В устной речи прошедшее почти всегда в Perfekt. Но <b>sein, haben</b> и модальные глаголы обычно ставят в Präteritum: <span class="de">Ich <span class="v">war</span> krank. Ich <span class="v">hatte</span> keine Zeit. Ich <span class="v">konnte</span> nicht kommen.</span></p>
   <p>У ich и er/sie/es формы одинаковые: ich war, er war. Также полезно: <span class="de">es gab</span> (было, имелось).</p></div>`));
   b.append(conjTable(PRAETERITUM,"Таблица"),formDrill(PRAETERITUM,"praeteritum","Präteritum"));},
 b=>{b.append(el(`<div class="card"><h2 style="margin-top:0">Konjunktiv II — вежливость и пожелания</h2><p>Очень нужен в письме и в Sprechen Teil 3.</p><ul>
   <li>Вежливая просьба: <span class="de"><span class="v">Könnten</span> Sie mir bitte helfen? <span class="v">Würden</span> Sie mich bitte zurückrufen?</span></li>
   <li>Желание: <span class="de">Ich <span class="v">hätte</span> gern einen Termin. Ich <span class="v">würde</span> gern am Montag kommen.</span></li>
   <li>Предложение: <span class="de">Wir <span class="v">könnten</span> grillen. Wie <span class="v">wäre</span> es mit Samstag?</span></li>
   <li>Совет: <span class="de">Du <span class="v">solltest</span> zum Arzt gehen.</span></li>
   <li>Нереальное: <span class="de">Wenn ich mehr Zeit <span class="v">hätte</span>, <span class="v">würde</span> ich mehr lernen.</span></li></ul></div>`));
   b.append(conjTable(KONJ2,"Таблица"),formDrill(KONJ2,"konj2","Konjunktiv II"));},
 b=>{b.append(el(`<div class="card"><h2 style="margin-top:0">Отделяемые приставки</h2><p>Приставки <span class="pill">an-</span><span class="pill">auf-</span><span class="pill">aus-</span><span class="pill">ein-</span><span class="pill">mit-</span><span class="pill">zu-</span><span class="pill">ab-</span><span class="pill">vor-</span><span class="pill">zurück-</span><span class="pill">fern-</span><span class="pill">statt-</span> в главном предложении уходят в конец:</p>
   <p class="de">anrufen → Ich <span class="v">rufe</span> dich morgen <span class="hl">an</span>.<br>aufstehen → Er <span class="v">steht</span> um 6 Uhr <span class="hl">auf</span>.</p>
   <p>С модальным глаголом и в придаточном — слитно: <span class="de">Ich muss früh <span class="hl">aufstehen</span>. … weil ich früh <span class="hl">aufstehe</span>.</span></p>
   <h2>Возвратные глаголы</h2><p>sich меняется по лицам: <span class="de">ich freue <b>mich</b>, du freust <b>dich</b>, er freut <b>sich</b>, wir freuen <b>uns</b>, ihr freut <b>euch</b>, sie freuen <b>sich</b></span>.</p>
   <p>Частые: sich anmelden, sich bewerben, sich erholen, sich kümmern um, sich freuen auf/über, sich interessieren für, sich treffen, sich verabreden, sich beeilen.</p></div>`));
   const qs=[{q:"Ich ___ morgen früh ___. (aufstehen)",o:["stehe … auf","aufstehe …","stehe … aufstehen"],a:0},{q:"Der Zug ___ um 10 Uhr ___. (ankommen)",o:["kommt … an","ankommt …","ist … an"],a:0},{q:"Kannst du mich heute ___? (anrufen)",o:["anrufen","rufen an","anruft"],a:0},{q:"Ich weiß nicht, wann der Kurs ___. (anfangen)",o:["anfängt","fängt an","fängt … an"],a:0},{q:"Wir treffen ___ am Bahnhof.",o:["uns","euch","sich"],a:0},{q:"Hast du ___ schon angemeldet?",o:["dich","dir","sich"],a:0},{q:"Gestern habe ich im Supermarkt ___. (einkaufen)",o:["eingekauft","geeinkauft","einkaufte"],a:0},{q:"Meine Eltern interessieren ___ für Musik.",o:["sich","ihnen","uns"],a:0}];
   const c=el(`<div class="card"><h3 style="margin-top:0">Упражнение</h3></div>`);c.append(mcBlock(shuffle(qs).map(q=>({...q,...shuffleOpts(q)})),"trennbar"));b.append(c);},
 b=>{b.append(el(`<div class="card"><h2 style="margin-top:0">Глаголы с предлогами</h2><p>Предлог нужно учить вместе с глаголом, иногда он не совпадает с русским: <i>ждать кого-то</i> → <span class="de">warten <b>auf</b> + Akk</span>.</p>
   <div class="tablewrap"><table><tr><th>Глагол</th><th>Падеж</th><th>Перевод</th></tr>${VERB_PREP.map(v=>`<tr><td class="de">${esc(v[0].replace("___","<"+v[1]+">"))}</td><td>${v[3]}</td><td class="muted">${v[4]}</td></tr>`).join("")}</table></div>
   <p class="small muted">Вопрос к таким глаголам: <b>Worauf</b> wartest du? <b>Woran</b> denkst du? Ответ-местоимение: Ich warte <b>darauf</b>.</p></div>`));
   const c=el(`<div class="card"><h3 style="margin-top:0">Тест: вставьте предлог</h3></div>`);c.append(mcBlock(shuffle(VERB_PREP).slice(0,10).map(v=>{const o=shuffle(v[2]);return{q:v[0],o,a:o.indexOf(v[1]),e:`${v[1]} + ${v[3]} — ${v[4]}`};}),"verbprep"));
   const again=el(`<button class="btn sec" style="margin-top:10px">Новые 10 вопросов</button>`);again.onclick=()=>{b.innerHTML="";VERB_TABS[5](b);};c.append(again);b.append(c);},
];
function shuffleOpts(q){const right=q.o[q.a];const o=shuffle(q.o);return{o,a:o.indexOf(right)};}
function perfektDrill(){
  const AUX={hat:["habe","hast","hat","haben","habt","haben"],ist:["bin","bist","ist","sind","seid","sind"]};
  const box=el(`<div class="card"><h3 style="margin-top:0">Тренировка Perfekt</h3><div class="muted small">Впишите вспомогательный глагол и Partizip II.</div>
    <div style="font-size:1.2rem;margin:14px 0" class="task"></div>
    <div class="row"><input type="text" class="aux" placeholder="habe / bin…" style="max-width:150px" autocomplete="off" spellcheck="false"><input type="text" class="part" placeholder="Partizip II" style="max-width:220px" autocomplete="off" spellcheck="false"><button class="btn">Проверить</button></div>
    <div class="row ub" style="margin-top:8px"></div><div class="fbx"></div></div>`);
  $(".ub",box).append(umlautBar());let cur,answered=false;
  const ZEIT=["Gestern","Letzte Woche","Am Wochenende","Heute Morgen","Letztes Jahr"];
  function next(){const v=pick(PERFEKT),p=Math.random()*6|0;cur={v,p};answered=false;$$("input",box).forEach(i=>{i.value="";i.classList.remove("ok","bad");});$(".fbx",box).innerHTML="";
    $(".task",box).innerHTML=`${pick(ZEIT)} ___ <b>${PERSONS[p].split("/")[0]}</b> … ___ <span class="muted">(${v[0]} — ${v[3]})</span>`;$(".aux",box).focus();}
  function check(){if(answered){next();return;}answered=true;const [inf,aux,part]=cur.v;const ra=AUX[aux][cur.p];
    const okA=checkForm($(".aux",box).value,ra)!=="bad",okP=checkForm($(".part",box).value,part)!=="bad";
    $(".aux",box).className=okA?"aux ok":"aux bad";$(".part",box).className=okP?"part ok":"part bad";
    $(".fbx",box).innerHTML=`<div class="fb ${okA&&okP?"ok":"bad"}">${okA&&okP?"Верно!":"Правильно:"} ${PERSONS[cur.p].split("/")[0]} <b>${ra}</b> … <b>${part}</b>${aux==="ist"?" (sein — движение/изменение)":""}. Enter — дальше.</div>`;record("perfekt",okA&&okP);}
  $("button.btn",box).onclick=check;$$("input",box).forEach(i=>i.onkeydown=e=>{if(e.key==="Enter"){if(i.classList.contains("aux")&&!answered){$(".part",box).focus();return;}check();}});
  setTimeout(next);return box;
}

PAGES.satzbau={t:"Порядок слов",g:"Грамматика",d:"Глагол на 2-м месте, рамка, придаточные, связки",r(m){
  m.innerHTML=`<h1>Порядок слов</h1><p class="lead">В немецком порядок слов строгий. Запомните три схемы — и 90% предложений будут правильными.</p>
  <div class="card"><h2 style="margin-top:0">1. Главное предложение: глагол на 2-м месте</h2><div class="tablewrap"><table><tr><th>Позиция 1</th><th>2 (глагол)</th><th>середина</th><th>конец</th></tr>
   <tr><td>Ich</td><td class="v">lerne</td><td>heute Deutsch.</td><td></td></tr><tr><td>Heute</td><td class="v">lerne</td><td>ich Deutsch.</td><td></td></tr>
   <tr><td>Ich</td><td class="v">muss</td><td>heute Deutsch</td><td class="hl">lernen.</td></tr><tr><td>Ich</td><td class="v">habe</td><td>gestern Deutsch</td><td class="hl">gelernt.</td></tr>
   <tr><td>Der Kurs</td><td class="v">fängt</td><td>um 8 Uhr</td><td class="hl">an.</td></tr></table></div>
   <p>Если на 1-м месте не подлежащее (время, место, deshalb, trotzdem, dann…), подлежащее идёт <b>сразу после глагола</b>: <span class="de">Am Montag <span class="v">habe</span> <u>ich</u> einen Termin.</span></p>
   <p>Вторая часть глагола (инфинитив, Partizip II, приставка) — <b>в конце</b>. Это «рамка» (Satzklammer).</p></div>
  <div class="card"><h2 style="margin-top:0">2. Вопросы</h2><p>W-вопрос: <span class="de"><b>Wann</b> <span class="v">beginnt</span> der Kurs?</span> — да/нет-вопрос: глагол на 1-м месте: <span class="de"><span class="v">Hast</span> du Zeit?</span></p></div>
  <div class="card"><h2 style="margin-top:0">3. Придаточное: глагол в конце</h2><p>После <span class="pill">weil</span><span class="pill">dass</span><span class="pill">wenn</span><span class="pill">ob</span><span class="pill">obwohl</span><span class="pill">als</span><span class="pill">damit</span><span class="pill">bevor</span><span class="pill">nachdem</span><span class="pill">während</span> и вопросительных слов в косвенном вопросе спрягаемый глагол уходит <b>в самый конец</b>:</p>
   <p class="de">Ich komme nicht, <b>weil</b> ich krank <span class="v">bin</span>.<br>Ich glaube, <b>dass</b> er heute arbeiten <span class="v">muss</span>.<br>Ich weiß nicht, <b>wann</b> der Zug <span class="v">ankommt</span>.</p>
   <p>Если придаточное стоит первым, оно занимает позицию 1, и дальше сразу глагол: <span class="de"><b>Wenn</b> ich Zeit <span class="v">habe</span>, <span class="v">komme</span> ich.</span></p></div>
  <div class="card"><h2 style="margin-top:0">Связки — какой порядок после них?</h2><div class="tablewrap"><table><tr><th>Связка</th><th>Порядок</th><th>Пример</th></tr>
   <tr><td><b>und, aber, oder, denn, sondern</b></td><td>не влияют (позиция 0)</td><td class="de">…, <b>denn</b> ich <span class="v">bin</span> krank.</td></tr>
   <tr><td><b>deshalb, trotzdem, dann, danach, außerdem</b></td><td>позиция 1 → глагол сразу</td><td class="de">…, <b>deshalb</b> <span class="v">bleibe</span> ich zu Hause.</td></tr>
   <tr><td><b>weil, dass, wenn, ob, obwohl</b></td><td>глагол в конец</td><td class="de">…, <b>weil</b> ich krank <span class="v">bin</span>.</td></tr>
   <tr><td><b>um … zu, ohne … zu</b></td><td>zu + инфинитив в конце</td><td class="de">…, <b>um</b> Deutsch <b>zu</b> <span class="v">lernen</span>.</td></tr></table></div>
   <p class="small muted">Середина предложения: «Te-Ka-Mo-Lo» — когда (temporal), почему (kausal), как (modal), где/куда (lokal): <i>Ich fahre <u>morgen</u> <u>wegen der Arbeit</u> <u>mit dem Zug</u> <u>nach Berlin</u>.</i></p></div>
  <h2>Тренажёр: соберите предложение</h2><p class="muted">Нажимайте на слова по порядку. Нажатие на слово в ответе возвращает его назад.</p><div id="sb"></div>`;
  satzbauTrainer($("#sb"));
}};
function satzbauTrainer(host){
  let order=shuffle(SATZBAU.map((_,i)=>i)),k=0,score=0;
  function show(){
    const it=SATZBAU[order[k%order.length]];const words=it.s.replace(/[.,!?]/g,"").split(" ");
    const box=el(`<div class="card"><div class="row" style="justify-content:space-between"><span class="muted small">Задание ${k%order.length+1} из ${order.length}</span><span class="muted small">Верно: ${score}</span></div>
      <div class="chips answerline" title="Ваш ответ"></div><div class="chips pool"></div>
      <div class="row"><button class="btn chk">Проверить</button><button class="btn sec rst">Сбросить</button><button class="btn sec nx">Пропустить →</button></div><div class="fbx"></div></div>`);
    host.innerHTML="";host.append(box);const ans=$(".answerline",box),pool=$(".pool",box);let chosen=[];
    shuffle(words.map((w,i)=>({w,i}))).forEach(o=>{const c=document.createElement("button");c.className="chip";c.textContent=o.w;c.onclick=()=>{c.classList.add("used");chosen.push({...o,src:c});draw();};pool.append(c);});
    function draw(){ans.innerHTML="";chosen.forEach((o,idx)=>{const c=document.createElement("button");c.className="chip";c.textContent=o.w;c.onclick=()=>{o.src.classList.remove("used");chosen.splice(idx,1);draw();};ans.append(c);});}
    $(".rst",box).onclick=()=>{chosen.forEach(o=>o.src.classList.remove("used"));chosen=[];draw();};
    $(".nx",box).onclick=()=>{k++;show();};
    $(".chk",box).onclick=()=>{if(box._done){k++;show();return;}if(chosen.length<words.length){$(".fbx",box).innerHTML=`<div class="fb info">Используйте все слова (${chosen.length} из ${words.length}).</div>`;return;}
      const u=norm(chosen.map(o=>o.w).join(" "));const ok=[it.s,...it.alt].some(s=>norm(s)===u);box._done=true;if(ok)score++;record("satzbau",ok);
      $(".fbx",box).innerHTML=`<div class="fb ${ok?"ok":"bad"}">${ok?"Верно!":"Не совсем."} <b>${esc(it.s)}</b>${it.alt.length?`<br><span class="small">Тоже верно: ${it.alt.map(esc).join(" / ")}</span>`:""}<br><span class="small">💡 ${esc(it.tip)}</span></div>`;$(".chk",box).textContent="Дальше →";};
  }
  show();
}

PAGES.faelle={t:"Падежи и предлоги",g:"Грамматика",d:"Akkusativ, Dativ, Wechselpräpositionen",r(m){
  m.innerHTML=`<h1>Падежи и предлоги</h1><p class="lead">Ошибки в артиклях — самые частые на экзамене. Главное: знать, какой падеж требует предлог или глагол.</p>
  <div class="card"><h2 style="margin-top:0">Артикли</h2><div class="tablewrap"><table><tr><th></th><th>der (м.)</th><th>das (ср.)</th><th>die (ж.)</th><th>die (мн.)</th></tr>
   <tr><td><b>Nominativ</b> (кто?)</td><td>der / ein</td><td>das / ein</td><td>die / eine</td><td>die / –</td></tr>
   <tr><td><b>Akkusativ</b> (кого? куда?)</td><td class="v">den / einen</td><td>das / ein</td><td>die / eine</td><td>die / –</td></tr>
   <tr><td><b>Dativ</b> (кому? где?)</td><td class="v">dem / einem</td><td class="v">dem / einem</td><td class="v">der / einer</td><td class="v">den / – (+n)</td></tr></table></div>
   <p class="small">Так же склоняются mein, dein, sein, ihr, unser, Ihr, kein: <span class="de">Ich habe kein<b>en</b> Termin. Ich spreche mit mein<b>er</b> Frau.</span></p>
   <p class="small">Местоимения: ich – mich – <b>mir</b>; du – dich – <b>dir</b>; er – ihn – <b>ihm</b>; sie – sie – <b>ihr</b>; wir – uns – uns; Sie – Sie – <b>Ihnen</b>.</p></div>
  <div class="card"><h2 style="margin-top:0">Предлоги</h2><div class="tablewrap"><table>
   <tr><td><b>Всегда Akkusativ</b></td><td class="de">durch, für, gegen, ohne, um</td></tr>
   <tr><td><b>Всегда Dativ</b></td><td class="de">aus, bei, mit, nach, seit, von, zu, gegenüber</td></tr>
   <tr><td><b>Двойные</b><br><span class="small muted">Wo? → Dativ<br>Wohin? → Akkusativ</span></td><td class="de">an, auf, hinter, in, neben, über, unter, vor, zwischen<br><span class="small">Das Buch <b>liegt</b> auf <b>dem</b> Tisch. — Ich <b>lege</b> das Buch auf <b>den</b> Tisch.</span><br><span class="small">Пары: liegen/legen, stehen/stellen, sitzen/setzen, hängen/hängen</span></td></tr></table></div>
   <p class="small">Слияния: zu + dem = <b>zum</b>, zu + der = <b>zur</b>, in + dem = <b>im</b>, in + das = <b>ins</b>, an + dem = <b>am</b>, bei + dem = <b>beim</b>, von + dem = <b>vom</b>.</p>
   <p class="small">Время: <b>am</b> Montag, <b>um</b> 8 Uhr, <b>im</b> Mai, <b>seit</b> zwei Jahren, <b>vor</b> einer Woche, <b>in</b> zwei Tagen.</p></div>
  <h2>Тест</h2><div class="card" id="fq"></div>`;
  const run=()=>{const host=$("#fq");host.innerHTML="";host.append(mcBlock(shuffle(FAELLE).slice(0,10).map(f=>{const o=shuffle(f.o);return{q:f.q,o,a:o.indexOf(f.a),e:f.e};}),"faelle"));
    const b=el(`<button class="btn sec" style="margin-top:12px">Новые 10 вопросов</button>`);b.onclick=run;host.append(b);};run();
}};

PAGES.wortschatz={t:"Лексика",g:"Лексика",d:"7 тем экзамена: карточки и тест",r(m){
  const themes=Object.keys(WORTSCHATZ);
  m.innerHTML=`<h1>Лексика по темам DTZ</h1><p class="lead">Слова, которые постоянно встречаются в письмах, объявлениях и диалогах экзамена. Учите существительные сразу с артиклем.</p>
   <div class="row"><select id="th" style="max-width:260px">${themes.map((t,i)=>`<option value="${i}">${t}</option>`).join("")}</select></div><div id="wmode"></div><div id="wbody"></div>`;
  const body=$("#wbody");let mode=0;
  const draw=()=>{body.innerHTML="";const list=WORTSCHATZ[themes[$("#th").value]];(mode===0?flashcards:mode===1?vocabQuiz:vocabList)(body,list,themes[$("#th").value]);};
  $("#wmode").append(tabs(["Карточки","Тест","Список"],i=>{mode=i;draw();}));$("#th").onchange=draw;
}};
function flashcards(host,list,theme){
  const KN=store.get("dtz-known",{});let deck=shuffle(list.filter(w=>!KN[w[0]]));if(!deck.length)deck=shuffle(list);let i=0,flipped=false;
  const box=el(`<div class="card"><div class="row" style="justify-content:space-between"><span class="muted small cnt"></span><span class="muted small">Выучено: ${list.filter(w=>KN[w[0]]).length} / ${list.length}</span></div>
   <div class="flash"><div class="w"></div><div class="ex"></div></div>
   <div class="row" style="justify-content:center"><span class="sp"></span><button class="btn sec rep">↻ Повторить ещё</button><button class="btn kn">✓ Знаю</button></div></div>`);
  host.append(box);
  function show(){if(i>=deck.length){box.innerHTML=`<div class="fb ok">Колода пройдена! Выберите другую тему или пройдите тест.</div>`;return;}
    const w=deck[i];flipped=false;$(".cnt",box).textContent=`Карточка ${i+1} из ${deck.length} · нажмите, чтобы перевернуть`;
    $(".w",box).textContent=w[0];$(".ex",box).textContent="";const sp=$(".sp",box);sp.innerHTML="";if(canSpeak())sp.append(playBtn(w[0]+". "+w[2]));}
  $(".flash",box).onclick=()=>{const w=deck[i];flipped=!flipped;$(".w",box).textContent=flipped?w[1]:w[0];$(".ex",box).textContent=flipped?w[2]:"";};
  $(".kn",box).onclick=()=>{KN[deck[i][0]]=1;store.set("dtz-known",KN);record("wortschatz",true);i++;show();};
  $(".rep",box).onclick=()=>{deck.push(deck[i]);record("wortschatz",false);i++;show();};show();
}
function vocabQuiz(host,list){
  const all=Object.values(WORTSCHATZ).flat();
  const qs=shuffle(list).slice(0,10).map(w=>{const dir=Math.random()<.5;const others=shuffle(all.filter(x=>x!==w)).slice(0,3);const o=shuffle([w,...others]);
    return{q:dir?w[0]:w[1],o:o.map(x=>dir?x[1]:x[0]),a:o.indexOf(w),e:w[2]};});
  const c=el(`<div class="card"></div>`);c.append(mcBlock(qs,"wortschatz"));const b=el(`<button class="btn sec" style="margin-top:12px">Ещё раз</button>`);b.onclick=()=>{host.innerHTML="";vocabQuiz(host,list);};c.append(b);host.append(c);
}
function vocabList(host,list){const c=el(`<div class="card"><div class="tablewrap"><table>${list.map(w=>`<tr><td class="de">${esc(w[0])}</td><td>${esc(w[1])}</td><td class="muted small">${esc(w[2])}</td></tr>`).join("")}</table></div></div>`);host.append(c);}

PAGES.hoeren={t:"Hören",g:"Экзамен",d:"Аудирование по частям + диктант",r(m){
  m.innerHTML=`<h1>Hören — аудирование</h1><p class="lead">Нажмите «Слушать», ответьте на вопросы и проверьте. На экзамене тексты частей 1 и 3 звучат дважды — можно прослушать ещё раз.</p>
   <div class="note">Совет: сначала прочитайте вопрос и варианты — тогда вы знаете, что именно слушать (время, место, причину).</div>
   ${canSpeak()?"":`<div class="fb info">Озвучка в этом браузере недоступна — вместо аудио откройте текст.</div>`}<div id="htabs"></div><div id="hl"></div>`;
  const host=$("#hl");const groups=["Teil 1","Teil 2","Teil 3","Teil 4"];
  $("#htabs").append(tabs(["Все","Teil 1 · сообщения","Teil 2 · объявления","Teil 3 · разговоры","Teil 4 · мнения","✍ Диктант"],i=>{host.innerHTML="";
    if(i===5){diktat(host);return;}
    HOEREN.filter(h=>i===0||h.teil.startsWith(groups[i-1])).forEach((h,n)=>host.append(hoerCard(h,n+1)));}));
}};
function hoerCard(h,num){const c=el(`<div class="card"><h3 style="margin-top:0">${num}. ${esc(h.teil)}</h3><div class="row ctl"></div><div class="qs"></div><div class="row" style="margin-top:8px"><button class="btn chk">Проверить</button><button class="btn sec tx">Показать текст</button></div><div class="fbx"></div><div class="textbox" hidden style="margin-top:10px"></div></div>`);
  if(canSpeak()){const b=playBtn(h.lines,"▶ Слушать");b.className="btn";$(".ctl",c).append(b);}
  const blk=mcBlock(h.qs,"hoeren",{instant:false});$(".qs",c).append(blk);
  $(".chk",c).onclick=()=>{const n=blk.check();$(".fbx",c).innerHTML=`<div class="fb ${n===h.qs.length?"ok":"info"}">Правильно: ${n} из ${h.qs.length}</div>`;};
  $(".tx",c).onclick=()=>{const t=$(".textbox",c);t.hidden=!t.hidden;t.textContent=h.lines.map(l=>l.t).join("\n");};return c;}
function wordDiff(user,right){// LCS по словам, сравнение с учётом регистра (важно для существительных)
  const W=s=>s.replace(/[.,!?;:„“"]/g," ").split(/\s+/).filter(Boolean);const a=W(right),b=W(user);
  const L=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)L[i][j]=a[i]===b[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
  let i=0,j=0,out=[];while(i<a.length&&j<b.length){if(a[i]===b[j]){out.push(`<span>${esc(a[i])}</span>`);i++;j++;}else if(L[i+1][j]>=L[i][j+1]){out.push(`<b style="color:var(--ok);text-decoration:underline">${esc(a[i])}</b>`);i++;}else{out.push(`<s style="color:var(--bad)">${esc(b[j])}</s>`);j++;}}
  while(i<a.length){out.push(`<b style="color:var(--ok);text-decoration:underline">${esc(a[i++])}</b>`);}while(j<b.length){out.push(`<s style="color:var(--bad)">${esc(b[j++])}</s>`);}
  return{html:out.join(" "),ok:L[0][0],total:a.length};}
function diktat(host){
  let order=shuffle(DIKTAT),k=0;
  const c=el(`<div class="card"><h3 style="margin-top:0">Диктант</h3><p class="muted small">Прослушайте предложение и напишите его. Проверяются слова, порядок и заглавные буквы у существительных. Можно слушать сколько угодно раз, кнопка «медленно» читает по частям.</p>
    <div class="row ctl"></div><div class="row" style="margin:10px 0 4px"><span class="muted small cnt"></span></div><input type="text" autocomplete="off" spellcheck="false" placeholder="Schreiben Sie den Satz …"><div class="row ub" style="margin-top:8px"></div>
    <div class="row" style="margin-top:8px"><button class="btn chk">Проверить</button><button class="btn sec nx">Следующее →</button></div><div class="fbx"></div></div>`);
  host.append(c);$(".ub",c).append(umlautBar());const inp=$("input",c);
  if(!canSpeak()){$(".ctl",c).innerHTML=`<div class="fb info">В этом браузере нет озвучки — диктант недоступен. Попробуйте Chrome или Edge.</div>`;}
  function show(){const sent=order[k%order.length];inp.value="";$(".fbx",c).innerHTML="";$(".cnt",c).textContent=`Предложение ${k%order.length+1} из ${order.length}`;c._done=false;
    const ctl=$(".ctl",c);if(!canSpeak())return;ctl.innerHTML="";const b1=playBtn([{t:sent}],"▶ Слушать");b1.className="btn";
    const parts=sent.split(/,\s*|\s+(?=(?:und|weil|wenn|dass|ob|aber)\s)/);const pl=parts.map(t=>({t}));pl.slow=true;const b2=playBtn(pl,"🐢 Медленно, по частям");ctl.append(b1,b2);inp.focus();}
  function check(){if(c._done){k++;show();return;}const sent=order[k%order.length];const d=wordDiff(inp.value,sent);c._done=true;const ok=d.ok===d.total&&inp.value.trim().split(/\s+/).length===d.total;record("diktat",ok);
    $(".fbx",c).innerHTML=`<div class="fb ${ok?"ok":"info"}">${ok?"Без ошибок! 👏":`Верно ${d.ok} из ${d.total} слов.`}</div><div class="textbox" style="margin-top:8px">${d.html}</div><p class="small muted">Зачёркнуто — лишнее или ошибочное слово, подчёркнуто — правильное слово.</p><p class="de">${esc(sent)}</p>`;}
  $(".chk",c).onclick=check;$(".nx",c).onclick=()=>{k++;show();};inp.onkeydown=e=>{if(e.key==="Enter")check();};show();
}

PAGES.lesen={t:"Lesen",g:"Экзамен",d:"Чтение: указатели, объявления, письма, текст с пропусками",r(m){
  m.innerHTML=`<h1>Lesen — чтение</h1><p class="lead">Пять типов заданий, как на экзамене. Не обязательно понимать каждое слово — ищите в тексте ключевую информацию из вопроса.</p><div id="ltabs"></div><div id="ll"></div>`;
  const G=["Teil 1","Teil 2","Teil 3","Teil 4","Teil 5"];
  $("#ltabs").append(tabs(["Teil 1 · указатели","Teil 2 · объявления","Teil 3 · письма","Teil 4 · статьи","Teil 5 · пропуски"],ti=>{$("#ll").innerHTML="";
  LESEN.filter(l=>l.teil.startsWith(G[ti])).forEach((l,i)=>{const c=el(`<div class="card"><h3 style="margin-top:0">${esc(l.teil)}</h3><div class="textbox" style="font-family:${l.teil.includes("Wegweiser")?"ui-monospace,monospace":"inherit"}"></div><div class="qs"></div><div class="row" style="margin-top:8px"><button class="btn chk">Проверить</button></div><div class="fbx"></div></div>`);
    if(l.gap){const tb=$(".textbox",c);const sel=[];l.parts.forEach((p,k)=>{tb.append(document.createTextNode(p));if(k<l.qs.length){const s=document.createElement("span");s.className="inline-opts";s.append(document.createTextNode(`(${k+1}) `));l.qs[k].o.map((o,j)=>({o,j})).sort(()=>Math.random()-.5).forEach(({o,j})=>{const b=document.createElement("button");b.className="opt";b.textContent=o;b.onclick=()=>{if(c._done)return;$$(".opt",s).forEach(x=>x.classList.remove("sel"));b.classList.add("sel");sel[k]=j;};b._j=j;s.append(b);});tb.append(s);}});
      $(".chk",c).onclick=()=>{if(c._done)return;c._done=true;let n=0;$$(".inline-opts",c).forEach((s,k)=>{const ok=sel[k]===l.qs[k].a;if(ok)n++;record("lesen",ok);$$(".opt",s).forEach(b=>{if(b._j===l.qs[k].a)b.classList.add("right");else if(b._j===sel[k])b.classList.add("wrong");});});$(".fbx",c).innerHTML=`<div class="fb ${n===l.qs.length?"ok":"info"}">Правильно: ${n} из ${l.qs.length}</div>`;};}
    else{$(".textbox",c).textContent=l.text;const blk=mcBlock(l.qs,"lesen",{instant:false});$(".qs",c).append(blk);$(".chk",c).onclick=()=>{const n=blk.check();$(".fbx",c).innerHTML=`<div class="fb ${n===l.qs.length?"ok":"info"}">Правильно: ${n} из ${l.qs.length}</div>`;};}
    $("#ll").append(c);});}));
}};

// ---------- Schreiben ----------
const GRUSS_F=/mit freundlichen gr(ü|ue)(ß|ss)en|freundliche gr(ü|ue)(ß|ss)e/i, GRUSS_I=/(viele|liebe|herzliche|beste|schöne) gr(ü|ue)(ß|ss)e|bis bald|dein[e]? /i;
const KONN=["weil","dass","deshalb","denn","aber","wenn","obwohl","außerdem","trotzdem","dann","oder","und","damit","ob"];
function localWritingCheck(task,text){
  const t=text.toLowerCase(),words=text.trim().split(/\s+/).filter(Boolean).length;const items=[];
  items.push([words>=70&&words<=140,`Объём: ${words} слов (ориентир ≈ 80, не меньше 70)`]);
  const anrF=/sehr geehrte[r]?\s/i.test(text),anrI=/^(liebe[r]?|hallo|hi)\s/im.test(text);
  items.push([task.formal?anrF:(anrI||anrF),task.formal?"Официальное обращение: «Sehr geehrte Frau …, / Sehr geehrte Damen und Herren,»":"Неофициальное обращение: «Liebe Anna, / Lieber Paul, / Hallo …,»"]);
  items.push([task.formal?GRUSS_F.test(text):(GRUSS_I.test(text)||GRUSS_F.test(text)),task.formal?"Прощание: «Mit freundlichen Grüßen» + имя":"Прощание: «Viele / Liebe Grüße» + имя"]);
  const du=/\b(du|dich|dir|dein|deine|deinen|deinem|deiner)\b/i.test(text),sie=/\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer)\b/.test(text.replace(/^\s*\S+/gm,""));
  items.push([task.formal?!du:!/\b(Ihnen|Ihre[mnrs]?)\b/.test(text),task.formal?"Везде на «Sie» (нет du/dir/dein)":"Везде на «du» (нет Sie/Ihnen)"]);
  task.punkte.forEach((p,i)=>items.push([task.keys[i].some(k=>t.includes(k)),`Пункт ${i+1}: ${p}`]));
  const used=KONN.filter(k=>new RegExp("\\b"+k+"\\b","i").test(text));
  items.push([used.filter(k=>!["und","oder","aber","dann"].includes(k)).length>=2,`Связки B1 (weil, dass, deshalb, wenn…): ${used.length?used.join(", "):"нет"}`]);
  const sentences=text.split(/[.!?]+/).filter(s=>s.trim().length>3).length;
  items.push([sentences>=6,`Предложений: ${sentences} (лучше 7–10 коротких и правильных)`]);
  return items;
}
function renderChecklist(items,box,note){const ok=items.filter(i=>i[0]).length;
  box.innerHTML=`<div class="card" style="margin:12px 0 0"><div class="row" style="justify-content:space-between"><b>Быстрая проверка</b><span class="score">${ok} / ${items.length}</span></div>
  <ul class="check-list">${items.map(i=>`<li class="${i[0]?"y":"n"}">${esc(i[1])}</li>`).join("")}</ul><p class="small muted">${note||"Быстрая проверка смотрит на структуру и ключевые слова, но не на грамматику. Для оценки ошибок используйте полную проверку Claude."}</p></div>`;}
function answerBox(placeholder,minH){
  const w=el(`<div><textarea placeholder="${esc(placeholder)}" style="min-height:${minH||200}px" spellcheck="false"></textarea><div class="muted small prev" style="min-height:1.4em"></div><div class="row tools"></div></div>`);
  const ta=$("textarea",w);$(".tools",w).append(micFor(ta,$(".prev",w)),umlautBar());return {w,ta,tools:$(".tools",w)};
}

PAGES.schreiben={t:"Schreiben",g:"Экзамен",d:"Письмо по 4 пунктам с проверкой",r(m){
  m.innerHTML=`<h1>Schreiben — письмо</h1><p class="lead">30 минут, одно письмо примерно на 80 слов. Обязательно раскройте <b>все 4 пункта</b> — за пропущенный пункт снимают баллы.</p>
   <div class="card"><h3 style="margin-top:0">Схема письма</h3><ol><li>Обращение (+ запятая, дальше с маленькой буквы)</li><li>Вступление: почему пишете</li><li>4 пункта — по 1–3 предложения на каждый</li><li>Завершение: просьба об ответе / благодарность</li><li>Прощание + имя</li></ol>
   <details><summary><b>Фразы для письма (Redemittel)</b></summary>${["formal","informell"].map(k=>`<h3>${k==="formal"?"Официальное (Sie)":"Неофициальное (du)"}</h3><table>${Object.entries(REDEMITTEL_SCHREIBEN[k]).map(([n,a])=>`<tr><td class="muted" style="width:120px">${{anrede:"Обращение",einleitung:"Вступление",bitte:"Просьба",schluss:"Конец"}[n]}</td><td class="de">${a.map(esc).join("<br>")}</td></tr>`).join("")}</table>`).join("")}</details></div>
   <div id="stabs"></div><div id="sbody"></div>`;
  const body=$("#sbody");
  $("#stabs").append(tabs(SCHREIBEN.map(s=>s.title),i=>{const task=SCHREIBEN[i];body.innerHTML="";
    const c=el(`<div class="card"><span class="pill">${task.formal?"официальное · Sie":"неофициальное · du"}</span><p style="margin:.6em 0" class="de">${esc(task.situation)}</p>
      <div class="muted small">Schreiben Sie etwas zu allen vier Punkten:</div><div class="leit">${task.punkte.map(p=>`<span>${esc(p)}</span>`).join("")}</div>
      <div class="row" style="justify-content:space-between;margin:8px 0"><span class="muted small wc">0 слов</span><span><button class="btn sec small tm">⏱ Таймер 30:00</button></span></div>
      <div class="ab"></div><div class="row" style="margin-top:10px"><button class="btn sec qc">Быстрая проверка</button>${ltBtn()}<button class="btn ai" data-need="sample" ${CAPS.sample?"":"hidden"}>Полная проверка ИИ</button></div>${noAiNote}<div class="res"></div><div class="reslt"></div><div class="res2"></div></div>`);
    const {w,ta}=answerBox(task.formal?"Sehr geehrte …,\n\n…\n\nMit freundlichen Grüßen\n…":"Liebe/Lieber …,\n\n…\n\nViele Grüße\n…",260);$(".ab",c).append(w);
    const key="dtz-draft-"+task.id;ta.value=store.get(key,"");
    const upd=()=>{const n=ta.value.trim().split(/\s+/).filter(Boolean).length;$(".wc",c).textContent=n+" слов";store.set(key,ta.value);};ta.oninput=upd;upd();
    let timer=null;$(".tm",c).onclick=e=>{const b=e.target;if(timer){clearInterval(timer);timer=null;b.textContent="⏱ Таймер 30:00";return;}let s=1800;timer=setInterval(()=>{s--;b.textContent=`⏱ ${String(s/60|0).padStart(2,"0")}:${String(s%60).padStart(2,"0")} (стоп)`;if(s<=0){clearInterval(timer);timer=null;b.textContent="⏰ Время вышло";}},1000);};
    $(".qc",c).onclick=()=>{const items=localWritingCheck(task,ta.value);renderChecklist(items,$(".res",c));record("schreiben-quick",items.every(i=>i[0]));};
    $(".lt",c).onclick=()=>ltCheck(ta.value,$(".reslt",c));
    $(".ai",c).onclick=()=>{if(ta.value.trim().split(/\s+/).length<15){$(".res2",c).innerHTML=`<div class="fb info">Напишите хотя бы несколько предложений.</div>`;return;}
      aiEvaluate("schreiben",`${task.formal?"Formeller":"Informeller"} Brief/E-Mail. Situation: ${task.situation}\nLeitpunkte: ${task.punkte.join("; ")}`,ta.value,$(".res2",c));};
    body.append(c);refreshCapUI();}));
}};

// ---------- Sprechen 1 ----------
PAGES["sprechen-1"]={t:"Sprechen 1: о себе",g:"Экзамен",d:"Представиться и ответить на вопросы",r(m){
  m.innerHTML=`<h1>Sprechen Teil 1 — sich vorstellen</h1><p class="lead">Около 3 минут. Вы рассказываете о себе, потом экзаменатор задаёт 1–2 вопроса. Говорите или печатайте ответ — его можно проверить.</p>
  <div class="card"><h3 style="margin-top:0">Что обязательно сказать</h3><div class="leit">${SPRECHEN1.punkte.map(p=>`<span>${p[0]}</span>`).join("")}</div>
   <details><summary><b>Пример ответа</b></summary><div class="textbox" style="margin-top:8px">${esc(SPRECHEN1.muster)}</div><div class="row pm" style="margin-top:8px"></div></details></div>
  <div class="card"><h3 style="margin-top:0">Ваш рассказ</h3><div class="ab"></div><div class="row" style="margin-top:10px"><button class="btn sec qc">Быстрая проверка</button>${ltBtn()}<button class="btn ai" data-need="sample" ${CAPS.sample?"":"hidden"}>Полная проверка ИИ</button></div>${noAiNote}<div class="res"></div><div class="reslt"></div><div class="res2"></div></div>
  <div class="card"><h3 style="margin-top:0">Вопрос экзаменатора</h3><p class="de fq" style="font-size:1.1rem"></p><div class="row fqb"></div><div class="ab2" style="margin-top:8px"></div><div class="row" style="margin-top:8px"><button class="btn ai2" data-need="sample" ${CAPS.sample?"":"hidden"}>Проверить ответ</button></div><div class="res3"></div></div>`;
  if(canSpeak())$(".pm",m).append(playBtn(SPRECHEN1.muster,"🔊 Прослушать пример"));
  const {w,ta}=answerBox("Ich heiße … Ich komme aus … Ich wohne seit … in …",200);$(".ab",m).append(w);
  $(".qc",m).onclick=()=>{const t=ta.value.toLowerCase();const items=SPRECHEN1.punkte.map(p=>[new RegExp(p[1],"i").test(t),p[0]]);const n=ta.value.trim().split(/\s+/).filter(Boolean).length;items.push([n>=60,`Объём: ${n} слов (≈ 1–1,5 минуты речи — это 60–100 слов)`]);renderChecklist(items,$(".res",m),"Проверяется, затронуты ли все темы. Грамматику оценит полная проверка Claude.");record("sprechen1-quick",items.every(i=>i[0]));};
  $(".lt",m).onclick=()=>ltCheck(ta.value,$(".reslt",m));
  $(".ai",m).onclick=()=>aiEvaluate("sprechen1","DTZ Sprechen Teil 1: Sich vorstellen. Punkte: "+SPRECHEN1.punkte.map(p=>p[0]).join(", "),ta.value,$(".res2",m));
  const newQ=()=>{const q=pick(SPRECHEN1.fragen);$(".fq",m).textContent=q;$(".fqb",m).innerHTML="";if(canSpeak())$(".fqb",m).append(playBtn(q,"🔊"));const nb=el(`<button class="btn sec small">Другой вопрос</button>`);nb.onclick=newQ;$(".fqb",m).append(nb);$(".res3",m).innerHTML="";};
  const a2=answerBox("Ihre Antwort …",100);$(".ab2",m).append(a2.w);newQ();
  $(".ai2",m).onclick=()=>aiEvaluate("sprechen1",`DTZ Sprechen Teil 1, Frage der Prüferin: „${$(".fq",m).textContent}“ Bewerte nur die Antwort auf diese Frage (Leitpunkt = Frage beantwortet).`,a2.ta.value,$(".res3",m));
}};

// ---------- Sprechen 2 ----------
PAGES["sprechen-2"]={t:"Sprechen 2: картинка",g:"Экзамен",d:"Описание картинки и рассказ о своём опыте",r(m){
  m.innerHTML=`<h1>Sprechen Teil 2 — Bild beschreiben & über Erfahrungen sprechen</h1><p class="lead">Сначала опишите картинку (что вы видите, кто что делает), потом ответьте на вопросы о своём опыте и о том, как это в вашей стране.</p>
  <div class="card"><details><summary><b>Фразы для описания картинки</b></summary><table>
   <tr><td class="muted">Начало</td><td class="de">Auf dem Bild sehe ich … / Das Bild zeigt …</td></tr>
   <tr><td class="muted">Где</td><td class="de">links / rechts / in der Mitte / im Vordergrund / im Hintergrund / vorne / hinten / neben …</td></tr>
   <tr><td class="muted">Действия</td><td class="de">Ein Mann trägt … / Eine Frau zeigt auf … / Die Kinder spielen …</td></tr>
   <tr><td class="muted">Догадки</td><td class="de">Ich glaube, … / Vielleicht … / Es sieht so aus, als ob … / Wahrscheinlich ist es …</td></tr>
   <tr><td class="muted">Свой опыт</td><td class="de">Bei mir ist das so: … / In meinem Heimatland … / Früher habe ich … / Ich finde es gut, dass …</td></tr></table></details></div>
  <div id="ptabs"></div><div id="pbody"></div>`;
  const body=$("#pbody");
  const pk=el(`<div class="row"><select style="max-width:340px">${SCENES.map((s,i)=>`<option value="${i}">${i+1}. ${esc(s.title)}</option>`).join("")}</select><button class="btn sec rnd">🎲 Случайная картинка</button></div>`);
  $("#ptabs").append(pk);const sel=$("select",pk);
  const showScene=i=>{sel.value=i;const sc=SCENES[i];body.innerHTML="";
    const c=el(`<div class="card"><div class="split"><div class="pic"></div>
      <div><h3 class="mt0">A. Beschreiben Sie das Bild.</h3><div class="ab"></div></div></div>
      <h3>B. Erzählen Sie über Ihre Erfahrungen.</h3><ul class="de">${sc.fragen.map(f=>`<li>${esc(f)}</li>`).join("")}</ul><div class="ab2"></div>
      <div class="row" style="margin-top:10px"><button class="btn sec qc">Быстрая проверка</button>${ltBtn()}<button class="btn ai" data-need="sample" ${CAPS.sample?"":"hidden"}>Полная проверка ИИ</button><button class="btn sec small sol">Показать описание-образец</button></div>${noAiNote}<div class="textbox solt" hidden style="margin-top:10px"></div><div class="res"></div><div class="reslt"></div><div class="res2"></div></div>`);
    $(".pic",c).innerHTML=sc.svg();
    const A=answerBox("Auf dem Bild sehe ich …",140),B=answerBox("Bei mir ist das so: …",140);$(".ab",c).append(A.w);$(".ab2",c).append(B.w);
    $(".lt",c).onclick=()=>ltCheck(A.ta.value+"\n\n"+B.ta.value,$(".reslt",c));
    $(".sol",c).onclick=()=>{const t=$(".solt",c);t.hidden=!t.hidden;t.textContent=sc.beschreibung;};
    $(".qc",c).onclick=()=>{const a=A.ta.value.toLowerCase(),b=B.ta.value.toLowerCase();const hits=sc.words.filter(w=>a.includes(w));
      const items=[[/(auf dem bild|das bild zeigt|ich sehe|man sieht)/.test(a),"Начало описания: «Auf dem Bild sehe ich …»"],
        [/(links|rechts|in der mitte|vordergrund|hintergrund|vorne|hinten|neben)/.test(a),"Указано, где что находится (links, rechts, im Hintergrund …)"],
        [hits.length>=4,`Слова по картинке: ${hits.length?hits.join(", "):"не найдено"} (нужно ≥ 4)`],
        [a.split(/\s+/).filter(Boolean).length>=35,"Описание достаточно подробное (≥ 35 слов)"],
        [/(heimatland|bei uns|in meinem land|in der ukraine|in russland|in kasachstan|in der türkei|in syrien|früher|ich habe|ich bin)/.test(b),"Рассказ о себе / о своей стране"],
        [/(weil|denn|deshalb|ich finde|meiner meinung)/.test(b),"Есть мнение или причина (weil, ich finde …)"],
        [b.split(/\s+/).filter(Boolean).length>=40,"Ответ на вопросы достаточно длинный (≥ 40 слов)"]];
      renderChecklist(items,$(".res",c));record("sprechen2-quick",items.every(i=>i[0]));};
    $(".ai",c).onclick=()=>aiEvaluate("sprechen2",`DTZ Sprechen Teil 2. Thema: ${sc.title}.\nTeil A: Bild beschreiben. Das Bild zeigt (nur für dich, der Lernende kennt diesen Text nicht): ${sc.beschreibung}\nTeil B: Über Erfahrungen sprechen. Fragen: ${sc.fragen.join(" ")}\nLeitpunkte: "Bild beschrieben", "Personen und Handlungen", "Position im Bild", ${sc.fragen.map(f=>'"'+f+'"').join(", ")}.`,
      `TEIL A (Bildbeschreibung):\n${A.ta.value}\n\nTEIL B (Erfahrungen):\n${B.ta.value}`,$(".res2",c));
    body.append(c);refreshCapUI();};
  sel.onchange=()=>showScene(+sel.value);$(".rnd",pk).onclick=()=>showScene(Math.random()*SCENES.length|0);showScene(0);
}};

// ---------- Sprechen 3 ----------
PAGES["sprechen-3"]={t:"Sprechen 3: диалог",g:"Экзамен",d:"Вместе что-то спланировать — с Claude как партнёром",r(m){
  m.innerHTML=`<h1>Sprechen Teil 3 — gemeinsam etwas planen</h1><p class="lead">Вы с партнёром планируете событие. Важно: делать предложения, реагировать на идеи партнёра, соглашаться или возражать <b>с причиной</b> и обсудить все пункты.</p>
  <div class="card"><h3 style="margin-top:0">Redemittel</h3><div class="tablewrap"><table>${REDEMITTEL_SPRECHEN.map(r=>`<tr><td class="muted" style="width:170px">${r[0]}</td><td class="de">${r[1].map(esc).join("<br>")}</td></tr>`).join("")}</table></div></div>
  <div class="card" id="lueck"></div>
  <h2>Диалог с партнёром</h2><div id="dtabs"></div><div id="dbody"></div>`;
  lueckDialog($("#lueck"));
  const body=$("#dbody");
  $("#dtabs").append(tabs(SPRECHEN3.map(s=>s.title),i=>{body.innerHTML="";dialogTask(body,SPRECHEN3[i]);}));
}};
function lueckDialog(c){
  const D=DIALOG_LUECKE;c.innerHTML=`<h3 style="margin-top:0">Разминка: ${esc(D.title)}</h3><p class="muted small">Выберите подходящую фразу для каждого пропуска.</p><div class="dl"></div><div class="row" style="margin-top:8px"><button class="btn chk">Проверить</button></div><div class="fbx"></div>`;
  const sel=[];D.lines.forEach(([who,pre,g,post])=>{const p=document.createElement("p");p.innerHTML=`<b>${who}:</b> `;p.append(document.createTextNode(pre));const s=document.createElement("span");s.className="inline-opts";
    D.gaps[g].o.map((o,j)=>({o,j})).sort(()=>Math.random()-.5).forEach(({o,j})=>{const b=document.createElement("button");b.className="opt";b.textContent=o;b._j=j;b.onclick=()=>{if(c._done)return;$$(".opt",s).forEach(x=>x.classList.remove("sel"));b.classList.add("sel");sel[g]=j;};s.append(b);});
    s._g=g;p.append(s,document.createTextNode(post));$(".dl",c).append(p);});
  $(".chk",c).onclick=()=>{if(c._done)return;c._done=true;let n=0;$$(".inline-opts",c).forEach(s=>{const g=s._g,ok=sel[g]===D.gaps[g].a;if(ok)n++;record("sprechen3-luecke",ok);$$(".opt",s).forEach(b=>{if(b._j===D.gaps[g].a)b.classList.add("right");else if(b._j===sel[g])b.classList.add("wrong");});});
    $(".fbx",c).innerHTML=`<div class="fb ${n===D.gaps.length?"ok":"info"}">Правильно: ${n} из ${D.gaps.length}</div>`;};
}
function dialogTask(host,task){
  const c=el(`<div class="card"><p class="de" style="margin-top:0">${esc(task.situation)}</p><div class="leit">${task.punkte.map(p=>`<span>${esc(p)}</span>`).join("")}</div>
    <div data-need="sample" ${CAPS.sample?"":"hidden"}>
      <div class="row"><button class="btn st">Начать диалог</button><label class="small" data-need="speak"><input type="checkbox" class="voice" checked> озвучивать партнёра</label></div>
      <div class="chat" style="margin-top:10px"></div><div class="inp" hidden><div class="ab"></div><div class="row" style="margin-top:8px"><button class="btn send">Отправить</button><button class="btn sec fin">Закончить и оценить</button></div></div><div class="res"></div>
    </div>
    <div data-noai hidden><div class="note">Диалог с ИИ-партнёром работает в Claude или с API-ключом (<a href="#einstellungen">Настройки</a>). Без него: напишите свою часть диалога (ваши реплики A, реплики B придумайте сами) и проверьте, все ли пункты обсуждены.</div><div class="ab3"></div><div class="row" style="margin-top:8px"><button class="btn sec qc">Быстрая проверка</button></div><div class="res3"></div></div></div>`);
  host.append(c);refreshCapUI();
  const off=answerBox("A: Hallo! Wann wollen wir … ?\nB: …",200);$(".ab3",c).append(off.w);
  $(".qc",c).onclick=()=>{const t=off.ta.value.toLowerCase();const items=[[/(wie wäre es|ich schlage vor|wir könnten|was hältst du)/.test(t),"Есть предложение (Wie wäre es …? / Wir könnten …)"],[/(gute idee|einverstanden|das finde ich|okay|ja, gern)/.test(t),"Есть согласие"],[/(leider|lieber|andere idee|nicht so gut|zu teuer)/.test(t),"Есть возражение или альтернатива"],[/(weil|denn)/.test(t),"Есть причина (weil/denn)"],[/(also|dann machen wir|wir treffen uns)/.test(t),"Есть итог (Also, wir …)"],[t.split(/\s+/).length>=80,"Диалог достаточно длинный (≥ 80 слов)"]];renderChecklist(items,$(".res3",c));};
  const {w,ta}=answerBox("Deine Antwort …",80);$(".ab",c).append(w);
  ta.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$(".send",c).click();}};
  const msgs=[];const chat=$(".chat",c);
  const intro=`Wir spielen die Prüfung „Deutsch-Test für Zuwanderer“, Sprechen Teil 3 („Gemeinsam etwas planen“). Du bist mein Prüfungspartner (ein anderer Kursteilnehmer). Aufgabe: ${task.situation} Diese Punkte müssen wir besprechen: ${task.punkte.join(", ")}.
Regeln für dich: Sprich einfaches, natürliches Deutsch auf Niveau B1. Wir duzen uns. Antworte immer nur mit 1 bis 3 kurzen Sätzen – nur deine gesprochene Replik, ohne Erklärungen, ohne Übersetzung, ohne Anführungszeichen. Mach eigene Vorschläge, stelle Fragen, und sei manchmal nicht einverstanden (mit Begründung), damit eine echte Diskussion entsteht. Korrigiere mich nicht. Wenn alle Punkte besprochen sind, fasse kurz zusammen und sag dann „Gut, dann machen wir das so!“.
Beginne jetzt das Gespräch mit deinem ersten Satz.`;
  const add=(who,text)=>{const d=document.createElement("div");d.className="msg "+(who==="me"?"me":"p");d.textContent=text;chat.append(d);chat.scrollTop=chat.scrollHeight;return d;};
  async function partner(){const d=add("p","…");$(".send",c).disabled=true;
    try{const input=[{role:"user",content:intro},...msgs];const t=await askClaude(input,txt=>{d.textContent=txt;chat.scrollTop=chat.scrollHeight;});const clean=t.trim().replace(/^["„]|["“]$/g,"");d.textContent=clean;msgs.push({role:"assistant",content:clean});
      if(canSpeak()&&$(".voice",c)&&$(".voice",c).checked)speak([{t:clean,v:"rounded"}]);}
    catch(e){d.textContent="(Партнёр не ответил"+(e&&e.code==="rate_limited"?": подождите минуту":"")+".)";}
    $(".send",c).disabled=false;ta.focus();}
  $(".st",c).onclick=()=>{msgs.length=0;chat.innerHTML="";$(".res",c).innerHTML="";$(".inp",c).hidden=false;$(".st",c).textContent="Начать заново";
    // первый ход: модель видит инструкцию как первое сообщение пользователя
    (async()=>{const d=add("p","…");try{const t=await askClaude(intro,txt=>{d.textContent=txt;});const clean=t.trim().replace(/^["„]|["“]$/g,"");d.textContent=clean;msgs.push({role:"assistant",content:clean});if(canSpeak()&&$(".voice",c).checked)speak([{t:clean,v:"rounded"}]);}catch(e){d.textContent="(Не удалось начать диалог. Попробуйте ещё раз.)";}})();};
  $(".send",c).onclick=()=>{const t=ta.value.trim();if(!t)return;add("me",t);ta.value="";msgs.push({role:"user",content:t});partner();};
  $(".fin",c).onclick=()=>{const mine=msgs.filter(x=>x.role==="user");if(mine.length<2){$(".res",c).innerHTML=`<div class="fb info">Сделайте хотя бы 3–4 реплики, чтобы было что оценивать.</div>`;return;}
    const transcript=msgs.map(x=>(x.role==="user"?"LERNENDER: ":"PARTNER: ")+x.content).join("\n");
    aiEvaluate("sprechen3",`DTZ Sprechen Teil 3: Gemeinsam etwas planen. ${task.situation} Leitpunkte: ${task.punkte.join(", ")}. Bewerte NUR die Beiträge des LERNENDEN (der PARTNER war ein Computer). Leitpunkte = die Planungspunkte; erfüllt, wenn der Lernende sich dazu geäußert hat.`,transcript,$(".res",c));};
}

PAGES.tests={t:"Ещё тесты",g:"Грамматика",d:"Связки, окончания прилагательных, найди ошибку, смешанный тест",r(m){
  m.innerHTML=`<h1>Ещё тесты</h1><p class="lead">Короткие тесты на самые частые ошибки и смешанный тест из всех разделов.</p><div id="ttabs"></div><div id="tbody"></div>`;
  const body=$("#tbody");
  $("#ttabs").append(tabs(["Связки (weil, deshalb…)","Окончания прилагательных","Найди правильное предложение","🎯 Смешанный тест"],i=>{body.innerHTML="";[konnTest,adjTest,fehlerTest,mixTest][i](body);}));
}};
function quizCard(host,title,intro,make,sec,n=10){const c=el(`<div class="card">${title?`<h3 style="margin-top:0">${title}</h3>`:""}${intro||""}<div class="qq"></div><button class="btn sec again" style="margin-top:12px">Новые вопросы</button></div>`);
  const run=()=>{$(".qq",c).innerHTML="";$(".qq",c).append(mcBlock(shuffle(make()).slice(0,n),sec));};$(".again",c).onclick=run;run();host.append(c);}
const shuf=q=>{const r=q.o[q.a];const o=shuffle(q.o);return{...q,o,a:o.indexOf(r)};};
function konnTest(h){quizCard(h,"Выберите связку",`<p class="small muted">Помните: <b>weil, dass, wenn, ob, obwohl, als, damit, bevor, nachdem</b> → глагол в конец; <b>deshalb, trotzdem, außerdem</b> → глагол сразу после них; <b>und, aber, oder, denn, sondern</b> → порядок не меняется.</p>`,()=>KONNEKTOREN.map(shuf),"konnektoren");}
function adjTest(h){quizCard(h,"Окончания прилагательных",`<div class="tablewrap"><table class="small"><tr><th></th><th>der</th><th>das</th><th>die</th><th>мн.ч.</th></tr>
  <tr><td>der/das/die + adj.</td><td>Nom -e, Akk <b>-en</b></td><td>-e</td><td>-e</td><td><b>-en</b></td></tr>
  <tr><td>ein/kein/mein + adj.</td><td>Nom <b>-er</b>, Akk <b>-en</b></td><td><b>-es</b></td><td>-e</td><td><b>-en</b></td></tr>
  <tr><td>без артикля</td><td>Nom -er, Akk -en</td><td>-es</td><td>-e</td><td>-e</td></tr></table></div><p class="small muted">В Dativ после любого артикля почти всегда <b>-en</b>.</p>`,()=>ADJEKTIVE.map(shuf),"adjektive");}
function fehlerTest(h){quizCard(h,"Какое предложение правильное?","",()=>FEHLER.map(f=>{const o=shuffle(f.o);return{q:"",o,a:o.indexOf(f.o[0]),e:f.e};}),"fehler");}
function mixTest(h){
  const bank=()=>[...FAELLE.map(f=>({q:f.q,o:f.o,a:f.o.indexOf(f.a),e:f.e})),...VERB_PREP.map(v=>({q:v[0],o:v[2],a:v[2].indexOf(v[1]),e:v[4]})),...KONNEKTOREN,...ADJEKTIVE,
    ...FEHLER.map(f=>({q:"Welcher Satz ist richtig?",o:f.o,a:0,e:f.e})),...Object.values(WORTSCHATZ).flat().map(w=>{const all=Object.values(WORTSCHATZ).flat();const o=shuffle([w,...shuffle(all.filter(x=>x!==w)).slice(0,2)]);return{q:`Was bedeutet „${w[0]}“?`,o:o.map(x=>x[1]),a:o.indexOf(w),e:w[2]};})].map(shuf);
  const c=el(`<div class="card"><h3 style="margin-top:0">Смешанный тест: 25 вопросов, 20 минут</h3><p class="small muted">Грамматика и лексика вперемешку. Ответы покажутся в конце — как на экзамене.</p><div class="row"><button class="btn go">Начать</button><span class="score tmr"></span></div><div class="qq"></div><div class="row fin" hidden style="margin-top:12px"><button class="btn done">Завершить и проверить</button></div><div class="fbx"></div></div>`);
  h.append(c);let timer=null,blk=null;
  const finish=()=>{if(!blk)return;clearInterval(timer);const n=blk.check();const p=Math.round(n/25*100);$(".fin",c).hidden=true;
    $(".fbx",c).innerHTML=`<div class="card" style="margin-top:14px"><div class="score">${n} / 25 · ${p}%</div><div class="bar" style="margin:8px 0"><i style="width:${p}%;background:var(--${p>=75?"ok":p>=55?"gold":"bad"})"></i></div><p>${p>=75?"Отлично — грамматика и лексика на уровне B1.":p>=55?"Хорошая база. Повторите темы, где были ошибки (они отмечены красным выше).":"Стоит ещё потренироваться: начните с разделов «Глаголы» и «Падежи»."}</p></div>`;
    record("mix",p>=60);$(".go",c).textContent="Начать заново";blk=null;};
  $(".go",c).onclick=()=>{$(".fbx",c).innerHTML="";blk=mcBlock(shuffle(bank()).slice(0,25),"mix-q",{instant:false});$(".qq",c).innerHTML="";$(".qq",c).append(blk);$(".fin",c).hidden=false;
    let t=1200;clearInterval(timer);timer=setInterval(()=>{t--;$(".tmr",c).textContent=`⏱ ${String(t/60|0).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;if(t<=0)finish();},1000);};
  $(".done",c).onclick=finish;
}

PAGES.einstellungen={t:"Настройки",g:"",d:"Озвучка, микрофон и ИИ-проверка",r(m){
  const inC=CAPS.inClaude;
  m.innerHTML=`<h1>Настройки</h1>
  <div class="card"><h3 style="margin-top:0">Что работает сейчас</h3><ul class="check-list">
   <li class="${canSpeak()?"y":"n"}">Озвучка (Hören, диктант, лексика)${CAPS.tts?" — голос Claude":canSpeak()?" — голос браузера":" — недоступна в этом браузере"}</li>
   <li class="${CAPS.dict?"y":"n"}">Микрофон для устных заданий${!CAPS.dict?" — в этом браузере недоступен":CAPS.dict.whisper?" — распознавание на устройстве (Whisper; при первом использовании скачивается ~75 МБ)":CAPS.dict.browser?" — распознавание браузера":" — через Claude"}</li>
   <li class="${CAPS.sample?"y":"n"}">Полная проверка ИИ и диалог с партнёром${inC&&CAPS.sample?" — через Claude":CAPS.sample?" — через ваш API-ключ":" — не подключена"}</li></ul></div>
  ${inC?`<div class="card"><p>Сайт открыт в Claude, ключ не нужен.</p></div>`:`<div class="card"><h3 style="margin-top:0">API-ключ Anthropic (необязательно)</h3>
   <p>Если сайт открыт не в Claude (например, на GitHub Pages), полную проверку письма и речи можно включить своим ключом с <a href="https://console.anthropic.com/">console.anthropic.com</a>. Каждая проверка стоит несколько центов и оплачивается с вашего аккаунта.</p>
   <p class="small"><b>Ключ хранится только в этом браузере</b> и отправляется только в Anthropic. Не вставляйте его в файлы сайта и не публикуйте на GitHub. Каждый друг вводит свой ключ.</p>
   <input type="text" id="key" placeholder="sk-ant-…" autocomplete="off" spellcheck="false" style="font-family:monospace">
   <div class="row" style="margin-top:8px"><input type="text" id="model" style="max-width:260px;font-family:monospace" placeholder="claude-sonnet-5-5"><span class="small muted">модель</span></div>
   <div class="row" style="margin-top:10px"><button class="btn" id="save">Сохранить и проверить</button><button class="btn sec" id="del">Удалить ключ</button></div><div id="kres"></div></div>`}`;
  if(inC)return;
  $("#key").value=store.get("dtz-apikey","");$("#model").value=store.get("dtz-model","claude-sonnet-5-5");
  $("#save").onclick=async()=>{store.set("dtz-apikey",$("#key").value.trim());store.set("dtz-model",$("#model").value.trim()||"claude-sonnet-5-5");CAPS.sample=apiSample();
    if(!CAPS.sample){$("#kres").innerHTML=`<div class="fb info">Ключ удалён.</div>`;return;}
    $("#kres").innerHTML=`<div class="fb info"><span class="spin"></span> Проверяю ключ…</div>`;
    try{const r=await CAPS.sample("Antworte nur mit dem Wort: OK");$("#kres").innerHTML=`<div class="fb ok">Работает! Ответ: ${esc(r.text.slice(0,40))}</div>`;}
    catch(e){$("#kres").innerHTML=`<div class="fb bad">Ошибка: ${esc(e.message||e.code)}</div>`;}};
  $("#del").onclick=()=>{store.set("dtz-apikey","");CAPS.sample=null;$("#key").value="";$("#kres").innerHTML=`<div class="fb info">Ключ удалён из браузера.</div>`;};
}};

PAGES.fortschritt={t:"Прогресс",g:"",d:"Статистика ответов по разделам",r(m){
  const names={praesens:"Präsens",allverbs:"Все глаголы (тренажёр)",verbcheck:"Проверка своей формы",languagetool:"Грамматика LanguageTool (без ошибок)",perfekt:"Perfekt",praeteritum:"Präteritum",konj2:"Konjunktiv II",trennbar:"Отделяемые/возвратные",verbprep:"Глаголы с предлогами",satzbau:"Порядок слов",faelle:"Падежи",wortschatz:"Лексика",hoeren:"Hören",lesen:"Lesen","schreiben-quick":"Schreiben (быстрая)","ai-schreiben":"Schreiben (Claude, B1)","sprechen1-quick":"Sprechen 1 (быстрая)","ai-sprechen1":"Sprechen 1 (Claude, B1)","sprechen2-quick":"Sprechen 2 (быстрая)","ai-sprechen2":"Sprechen 2 (Claude, B1)","sprechen3-luecke":"Sprechen 3 (пропуски)","ai-sprechen3":"Sprechen 3 (Claude, B1)",diktat:"Диктант",konnektoren:"Связки",adjektive:"Окончания прилагательных",fehler:"Найди ошибку","mix-q":"Смешанный тест (вопросы)",mix:"Смешанный тест (≥60%)"};
  const rows=Object.entries(STATS);
  m.innerHTML=`<h1>Прогресс</h1><p class="lead">Доля правильных ответов по разделам (сохраняется в этом браузере).</p><div class="card">${rows.length?rows.map(([k,s])=>{const p=Math.round(s.c/s.t*100);return`<div style="margin:10px 0"><div class="row" style="justify-content:space-between"><b>${names[k]||k}</b><span class="muted small">${s.c} / ${s.t} · ${p}%</span></div><div class="bar"><i style="width:${p}%;background:var(--${p>=75?"ok":p>=50?"gold":"bad"})"></i></div></div>`;}).join(""):`<p class="muted">Пока нет ответов. Начните с любого раздела!</p>`}</div>
   <button class="btn sec" id="rst">Сбросить статистику</button><div id="rq"></div>`;
  $("#rst").onclick=()=>{$("#rq").innerHTML=`<div class="fb bad" style="margin-top:10px">Точно сбросить? <button class="btn small" id="y">Да</button> <button class="btn sec small" id="n">Нет</button></div>`;$("#y").onclick=()=>{STATS={};store.set("dtz-stats",STATS);go();};$("#n").onclick=()=>$("#rq").innerHTML="";};
}};

// ---------- навигация ----------
["start","verben","satzbau","faelle","tests","wortschatz","hoeren","lesen","schreiben","sprechen-1","sprechen-2","sprechen-3","fortschritt","einstellungen"].forEach(k=>{const v=PAGES[k];delete PAGES[k];PAGES[k]=v;});
const SECMAP={verben:["allverbs","verbcheck","praesens","perfekt","praeteritum","konj2","trennbar","verbprep"],satzbau:["satzbau"],faelle:["faelle"],wortschatz:["wortschatz"],hoeren:["hoeren","diktat"],tests:["konnektoren","adjektive","fehler","mix","mix-q"],lesen:["lesen"],schreiben:["schreiben-quick","ai-schreiben"],"sprechen-1":["sprechen1-quick","ai-sprechen1"],"sprechen-2":["sprechen2-quick","ai-sprechen2"],"sprechen-3":["sprechen3-luecke","ai-sprechen3"]};
function renderNav(){
  const cur=location.hash.slice(1)||"start";let g=null,html=`<div class="brand"><span class="flag"></span><b>DTZ B1</b></div>`;
  Object.entries(PAGES).forEach(([k,p])=>{if(p.g!==g&&p.g){html+=`<div class="navgroup">${p.g}</div>`;}g=p.g;
    const done=(SECMAP[k]||[]).some(s=>STATS[s]&&STATS[s].t>0);html+=`<a href="#${k}" class="${k===cur?"active":""} ${done?"done":""}"><span class="dot"></span>${p.t}</a>`;});
  $("#nav").innerHTML=html;
}
function go(){const k=location.hash.slice(1);const p=PAGES[k]||PAGES.start;const tt=$("#toptitle");if(tt)tt.textContent=p.t;const m=$("#app");m.innerHTML="";p.r(m);renderNav();refreshCapUI();window.scrollTo(0,0);$("#nav").classList.remove("open");
  if(CAPS.dict&&DICT.state==="listening")CAPS.dict.stop().catch(()=>{});}
window.addEventListener("hashchange",go);
$("#menubtn").onclick=()=>$("#nav").classList.toggle("open");
document.addEventListener("click",e=>{const n=$("#nav");if(n.classList.contains("open")&&!n.contains(e.target)&&e.target.id!=="menubtn")n.classList.remove("open");});
loadAudio().then(()=>{if(location.hash.slice(1)==="hoeren")go();});go();loadCaps();
