const GAS_URL = "https://script.google.com/macros/s/AKfycbxf30pT9UPbkRzT9FjtxCYrQAuQbf5r_NBnar4UbW4VbSmdk-85qd-8H9XeqVa7xbEjsw/exec";
const SHEET_NAME = "[PROJECT: BIO-RESCUE]";
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

let speechTimer = null;
function speakCodeBlue(count) {
  if (!count || count <= 0) return;
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      var utterance = new SpeechSynthesisUtterance("코드블루! 코드블루!");
      utterance.lang = "ko-KR";
      utterance.rate = 1.05;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
      
      if (count > 1) {
        speechTimer = setTimeout(function() {
          speakCodeBlue(count - 1);
        }, 2500);
      }
    }
  } catch (e) {}
}

function playSnd(type) {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
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
    toggleSiren(false);
    speakCodeBlue(2);
    let toggle = false;
    sirenInt = setInterval(() => {
      try {
        if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === "suspended") actx.resume();
        const o = actx.createOscillator(), g = actx.createGain();
        o.connect(g);
        g.connect(actx.destination);
        o.type = "sawtooth";
        o.frequency.value = toggle ? 950 : 750;
        g.gain.setValueAtTime(0.05, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.38);
        o.start();
        o.stop(actx.currentTime + 0.38);
        toggle = !toggle;
      } catch (e) { }
    }, 400);
  } else {
    if (sirenInt) {
      clearInterval(sirenInt);
      sirenInt = null;
    }
    if (speechTimer) {
      clearTimeout(speechTimer);
      speechTimer = null;
    }
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch(e) {}
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

  // 프롤로그 진입 시 사이렌 소리 재생
  const siren = document.getElementById("sirenAudio");
  if (siren) {
    siren.currentTime = 0;
    siren.play().catch(e => { console.log("Siren audio play blocked:", e); });
  }
}

let introCpr = 0;
function doIntroCPR() {
  introCpr++; playSnd("beep");
  document.getElementById("cpr-gauge").style.width = (introCpr/15*100) + "%";
  document.getElementById("cpr-count").innerText = introCpr + " / 15";
  const btn = document.getElementById("cprBtn");
  btn.style.transform = "scale(0.88)"; setTimeout(() => btn.style.transform="scale(1)", 100);
  if (introCpr >= 15) { 
    setBPM(40,"normal"); 
    playSnd("success"); 

    // 프롤로그 완료 시 사이렌 소리 정지
    const siren = document.getElementById("sirenAudio");
    if (siren) {
      siren.pause();
    }

    setTimeout(() => startStage1(), 600); 
  }
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

// ── STAGE 4 (순환계 루트 복구 작전) ─────────────────────────────────
let currentTool = null;
let allCorrect = false;
let msgTimeout = null;
let particles = [];
let holdTimer = null;
let timeHeld = 0;
let touchStartTime = 0;

const s4State = {
    'pa': { type: 'vessel', word: '', color: 'gray', ansWord: '폐동맥', ansColor: 'blue' },
    'pv': { type: 'vessel', word: '', color: 'gray', ansWord: '폐정맥', ansColor: 'red' },
    'vc': { type: 'vessel', word: '', color: 'gray', ansWord: '대정맥', ansColor: 'blue' },
    'ao': { type: 'vessel', word: '', color: 'gray', ansWord: '대동맥', ansColor: 'red' },
    'ra': { type: 'chamber', color: 'gray', ansColor: 'blue' },
    'la': { type: 'chamber', color: 'gray', ansColor: 'red' },
    'rv': { type: 'chamber', color: 'gray', ansColor: 'blue' },
    'lv': { type: 'chamber', color: 'red', ansColor: 'red' },
    'arr-lungs-pa': { type: 'arrow', dir: 'none', ansDir: 'up' },   
    'arr-pa': { type: 'arrow', dir: 'none', ansDir: 'up' },         
    'arr-lungs-pv': { type: 'arrow', dir: 'none', ansDir: 'down' }, 
    'arr-pv': { type: 'arrow', dir: 'none', ansDir: 'down' },       
    'arr-ra-rv': { type: 'arrow', dir: 'none', ansDir: 'down' },    
    'arr-la-lv': { type: 'arrow', dir: 'none', ansDir: 'down' },    
    'arr-vc': { type: 'arrow', dir: 'none', ansDir: 'up' },         
    'arr-body-vc': { type: 'arrow', dir: 'none', ansDir: 'up' },    
    'arr-ao': { type: 'arrow', dir: 'none', ansDir: 'down' },       
    'arr-ao-body': { type: 'arrow', dir: 'none', ansDir: 'down' }   
};

let s4Step123Done = false; // 1,2,3 완료 여부

function startStage4(isRetry) {
  updateProgress(5); switchUI("screen-stage4");
  currentStageFunc = function () { startStage4(true); };
  errorCount = 0;
  allCorrect = false;
  currentTool = null;
  timeHeld = 0;
  s4Step123Done = false;

  // 연결 검사 버튼 표시
  const checkBtn = document.getElementById("btn-s4-check");
  if (checkBtn) checkBtn.style.display = "block";

  // 혈액 공급 팝업 닫기
  const bsp = document.getElementById('bloodSupplyPopup');
  if (bsp) {
    bsp.classList.remove('active');
    const s4Video = document.getElementById('s4CirculationVideo');
    if (s4Video) s4Video.pause();
  }
  document.getElementById('screen-stage4').classList.remove('blood-flow-glow');

  particles.forEach(p => { if(p.parentNode) p.parentNode.removeChild(p); });
  particles = [];
  
  for (let key in s4State) {
    if (s4State[key].type === 'vessel') {
      s4State[key].word = '';
      s4State[key].color = 'gray';
      updateVesselUI(key);
    } else if (s4State[key].type === 'chamber') {
      if (key === 'lv') {
        s4State[key].color = 'red';
      } else {
        s4State[key].color = 'gray';
      }
      updateChamberUI(key);
    } else if (s4State[key].type === 'arrow') {
      s4State[key].dir = 'none';
      updateArrowUI(key);
    }
  }
  
  document.getElementById("message").style.opacity = 0;
  document.getElementById("btn-s4-next").style.display = "none";
  document.getElementById("gauge-container").style.display = "none";
  document.getElementById("gauge").style.width = "0%";
  document.getElementById("heart-area").classList.remove("pump-effect");

  // 좌심실은 항상 붉은색, pulse-ready 제거
  document.getElementById("lv").classList.remove("pulse-ready");
  
  const lv = document.getElementById("lv");
  lv.onmousedown = null;
  lv.onmouseup = null;
  lv.onmouseleave = null;
  lv.ontouchstart = null;
  lv.ontouchend = null;
  lv.ontouchcancel = null;
  lv.style.cursor = 'default';
  
  // 지시사항 초기화 (1~3만 표시)
  document.getElementById('s4-instructions').innerHTML =
    '1. 단어를 빈칸에 넣고 눌러 색(동맥혈🔴/정맥혈🔵)을 맞추세요.<br>' +
    '2. 심방과 심실도 눌러 색을 맞추세요.<br>' +
    '3. 원형 화살표 버튼을 눌러 피가 흐르는 방향을 맞추세요.';

  document.querySelectorAll('.tool').forEach(el => el.classList.remove('selected'));
}

// 1,2,3 완료 체크 - vesselClick, chamberClick, arrowClick 마다 호출
function checkS4Step123() {
  if (s4Step123Done || allCorrect) return;
  let done123 = true;
  for (let key in s4State) {
    const s = s4State[key];
    if (s.type === 'vessel' && (s.word !== s.ansWord || s.color !== s.ansColor)) { done123 = false; break; }
    if (s.type === 'chamber' && key !== 'lv' && s.color !== s.ansColor) { done123 = false; break; }
    if (s.type === 'arrow' && s.dir !== s.ansDir) { done123 = false; break; }
  }
  if (done123) {
    s4Step123Done = true;
    activate4thMission();
  }
}

function activate4thMission() {
  document.getElementById('s4-instructions').innerHTML =
    '1. 단어를 빈칸에 넣고 눌러 색(동맥혈🔴/정맥혈🔵)을 맞추세요.<br>' +
    '2. 심방과 심실도 눌러 색을 맞추세요.<br>' +
    '3. 원형 화살표 버튼을 눌러 피가 흐르는 방향을 맞추세요.<br>' +
    '<strong style="color:#ff6b6b;">4. ✅ 좌심실을 2초간 눌러 혈액을 공급하세요!</strong>';
  document.getElementById('gauge-container').style.display = 'block';
  document.getElementById('gauge').style.width = '0%';
  const checkBtn = document.getElementById("btn-s4-check");
  if (checkBtn) checkBtn.style.display = "none";
  const lv = document.getElementById('lv');
  lv.classList.add('pulse-ready');
  lv.style.cursor = 'pointer';
  lv.onmousedown = handleLvStart;
  lv.onmouseup = handleLvEnd;
  lv.onmouseleave = handleLvEnd;
  lv.ontouchstart = handleLvStart;
  lv.ontouchend = handleLvEnd;
  lv.ontouchcancel = handleLvEnd;
  playSnd('success');
  showMessage('✅ 1~3 완료! 이제 좌심실을 2초간 길게 누르세요!', false);
}

function checkS4StageAnswers() {
  if (allCorrect) return;
  if (s4Step123Done) {
    showMessage("✅ 이미 1~3단계 연결이 완료되었습니다! 좌심실을 2초간 누르세요.", false);
    return;
  }
  const wrongKeys = [];
  for (let key in s4State) {
    const s = s4State[key];
    let isCorrect = true;
    if (s.type === 'vessel') {
      if (s.word !== s.ansWord || s.color !== s.ansColor) isCorrect = false;
    } else if (s.type === 'chamber') {
      if (s.color !== s.ansColor) isCorrect = false;
    } else if (s.type === 'arrow') {
      if (s.dir !== s.ansDir) isCorrect = false;
    }
    if (!isCorrect) wrongKeys.push(key);
  }

  if (wrongKeys.length === 0) {
    s4Step123Done = true;
    activate4thMission();
  } else {
    playSnd('fail');
    showMessage("⚠️ " + wrongKeys.length + "개의 연결이 올바르지 않습니다. 다시 확인하세요!", false);
    
    wrongKeys.forEach(key => {
      let el;
      if (s4State[key].type === 'vessel') {
        el = document.getElementById('slot-' + key);
      } else {
        el = document.getElementById(key);
      }
      if (el) {
        el.classList.add('s4-wrong');
        setTimeout(() => {
          el.classList.remove('s4-wrong');
        }, 1500);
      }
    });
  }
}

function closeS4VideoAndGoNext() {
  const s4Video = document.getElementById('s4CirculationVideo');
  if (s4Video) {
    s4Video.pause();
  }
  const popup = document.getElementById('bloodSupplyPopup');
  if (popup) popup.classList.remove('active');
  goStage5();
}

function selectTool(word) {
  if (allCorrect) return;
  currentTool = word;
  document.querySelectorAll('.tool').forEach(el => {
    el.classList.toggle('selected', el.innerText === word);
  });
  playSnd("beep");
}

function vesselClick(id) {
  if (allCorrect) return;
  const s = s4State[id];

  if (currentTool) {
    s.word = currentTool;
    s.color = 'gray'; 
    currentTool = null;
    document.querySelectorAll('.tool').forEach(e => e.classList.remove('selected'));
    playSnd("beep");
  } else if (s.word !== '') {
    playSnd("beep");
    if (s.color === 'gray') s.color = 'red';
    else if (s.color === 'red') s.color = 'blue';
    else s.color = 'gray';
  }
  updateVesselUI(id);
  checkS4Step123();
}

function chamberClick(id) {
  if (allCorrect) return;
  if (id === 'lv') return;
  const s = s4State[id];
  playSnd("beep");
  if (s.color === 'gray') s.color = 'red';
  else if (s.color === 'red') s.color = 'blue';
  else s.color = 'gray';
  
  updateChamberUI(id);
  checkS4Step123();
}

function arrowClick(id) {
  if (allCorrect) return;
  const s = s4State[id];
  playSnd("beep");
  if (s.dir === 'none' || s.dir === 'down') s.dir = 'up';
  else s.dir = 'down';
  
  updateArrowUI(id);
  checkS4Step123();
}

function updateVesselUI(id) {
  const el = document.getElementById('slot-' + id);
  const s = s4State[id];
  if(el) {
    el.innerText = s.word || '빈칸';
    el.className = 'slot ' + (s.word ? 'filled' : 'empty') + ' bg-' + s.color;
  }
}

function updateChamberUI(id) {
  const el = document.getElementById(id);
  const s = s4State[id];
  if(el) {
    el.className = 'chamber bg-' + s.color;
  }
}

function updateArrowUI(id) {
  const el = document.getElementById(id);
  const s = s4State[id];
  if(el) {
    el.className = 'arrow ' + (s.dir !== 'none' ? 'set' : 'empty');
    if (s.dir === 'up') el.innerText = '▲';
    else if (s.dir === 'down') el.innerText = '▼';
    else el.innerText = '↕';
  }
}

function showMessage(text, persist) {
  const msg = document.getElementById('message');
  if (msg) {
    clearTimeout(msgTimeout);
    msg.innerHTML = text;
    msg.style.opacity = 1;
    if (!persist) {
      msgTimeout = setTimeout(() => { msg.style.opacity = 0; }, 2000);
    }
  }
}

function isPuzzleCorrect() {
  let correct = true;
  for (let key in s4State) {
    const s = s4State[key];
    if (s.type === 'vessel' && (s.word !== s.ansWord || s.color !== s.ansColor)) correct = false;
    if (s.type === 'chamber' && s.color !== s.ansColor) correct = false;
    if (s.type === 'arrow' && s.dir !== s.ansDir) correct = false;
  }
  return correct;
}

function showFailPopup() {
  const popup = document.createElement('div');
  popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;display:flex;justify-content:center;align-items:center;background:rgba(0,0,0,0.6);';
  popup.innerHTML = '<div style="background:linear-gradient(135deg,rgba(139,0,0,0.9),rgba(80,0,0,0.95));border:2px solid #ff3b30;border-radius:18px;padding:28px 24px;text-align:center;max-width:80%;animation:popupFadeIn 0.3s ease-out;">' +
    '<div style="font-size:2.2rem;margin-bottom:10px;">&#128683;</div>' +
    '<div style="font-size:1.4rem;font-weight:700;color:#ff6b6b;margin-bottom:8px;">혈액공급 실패!</div>' +
    '<div style="font-size:.85rem;color:#ffcccc;line-height:1.7;margin-bottom:16px;">심방·심실 색깔, 혈관 단어,<br>화살표 방향을 다시 확인하세요.</div>' +
    '<button onclick="this.parentNode.parentNode.remove()" style="padding:10px 26px;background:var(--alert-red);color:white;border:none;border-radius:10px;font-size:.95rem;font-weight:700;cursor:pointer;">&#128260; 다시 도전</button>' +
    '</div>';
  document.body.appendChild(popup);
}

function handleLvStart(e) {
  if (allCorrect) return;
  if (e.type === 'touchstart') e.preventDefault();
  touchStartTime = Date.now();

  document.getElementById('lv').style.transform = "scale(0.95)";
  timeHeld = 0;
  document.getElementById('gauge').style.width = "0%";
  holdTimer = setInterval(() => {
    timeHeld += 50;
    document.getElementById('gauge').style.width = (timeHeld / 2000 * 100) + "%";
    if (timeHeld >= 2000) {
      clearInterval(holdTimer);
      holdTimer = null;
      if (isPuzzleCorrect()) {
        allCorrect = true;
        handleLvEnd();
        successPumping();
      } else {
        handleLvEnd();
        playSnd("fail");
        showFailPopup();
      }
    }
  }, 50);
}

function handleLvEnd(e) {
  const lv = document.getElementById('lv');
  if(lv) lv.style.transform = "scale(1)";
  if (holdTimer) {
    clearInterval(holdTimer);
    holdTimer = null;
  }
  if (!allCorrect) {
    timeHeld = 0;
    document.getElementById('gauge').style.width = "0%";
  }
}

function successPumping() {
  showMessage("💥 펌핑 성공! 혈액이 힘차게 순환합니다!", true);
  document.getElementById('gauge-container').style.display = "none";
  document.getElementById('lv').classList.remove('pulse-ready');
  document.getElementById('heart-area').classList.add('pump-effect');

  // 화면 테두리 글로우 효과
  document.getElementById('screen-stage4').classList.add('blood-flow-glow');

  // 혈액 공급 시작 팝업
  const popup = document.getElementById('bloodSupplyPopup');
  if (popup) {
    popup.classList.add('active');
    const s4Video = document.getElementById('s4CirculationVideo');
    if (s4Video) {
      s4Video.currentTime = 0;
      s4Video.play().catch(e => {
        console.log("Video autoplay blocked, waiting for user click.", e);
      });
      s4Video.onended = () => {
        closeS4VideoAndGoNext();
      };
    }
  }

  startBloodFlow();

  setTimeout(() => {
    playSnd("success");
    document.getElementById("btn-s4-next").style.display = "block";
    showMessage("🎉 순환계 복구 완료! 다음 구역으로 출발하세요!", true);
  }, 4500);
}

function startBloodFlow() {
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      spawnBloodParticle('red');
      spawnBloodParticle('blue');
    }, i * 600);
  }
}

function spawnBloodParticle(type) {
  const board = document.getElementById('board');
  if(!board) return;
  const particle = document.createElement('div');
  particle.className = 'blood-particle ' + type;
  board.appendChild(particle);
  particles.push(particle);

  const pathIds = type === 'red'
    ? ['lungs', 'arr-lungs-pv', 'slot-pv', 'arr-pv', 'la', 'arr-la-lv', 'lv', 'arr-ao', 'slot-ao', 'arr-ao-body', 'body-cells']
    : ['body-cells', 'arr-body-vc', 'slot-vc', 'arr-vc', 'ra', 'arr-ra-rv', 'rv', 'arr-pa', 'slot-pa', 'arr-lungs-pa', 'lungs'];

  const keyframes = [];
  let validPath = true;
  for (let i = 0; i < pathIds.length; i++) {
    const el = document.getElementById(pathIds[i]);
    if (!el) { validPath = false; break; }
    const rect = el.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    const x = rect.left - boardRect.left + rect.width / 2;
    const y = rect.top - boardRect.top + rect.height / 2;
    keyframes.push({
      transform: 'translate(' + x + 'px, ' + y + 'px)',
      opacity: (i === 0 || i === pathIds.length - 1) ? 0 : 1
    });
  }

  if (validPath) {
    particle.animate(keyframes, {
      duration: 4500,
      iterations: Infinity,
      easing: 'linear'
    });
  }
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
  // 학습을 위해 색깔을 동일하게 중립적인 블루톤으로 통일!
  el.style.background = "linear-gradient(135deg, rgba(58, 134, 255, 0.85), rgba(34, 102, 221, 0.9))";
  el.style.color = "white"; el.style.top="-35px"; el.style.left=(Math.random()*72+4)+"%";
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
  cbTaps=0; document.getElementById("cb-gauge").style.width="0%"; document.getElementById("cb-count").innerText="0 / 10";
  const btn=document.getElementById("cbBtn");
  btn.style.marginLeft="0%"; btn.style.transition="none";
  btn.style.pointerEvents="auto";
  currentStageFunc=restartFunc;
}
function doCodeBlueCPR() {
  if (cbTaps >= 10) return;
  cbTaps++; playSnd("beep");
  document.getElementById("cb-gauge").style.width=(cbTaps/10*100)+"%"; document.getElementById("cb-count").innerText=cbTaps+" / 10";
  const btn=document.getElementById("cbBtn"); btn.style.transform="scale(0.88)"; setTimeout(()=>btn.style.transform="scale(1)",80);
  if(cbTaps>=10){
    btn.style.pointerEvents="none";
    playSnd("success");
    // 시간차 없이 즉시 홀드온 UI 노출!
    document.getElementById("cb-tap-ui").style.display="none";
    document.getElementById("cb-hold-ui").style.display="block";
    document.getElementById("cbHoldBtn").style.display="flex";
    initHoldCPR();
  }
}
function initHoldCPR() {
  const btn=document.getElementById("cbHoldBtn");
  btn.innerText = "HOLD 5s";
  if (cbHoldTm) { clearInterval(cbHoldTm); cbHoldTm = null; }
  btn.onpointerdown=(e)=>{
    e.preventDefault();
    playSnd("beep");
    let timeLeft=5;
    btn.innerText=timeLeft+"s";
    cbHoldTm=setInterval(()=>{
      timeLeft--;
      btn.innerText=timeLeft+"s";
      playSnd("beep");
      if(timeLeft<=0){
        clearInterval(cbHoldTm);
        cbHoldTm=null;
        reviveCodeBlue();
      }
    },1000);
  };
  btn.onpointerup=btn.onpointerleave=()=>{
    if(cbHoldTm){
      clearInterval(cbHoldTm);
      cbHoldTm=null;
      btn.innerText="HOLD 5s";
      playSnd("fail");
      updateScore(-5); // 홀드 실패 시 벌칙 감점 소량 부여
      alert("압박 실패! 손을 떼면 안 됩니다. 다시 시도해 주세요.");
      initHoldCPR(); // 홀드온 5초 다시 시도 가능하게 만듦
    }
  };
}
function reviveCodeBlue() {
  toggleSiren(false); playSnd("success"); updateScore(-10); errorCount = 0;
  document.getElementById("cb-panel").classList.remove("active");
  alert("심장박동 극적 회복! 현재 구역부터 재시도합니다.");
  if (currentStageFunc) currentStageFunc();
}
