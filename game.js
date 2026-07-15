const GAS_URL = "https://script.google.com/macros/s/AKfycbxf30pT9UPbkRzT9FjtxCYrQAuQbf5r_NBnar4UbW4VbSmdk-85qd-8H9XeqVa7xbEjsw/exec";
const SHEET_NAME = "[PROJECT: BIO-RESCUE - Code Blue]";
let pData = { id:"", name:"", progress:0, score:100 };
let errorCount = 0, currentStageFunc = null;
let actx = null, sirenInt = null, flatSound = null;

function updateProgress(idx) {
  for (let i = 0; i < 9; i++) {
    const dot = document.getElementById("pd-" + i);
    if (!dot) continue;
    dot.className = "progress-dot" + (i < idx ? " done" : i === idx ? " active" : "");
  }
}

function spawnRipple(e, wrapperId) {
  const wrap = document.getElementById(wrapperId);
  if (!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const cx = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left + rect.width/2);
  const cy = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : rect.top + rect.height/2);
  const x = cx - rect.left, y = cy - rect.top;
  const rip = document.createElement("div");
  rip.className = "ripple";
  rip.style.cssText = "width:30px;height:30px;left:" + (x-15) + "px;top:" + (y-15) + "px;";
  wrap.appendChild(rip);
  setTimeout(() => rip.remove(), 720);
}

document.querySelectorAll(".scene-wrap").forEach(wrap => {
  wrap.addEventListener("click", e => spawnRipple(e, wrap.id));
  wrap.addEventListener("touchstart", e => { if (e.touches[0]) spawnRipple(e, wrap.id); }, { passive:true });
});

document.addEventListener("mousemove", e => {
  const wrap = document.querySelector(".screen.active .scene-wrap");
  if (!wrap) return;
  const img = wrap.querySelector(".scene-img");
  if (!img) return;
  const rect = wrap.getBoundingClientRect();
  const dx = (e.clientX - rect.left - rect.width/2) / rect.width * 9;
  const dy = (e.clientY - rect.top - rect.height/2) / rect.height * 5;
  img.style.transform = "scale(1.07) translate(" + dx + "px," + dy + "px)";
});

document.addEventListener("touchmove", e => {
  if (!e.touches[0]) return;
  const wrap = document.querySelector(".screen.active .scene-wrap");
  if (!wrap) return;
  const img = wrap.querySelector(".scene-img");
  if (!img) return;
  const rect = wrap.getBoundingClientRect();
  const dx = (e.touches[0].clientX - rect.left - rect.width/2) / rect.width * 7;
  const dy = (e.touches[0].clientY - rect.top - rect.height/2) / rect.height * 4;
  img.style.transform = "scale(1.06) translate(" + dx + "px," + dy + "px)";
}, { passive:true });

function playSnd(type) {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = actx.createOscillator(), gn = actx.createGain();
    osc.connect(gn); gn.connect(actx.destination);
    if (type === "beep") { osc.frequency.value = 800; gn.gain.value = 0.08; osc.start(); osc.stop(actx.currentTime + 0.1); }
    else if (type === "fail") { osc.frequency.value = 150; gn.gain.value = 0.18; osc.start(); osc.stop(actx.currentTime + 0.3); }
    else if (type === "success") {
      osc.frequency.value = 523; gn.gain.value = 0.09; osc.start(); osc.stop(actx.currentTime + 0.1);
      setTimeout(() => { const o2=actx.createOscillator(),g2=actx.createGain(); o2.connect(g2); g2.connect(actx.destination); o2.frequency.value=659; g2.gain.value=0.09; o2.start(); o2.stop(actx.currentTime+0.2); }, 120);
    }
    else if (type === "flat") { osc.frequency.value = 400; gn.gain.value = 0.04; osc.start(); return {osc,gn}; }
  } catch(e) {} return null;
}

function toggleSiren(on) {
  if (on) {
    flatSound = playSnd("flat");
    sirenInt = setInterval(() => { try { if(!actx) return; const o=actx.createOscillator(),g=actx.createGain(); o.connect(g); g.connect(actx.destination); o.frequency.value=880; g.gain.value=0.08; o.start(); o.stop(actx.currentTime+0.2); } catch(e) {} }, 800);
  } else {
    if (sirenInt) clearInterval(sirenInt);
    if (flatSound) { try { flatSound.osc.stop(); } catch(e) {} }
  }
}

function switchUI(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  setTimeout(() => { const img = document.querySelector(".screen.active .scene-img"); if (img) img.style.transform = "scale(1)"; }, 50);
}

function setBPM(val, status) {
  const el = document.getElementById("ui-bpm");
  el.innerText = "♥ " + val + " BPM";
  el.className = status === "danger" ? "status-bpm pulse-danger" : "status-bpm pulse-normal";
}

function updateScore(amt) {
  pData.score = Math.max(0, pData.score + amt);
  document.getElementById("ui-score").innerText = pData.score + "점";
}

function triggerError(restartFunc) {
  errorCount++; playSnd("fail"); updateScore(-5);
  const appEl = document.getElementById("app");
  appEl.style.animation = "none"; void appEl.offsetHeight; appEl.style.animation = "app-shake 0.4s";
  setTimeout(() => appEl.style.animation = "", 400);
  if (errorCount >= 3) { setTimeout(() => initCodeBlue(restartFunc), 500); }
  else { const bpmText = document.getElementById("ui-bpm").innerText; const cur = parseInt(bpmText.replace(/[^0-9]/g,""))||0; if (cur > 40) setBPM(cur - 5, "danger"); }
}

function startGame() {
  const sid = document.getElementById("studentId").value.trim();
  const sname = document.getElementById("studentName").value.trim();
  if (!sid || !sname) return alert("학번과 이름을 입력하세요.");
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  pData.id = sid; pData.name = sname;
  updateProgress(1); switchUI("screen-cpr");
}

let introCpr = 0;
function doIntroCPR() {
  introCpr++; playSnd("beep");
  document.getElementById("cpr-gauge").style.width = (introCpr/15*100) + "%";
  document.getElementById("cpr-count").innerText = introCpr + " / 15";
  const btn = document.getElementById("cprBtn");
  btn.style.transform = "scale(0.88)"; setTimeout(() => btn.style.transform="scale(1)", 100);
  if (introCpr >= 15) { setBPM(40,"normal"); playSnd("success"); setTimeout(() => startStage1(), 600); }
}

let s1Zone = 0, s1SelNut = null, s1SelEnz = null;
const s1Logic = [
  { name:"입", img:"이미지/Bio_Rescue_Code_Blue_-_Slide_3.png", items:["녹말","단백질","지방"], rule:{"녹말":"아밀레이스","단백질":"통과","지방":"통과"} },
  { name:"위", img:"이미지/Bio_Rescue_Code_Blue_-_Slide_4.png", items:["엿당","단백질","지방"], rule:{"단백질":"펩신","엿당":"통과","지방":"통과"} },
  { name:"작은창자", img:"이미지/Bio_Rescue_Code_Blue_-_Slide_6.png", items:["엿당","중간단백질","지방"], rule:{"지방":"라이페이스","엿당":"탄수화물 소화 효소","중간단백질":"단백질 소화 효소"} }
];

function startStage1(isRetry) {
  updateProgress(2); switchUI("screen-stage1");
  if (!isRetry) { s1Zone = 0; }
  currentStageFunc = function () { startStage1(true); };
  errorCount = 0; renderS1();
}
function renderS1() {
  const data = s1Logic[s1Zone];
  document.getElementById("s1-img").src = data.img;
  document.getElementById("s1-zone-title").innerText = "구역: " + data.name;
  document.getElementById("s1-desc").innerHTML = "[" + data.name + "] 알맞은 소화 효소를 매칭하세요. 분해 안 되면 [그냥 통과]를 선택하세요.";
  const grid = document.getElementById("s1-nutrient-grid"); grid.innerHTML = "";
  data.items.forEach(itm => {
    const div = document.createElement("div"); div.className = "match-item nutrient"; div.innerText = itm;
    div.onclick = () => { document.querySelectorAll(".nutrient").forEach(el=>el.classList.remove("selected")); div.classList.add("selected"); s1SelNut={el:div,val:itm}; checkS1Match(); };
    grid.appendChild(div);
  });
  document.querySelectorAll(".enzyme").forEach(el=>el.classList.remove("selected"));
  s1SelNut=null; s1SelEnz=null; document.getElementById("btn-s1-next").style.display="none";
}
function selectItem(el, type, val) {
  if (type === "enzyme") { document.querySelectorAll(".enzyme").forEach(e=>e.classList.remove("selected")); el.classList.add("selected"); s1SelEnz={el,val}; checkS1Match(); }
}
function checkS1Match() {
  if (!s1SelNut || !s1SelEnz) return;
  const rule = s1Logic[s1Zone].rule;
  if (rule[s1SelNut.val] === s1SelEnz.val) {
    playSnd("success");
    s1SelNut.el.classList.add(s1SelEnz.val==="통과" ? "bypassed" : "digested");
    s1SelNut.el.classList.remove("selected","nutrient");
    s1SelNut.el.innerText = s1SelEnz.val==="통과" ? s1SelNut.val+" ↪패스" : s1SelNut.val+" ✅분해됨";
    s1SelNut=null; s1SelEnz=null;
    if (document.querySelectorAll(".nutrient:not(.digested):not(.bypassed)").length === 0) document.getElementById("btn-s1-next").style.display="block";
  } else {
    s1SelNut.el.classList.remove("selected"); s1SelEnz.el.classList.remove("selected");
    s1SelNut=null; s1SelEnz=null; triggerError(function () { startStage1(true); });
  }
}
function nextS1Zone() {
  s1Zone++;
  if (s1Zone > 2) { setBPM(50,"normal"); startStage2(); }
  else { setBPM(40+s1Zone*5,"normal"); renderS1(); }
}

let s2Items=[{name:"포도당",ans:"모세혈관"},{name:"지방산",ans:"암죽관"},{name:"아미노산",ans:"모세혈관"}];
let s2Idx=0, toxSel=false;
function startStage2(isRetry) {
  updateProgress(3); switchUI("screen-stage2");
  if (!isRetry) {
    s2Idx = 0; toxSel = false;
    document.getElementById("s2-p1").style.display = "block";
    document.getElementById("s2-p2").style.display = "none";
  } else {
    if (s2Idx >= s2Items.length) {
      document.getElementById("s2-p1").style.display = "none";
      document.getElementById("s2-p2").style.display = "block";
      toxSel = false;
      var tox = document.getElementById("s2-toxin");
      tox.className = "toxin-node";
      tox.style.background = "";
      tox.style.color = "";
      tox.style.animation = "shake .5s infinite";
      tox.innerHTML = "&#9760;&#65039; 암모니아";
    } else {
      document.getElementById("s2-p1").style.display = "block";
      document.getElementById("s2-p2").style.display = "none";
    }
  }
  document.getElementById("btn-s2-next").style.display = "none";
  currentStageFunc = function () { startStage2(true); };
  errorCount = 0; updS2Card();
}
function updS2Card() { if(s2Idx>=s2Items.length){document.getElementById("s2-p1").style.display="none";document.getElementById("s2-p2").style.display="block";return;} document.getElementById("s2-target").innerText=s2Items[s2Idx].name; }
function swipeS2(dir) { if(s2Items[s2Idx].ans===dir){playSnd("success");s2Idx++;updS2Card();}else triggerError(function () { startStage2(true); }); }
function selectToxin() { toxSel=true; document.getElementById("s2-toxin").classList.add("selected"); playSnd("beep"); }
function triggerDetox() {
  if (!toxSel) return triggerError(function () { startStage2(true); });
  playSnd("success");
  const tox=document.getElementById("s2-toxin");
  tox.className="toxin-node"; tox.style.background="var(--neon-green)"; tox.style.color="#000"; tox.style.animation="none"; tox.innerText="✅ 안전한 요소";
  document.getElementById("btn-s2-next").style.display="block";
}
function goStage3() { setBPM(60,"normal"); startStage3(); }

let o2Cnt=0, co2Cnt=0;
function startStage3(isRetry) {
  updateProgress(4); switchUI("screen-stage3");
  
  const container = document.getElementById("s3-bubbles");
  const bubbles = container.querySelectorAll(".bubble");
  
  // 5 cols x 2 rows grid for random placement (prevents overlaps)
  const positions = [];
  const cols = 5;
  const rows = 2;
  const cellWidth = 90 / cols; 
  const cellHeight = 90 / rows;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push({
        x: c * cellWidth + 5 + Math.random() * (cellWidth - 16),
        y: r * cellHeight + 5 + Math.random() * (cellHeight - 16)
      });
    }
  }
  // Shuffle positions
  positions.sort(() => Math.random() - 0.5);
  
  bubbles.forEach((b, idx) => {
    if (positions[idx]) {
      b.style.left = positions[idx].x + "%";
      b.style.top = positions[idx].y + "%";
    }
    
    if (!isRetry) {
      b.classList.remove("hit", "tapped-once"); 
      b.dataset.taps = "0";
      b.style.opacity = "1"; 
      b.style.pointerEvents = "auto";
      const hint = b.querySelector(".bubble-tap-hint");
      if (hint) {
        hint.innerText = b.classList.contains("bubble-co2") ? "2번 탭!" : "탭!";
      }
    }
  });

  if (!isRetry) {
    o2Cnt = 0; co2Cnt = 0;
  }
  currentStageFunc = function () { startStage3(true); };
  errorCount = 0; updS3();
  document.getElementById("btn-s3-next").style.display = (o2Cnt >= 5 && co2Cnt >= 5) ? "block" : "none";
}
function updS3() {
  document.getElementById("s3-o2").innerText = "🔵 O₂ 흡수: " + o2Cnt + "/5";
  document.getElementById("s3-co2").innerText = "🔴 CO₂ 방출: " + co2Cnt + "/5";
}
function hitGas(type, el) {
  if (el.classList.contains("hit")) return;
  playSnd("beep");
  if (type === "co2") {
    var taps = parseInt(el.dataset.taps || "0") + 1;
    el.dataset.taps = taps;
    if (taps === 1) {
      el.classList.add("tapped-once");
      el.querySelector(".bubble-tap-hint").innerText = "한 번 더!";
    } else {
      el.classList.remove("tapped-once"); el.classList.add("hit");
      co2Cnt++; updS3();
      if (o2Cnt >= 5 && co2Cnt >= 5) { playSnd("success"); document.getElementById("btn-s3-next").style.display = "block"; }
    }
  } else {
    el.classList.add("hit");
    o2Cnt++; updS3();
    if (o2Cnt >= 5 && co2Cnt >= 5) { playSnd("success"); document.getElementById("btn-s3-next").style.display = "block"; }
  }
}
function goStage4() { setBPM(70,"normal"); startStage4(); }

let v1St=false, v2St=false, pumpTm=null;
function startStage4(isRetry) {
  updateProgress(5); switchUI("screen-stage4");
  if (!isRetry) {
    v1St = false; v2St = false;
    document.getElementById("v1").className = "valve-btn"; document.getElementById("v2").className = "valve-btn";
    var pump = document.getElementById("s4-pump"); pump.className = "hold-pump"; pump.style.opacity = "0.4"; pump.style.pointerEvents = "none"; pump.innerText = "❤️ 좌심실 강력 펌핑 (HOLD 2초)";
  }
  currentStageFunc = function () { startStage4(true); };
  errorCount = 0;
  document.getElementById("btn-s4-next").style.display = "none"; initPump();
}
function toggleValve(num) {
  playSnd("beep");
  if(num===1){v1St=!v1St;document.getElementById("v1").className=v1St?"valve-btn open":"valve-btn";}
  if(num===2){v2St=!v2St;document.getElementById("v2").className=v2St?"valve-btn open":"valve-btn";}
  if(v1St&&v2St){const p=document.getElementById("s4-pump");p.className="hold-pump enabled";p.style.opacity="1";p.style.pointerEvents="auto";}
}
function initPump() {
  const btn=document.getElementById("s4-pump");
  btn.onpointerdown=(e)=>{e.preventDefault();if(!v1St||!v2St)return;playSnd("beep");btn.innerText="펌핑 중... 유지하세요!";pumpTm=setTimeout(()=>{playSnd("success");btn.innerText="✅ 순환 개방 완료!";btn.className="hold-pump";btn.style.background="rgba(72,229,194,0.15)";btn.style.borderColor="var(--neon-green)";document.getElementById("btn-s4-next").style.display="block";},2000);};
  btn.onpointerup=btn.onpointerleave=()=>{if(pumpTm){clearTimeout(pumpTm);pumpTm=null;if(btn.innerText!=="✅ 순환 개방 완료!"){btn.innerText="실패! 다시 2초간 누르세요";triggerError(function () { startStage4(true); });}}};
}
function goStage5() { setBPM(80,"normal"); startStage5(); }

function startStage5(isRetry) {
  updateProgress(6); switchUI("screen-stage5");
  if (!isRetry) {
    ["s5-a1","s5-a2","s5-a3"].forEach(id=>document.getElementById(id).value="");
  }
  currentStageFunc = function () { startStage5(true); };
  errorCount = 0;
}
function checkStage5() {
  const a1=document.getElementById("s5-a1").value, a2=document.getElementById("s5-a2").value, a3=document.getElementById("s5-a3").value;
  if(a1==="혈소판"&&a2==="백혈구"&&a3==="적혈구"){playSnd("success");setBPM(85,"normal");startStage6();}else triggerError(function () { startStage5(true); });
}

let s6Int=null, s6Save=0;
const S6_GOAL = 8;
function startStage6(isRetry) {
  updateProgress(7); switchUI("screen-stage6");
  if (!isRetry) { s6Save=0; }
  document.getElementById("s6-status").innerText="구출된 영양소: "+s6Save+"/"+S6_GOAL;
  document.getElementById("s6-river").innerHTML="";
  document.getElementById("btn-s6-next").style.display=s6Save>=S6_GOAL?"block":"none";
  if(s6Int)clearInterval(s6Int);
  if(s6Save<S6_GOAL) s6Int=setInterval(spawnItem,780);
  currentStageFunc = function () { startStage6(true); };
  errorCount = 0;
}
function spawnItem() {
  if(!document.getElementById("screen-stage6").classList.contains("active"))return clearInterval(s6Int);
  const types=[
    {t:"🍬 포도당",isGood:true},{t:"🥩 아미노산",isGood:true},
    {t:"☠️ 요소",isGood:false},{t:"🔴 단백질",isGood:false},
    {t:"🟡 탄수화물",isGood:false},{t:"🟫 지방",isGood:false},{t:"🔴 혈구",isGood:false}
  ];
  const rnd=Math.random();
  const sel = rnd<0.42 ? types[Math.floor(Math.random()*2)] : types[2+Math.floor(Math.random()*5)];
  const el=document.createElement("div"); el.className="falling-item"; el.innerText=sel.t;
  el.style.background=sel.isGood?"linear-gradient(135deg,rgba(72,229,194,0.88),rgba(40,180,150,0.92))":"linear-gradient(135deg,rgba(255,80,60,0.88),rgba(180,30,20,0.92))";
  el.style.color=sel.isGood?"#020a18":"white"; el.style.top="-35px"; el.style.left=(Math.random()*72+4)+"%";
  el.onpointerdown=()=>{
    if(sel.isGood){s6Save++;document.getElementById("s6-status").innerText="구출된 영양소: "+s6Save+"/"+S6_GOAL;playSnd("beep");el.remove();if(s6Save>=S6_GOAL){clearInterval(s6Int);playSnd("success");document.getElementById("btn-s6-next").style.display="block";}}
    else{el.remove();triggerError(function () { startStage6(true); });}
  };
  document.getElementById("s6-river").appendChild(el);
  const riverH=document.getElementById("s6-river").offsetHeight||300;
  let y=-35; const fall=setInterval(()=>{y+=3.2;el.style.top=y+"px";if(y>riverH){clearInterval(fall);if(sel.isGood&&el.parentNode)triggerError(function () { startStage6(true); });el.remove();}},40);
}
function goEpilogue() { setBPM(90,"normal"); startEpilogue(); }

let epiNut=false, epiO2=false;
function startEpilogue() { updateProgress(8); switchUI("screen-epilogue"); epiNut=false; epiO2=false; document.getElementById("epi-nut").classList.remove("active"); document.getElementById("epi-o2").classList.remove("active"); document.getElementById("btn-finish").style.display="block"; document.getElementById("sync-msg").innerText=""; }
function toggleEpi(type) {
  playSnd("beep");
  if(type==="nut"){epiNut=!epiNut;document.getElementById("epi-nut").className=epiNut?"fusion-node active":"fusion-node";}
  if(type==="o2"){epiO2=!epiO2;document.getElementById("epi-o2").className=epiO2?"fusion-node active":"fusion-node";}
}
function finishGame() {
  if(!epiNut||!epiO2)return alert("영양소와 산소를 모두 탭하여 활성화하세요!");
  playSnd("success"); setBPM(100,"normal"); pData.progress=100;
  document.getElementById("btn-finish").style.display="none"; document.getElementById("sync-msg").innerText="⏳ 동기화 중...";
  document.getElementById("app").style.animation="victory-glow 1s infinite";
  fetch(GAS_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},body:JSON.stringify({sheetName:SHEET_NAME,studentId:pData.id,studentName:pData.name,progress:pData.progress,score:pData.score})})
  .then(()=>{document.getElementById("sync-msg").innerHTML="✅ 구조 보고서 전송 완료!<br>최종 점수: <strong style='color:var(--warn-yellow);font-size:1.2rem;'>"+pData.score+"점</strong>";})
  .catch(()=>{document.getElementById("sync-msg").innerText="⚠️ 네트워크 오류로 기록 저장 실패.";});
}

let cbTaps=0, cbHoldTm=null;
function initCodeBlue(restartFunc) {
  toggleSiren(true); setBPM(0,"danger");
  document.getElementById("cb-panel").classList.add("active");
  document.getElementById("cb-tap-ui").style.display="block"; document.getElementById("cb-hold-ui").style.display="none";
  cbTaps=0; document.getElementById("cb-gauge").style.width="0%"; document.getElementById("cb-count").innerText="0 / 15";
  const btn=document.getElementById("cbBtn");
  btn.style.marginLeft="0%"; btn.style.transition="transform .08s, box-shadow .08s, margin-left .1s";
  btn.style.pointerEvents="auto";
  currentStageFunc=restartFunc;
}
function doCodeBlueCPR() {
  if (cbTaps >= 15) return;
  cbTaps++; playSnd("beep");
  document.getElementById("cb-gauge").style.width=(cbTaps/15*100)+"%"; document.getElementById("cb-count").innerText=cbTaps+" / 15";
  const btn=document.getElementById("cbBtn"); btn.style.transform="scale(0.88)"; setTimeout(()=>btn.style.transform="scale(1)",80);
  btn.style.marginLeft=Math.round((cbTaps/15)*80)+"%";
  if(cbTaps>=15){
    btn.style.pointerEvents="none";
    playSnd("success"); btn.style.marginLeft="0%";
    setTimeout(()=>{
      document.getElementById("cb-tap-ui").style.display="none";
      document.getElementById("cb-hold-ui").style.display="block";
      document.getElementById("cbHoldBtn").style.display="flex";
      initHoldCPR();
    }, 2500);
  }
}
function initHoldCPR() {
  const btn=document.getElementById("cbHoldBtn");
  btn.onpointerdown=(e)=>{e.preventDefault();playSnd("beep");let timeLeft=5;btn.innerText=timeLeft+"s";cbHoldTm=setInterval(()=>{timeLeft--;btn.innerText=timeLeft+"s";playSnd("beep");if(timeLeft<=0){clearInterval(cbHoldTm);cbHoldTm=null;reviveCodeBlue();}},1000);};
  btn.onpointerup=btn.onpointerleave=()=>{if(cbHoldTm){clearInterval(cbHoldTm);cbHoldTm=null;btn.innerText="HOLD 5s";playSnd("fail");alert("압박 실패! 손을 떼면 안 됩니다.");}};
}
function reviveCodeBlue() {
  toggleSiren(false); playSnd("success"); updateScore(-15); errorCount = 0;
  document.getElementById("cb-panel").classList.remove("active");
  alert("V/S 극적 회복! 현재 구역부터 재시도합니다.");
  if (currentStageFunc) currentStageFunc();
}
