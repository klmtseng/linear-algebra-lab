/* 線代實驗室 LA Lab — 零依賴 Canvas 互動線性代數
   8 關對應 JOHNSON-MATH 線性代數 EP1–EP3 */
"use strict";

/* ---------- 向量 / 矩陣工具 ---------- */
const V = (x, y) => ({ x, y });
const add = (a, b) => V(a.x + b.x, a.y + b.y);
const sub = (a, b) => V(a.x - b.x, a.y - b.y);
const scl = (a, k) => V(a.x * k, a.y * k);
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const len = (a) => Math.hypot(a.x, a.y);
// 矩陣以「兩個 column(基向量新家)」表示:M = { i:{x,y}, j:{x,y} }
const M = (i, j) => ({ i: { ...i }, j: { ...j } });
const MI = () => M(V(1, 0), V(0, 1));
const applyM = (m, v) => V(m.i.x * v.x + m.j.x * v.y, m.i.y * v.x + m.j.y * v.y);
const mulM = (b, a) => M(applyM(b, a.i), applyM(b, a.j)); // 先 a 後 b = b·a
const detM = (m) => m.i.x * m.j.y - m.j.x * m.i.y;
const lerp = (p, q, t) => p + (q - p) * t;
const lerpM = (a, b, t) => M(V(lerp(a.i.x, b.i.x, t), lerp(a.i.y, b.i.y, t)),
                             V(lerp(a.j.x, b.j.x, t), lerp(a.j.y, b.j.y, t)));
const ease = (t) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const fmt = (n) => (Math.abs(n) < 0.005 ? 0 : n).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");

/* ---------- 畫布 ---------- */
const canvas = document.getElementById("board");
const g = canvas.getContext("2d");
const CX = canvas.width / 2, CY = canvas.height / 2;
const cam = { scale: 62, x: 0, y: 0 }; // 世界點 (x,y) 顯示在畫布中心,scale = px/單位
const camReset = () => { cam.scale = 62; cam.x = 0; cam.y = 0; };
const toScr = (v) => V(CX + (v.x - cam.x) * cam.scale, CY - (v.y - cam.y) * cam.scale);
const fromScr = (px, py) => V(cam.x + (px - CX) / cam.scale, cam.y - (py - CY) / cam.scale);

const COL = {
  gridFaint: "#1a2136", grid: "#2e3a63", axis: "#55648f",
  iHat: "#ff5c7a", jHat: "#4ade80", vec: "#ffd166",
  extra: "#a78bfa", blue: "#38bdf8", star: "#ffd166",
  posArea: "rgba(56,189,248,.22)", negArea: "rgba(251,146,60,.28)",
  span: "rgba(255,209,102,.10)", gold: "#fbbf24",
};

// 主題:只切換「背景/格線/文字」這些會在淺底失效的顏色;彩色箭頭兩色皆可讀
const THEMES = {
  dark:  { bg: "#0a0e1a", grid: "#2e3a63", gridFaint: "#1a2136", axis: "#55648f", text: "#e8ecf8", dim: "#9aa5c4", demoGrid: "#212a4b", demoAxis: "#39456e", panel: "#0f1424" },
  light: { bg: "#f4f6fc", grid: "#c4cee6", gridFaint: "#e3e8f3", axis: "#8b98ba", text: "#1b2138", dim: "#5c688a", demoGrid: "#dfe5f2", demoAxis: "#b8c2dc", panel: "#eaeef8" },
};
let themeName = localStorage.getItem("lalab-theme") || "dark";
let TH = THEMES[themeName];
function applyTheme(name) {
  themeName = name; TH = THEMES[name];
  localStorage.setItem("lalab-theme", name);
  document.body.classList.toggle("light", name === "light");
  // 同步機率模組調色盤的「文字/座標軸」到主題(彩色資料色不動)
  if (typeof PC !== "undefined") { PC.ink = TH.text; PC.dim = TH.dim; PC.axis = TH.axis; PC.grid = TH.gridFaint; }
}

function clear() { g.fillStyle = TH.bg; g.fillRect(0, 0, canvas.width, canvas.height); }

function drawGrid(m, opt = {}) {
  const N = 9;
  if (opt.original !== false) { // 原始格線(淡)
    g.strokeStyle = TH.gridFaint; g.lineWidth = 1;
    g.beginPath();
    for (let k = -N; k <= N; k++) {
      let a = toScr(V(k, -N)), b = toScr(V(k, N));
      g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
      a = toScr(V(-N, k)); b = toScr(V(N, k));
      g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
    }
    g.stroke();
  }
  // 變換後格線(示範播放時降淡,聚焦主角)
  for (let k = -N; k <= N; k++) {
    const isAxis = k === 0;
    g.strokeStyle = isAxis ? (player.active ? TH.demoAxis : TH.axis)
                           : (player.active ? TH.demoGrid : TH.grid);
    g.lineWidth = isAxis ? 2 : 1.2;
    g.beginPath();
    let a = toScr(applyM(m, V(k, -N))), b = toScr(applyM(m, V(k, N)));
    g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
    a = toScr(applyM(m, V(-N, k))); b = toScr(applyM(m, V(N, k)));
    g.moveTo(a.x, a.y); g.lineTo(b.x, b.y);
    g.stroke();
  }
}

function drawArrow(from, to, color, w = 3, label = "") {
  const a = toScr(from), b = toScr(to);
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
  if (L < 2) return;
  const ux = dx / L, uy = dy / L, head = Math.min(14, L * 0.4);
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = w;
  g.beginPath();
  g.moveTo(a.x, a.y); g.lineTo(b.x - ux * head * 0.7, b.y - uy * head * 0.7);
  g.stroke();
  g.beginPath();
  g.moveTo(b.x, b.y);
  g.lineTo(b.x - ux * head - uy * head * 0.45, b.y - uy * head + ux * head * 0.45);
  g.lineTo(b.x - ux * head + uy * head * 0.45, b.y - uy * head - ux * head * 0.45);
  g.closePath(); g.fill();
  if (label) {
    g.font = "bold 17px 'Cambria Math', serif";
    g.fillText(label, b.x + ux * 14 - 5 + uy * 10, b.y + uy * 14 + ux * -10 + 6);
  }
}

function drawDash(from, to, color) {
  const a = toScr(from), b = toScr(to);
  g.strokeStyle = color; g.lineWidth = 1.5; g.setLineDash([5, 5]);
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  g.setLineDash([]);
}

function drawDot(p, color, r = 6) {
  const s = toScr(p);
  g.fillStyle = color;
  g.beginPath(); g.arc(s.x, s.y, r, 0, 7); g.fill();
}

function drawStar(p, color) {
  const s = toScr(p), R = 11, r = 4.5;
  g.fillStyle = color; g.beginPath();
  for (let k = 0; k < 10; k++) {
    const rad = k % 2 ? r : R, th = -Math.PI / 2 + k * Math.PI / 5;
    g[k ? "lineTo" : "moveTo"](s.x + rad * Math.cos(th), s.y + rad * Math.sin(th));
  }
  g.closePath(); g.fill();
}

function fillQuad(pts, color) {
  g.fillStyle = color; g.beginPath();
  pts.forEach((p, k) => { const s = toScr(p); g[k ? "lineTo" : "moveTo"](s.x, s.y); });
  g.closePath(); g.fill();
}

function labelAt(p, text, color, dx = 10, dy = -10) {
  const s = toScr(p);
  g.fillStyle = color; g.font = "bold 16px 'Cambria Math', serif";
  g.fillText(text, s.x + dx, s.y + dy);
}

/* ---------- 進度 ---------- */
const PKEY = "lalab-progress-v1";
let progress = {};
try { progress = JSON.parse(localStorage.getItem(PKEY) || "{}"); } catch (e) {}
function markGoal(id) {
  if (player.active) return; // 示範不代打過關
  if (progress[id]) return;
  progress[id] = true;
  localStorage.setItem(PKEY, JSON.stringify(progress));
  renderGoals(); renderTabs(); renderSubjects(); renderOverall(); updateCert();
}

/* ---------- 矩陣動畫 ---------- */
let anim = null; // {from,to,t0,dur,cur}
function animateTo(target, dur = 900) {
  anim = { from: anim ? anim.cur : MI(), to: target, t0: performance.now(), dur, cur: anim ? anim.cur : MI() };
}
function setMatrixNow(m) { anim = { from: m, to: m, t0: 0, dur: 1, cur: m }; }
function curMatrix() {
  if (!anim) return MI();
  const t = Math.min(1, (performance.now() - anim.t0) / anim.dur);
  anim.cur = lerpM(anim.from, anim.to, ease(t));
  return anim.cur;
}

/* ---------- 拖曳 ---------- */
let dragTarget = null;
function canvasPos(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: (ev.clientX - r.left) * canvas.width / r.width, y: (ev.clientY - r.top) * canvas.height / r.height };
}
canvas.addEventListener("pointerdown", (ev) => {
  if (player.active) { player.stop(); return; } // 示範中點一下 = 跳過、接手
  const p = canvasPos(ev);
  const dl = cur().draggables ? cur().draggables() : [];
  let best = null, bestD = 30;
  for (const d of dl) {
    const s = d.getScreen ? d.getScreen() : toScr(d.get());
    const dist = Math.hypot(s.x - p.x, s.y - p.y);
    if (dist < bestD) { bestD = dist; best = d; }
  }
  if (best) { dragTarget = best; canvas.setPointerCapture(ev.pointerId); }
});
canvas.addEventListener("pointermove", (ev) => {
  if (!dragTarget) return;
  const p = canvasPos(ev);
  if (dragTarget.setScreen) { // 螢幕座標拖曳(概率模組的門檻線等)
    dragTarget.setScreen(p.x, p.y);
    cur().onChange && cur().onChange();
    return;
  }
  let w = fromScr(p.x, p.y);
  w.x = Math.max(-5.2, Math.min(5.2, w.x));
  w.y = Math.max(-5.2, Math.min(5.2, w.y));
  // 靠近 0.5 格點就吸附,方便精準命中
  const snap = (n) => { const r = Math.round(n * 2) / 2; return Math.abs(n - r) < 0.11 ? r : n; };
  w.x = snap(w.x); w.y = snap(w.y);
  dragTarget.set(w);
  cur().onChange && cur().onChange();
});
window.addEventListener("pointerup", () => { dragTarget = null; });

/* ---------- 示範播放器 ----------
   步驟格式(皆可省略):{ cap 字幕, dur 毫秒,
     vec/vec2:[get,set,目標] 向量補間, num:[get,set,目標] 數字補間,
     cam:{scale,x,y}|"reset" 相機補間, mat:目標矩陣, call:開步時執行 } */
const captionEl = document.getElementById("caption");
const demoBtnEl = document.getElementById("demo-btn");
let demoSeen = {};
try { demoSeen = JSON.parse(localStorage.getItem("lalab-demoseen") || "{}"); } catch (e) {}

// 旁白語音(預錄 mp3,單一 Audio 元素重用對 iOS 較友善)
let voiceOn = localStorage.getItem("lalab-voice") === "1";
let voiceAudio = null;
function getAudioEl() { if (!voiceAudio) voiceAudio = new Audio(); return voiceAudio; }
function stopVoice() { if (voiceAudio) { voiceAudio.pause(); voiceAudio.onended = voiceAudio.onerror = null; } }

const player = {
  active: false, steps: [], idx: -1, t0: 0, dur: 0, apply: null, _hideT: 0, clipWaiting: false,
  start(steps) {
    if (!steps || !steps.length) return;
    this.steps = steps; this.idx = -1; this.active = true;
    clearTimeout(this._hideT);
    demoBtnEl.textContent = "⏭ 跳過示範";
    this.next();
  },
  next() {
    this.idx++;
    if (this.idx >= this.steps.length) return this.stop();
    const st = this.steps[this.idx];
    this.dur = st.dur || 1400;
    this.t0 = performance.now();
    const fns = [];
    for (const key of ["vec", "vec2"]) {
      if (!st[key]) continue;
      const [get, set, to] = st[key], from = { ...get() };
      fns.push((t) => set(V(lerp(from.x, to.x, t), lerp(from.y, to.y, t))));
    }
    for (const key of ["num", "num2"]) {
      if (!st[key]) continue;
      const [get, set, to] = st[key], from = get();
      fns.push((t) => set(lerp(from, to, t)));
    }
    if (st.cam) {
      const to = st.cam === "reset" ? { scale: 62, x: 0, y: 0 } : st.cam;
      const from = { ...cam };
      fns.push((t) => {
        if (to.scale != null) cam.scale = lerp(from.scale, to.scale, t);
        if (to.x != null) cam.x = lerp(from.x, to.x, t);
        if (to.y != null) cam.y = lerp(from.y, to.y, t);
      });
    }
    if (st.mat) animateTo(st.mat, this.dur);
    if (st.call) st.call();
    this.apply = fns.length ? (t) => fns.forEach((f) => f(t)) : null;
    if (st.cap != null) { captionEl.textContent = st.cap; captionEl.classList.add("show"); }
    this.playClip(st);
  },
  playClip(st) {
    this.clipWaiting = false;
    if (!voiceOn || st.cap == null) return;
    const a = getAudioEl();
    a.src = `audio/${cur().id}_${this.idx}.mp3`;
    this.clipWaiting = true;
    const done = () => { this.clipWaiting = false; };
    a.onended = done; a.onerror = done;
    try { a.currentTime = 0; } catch (e) {}
    const pr = a.play();
    if (pr && pr.catch) pr.catch(done); // 自動播放被擋(無使用者手勢)→ 靜音續播
  },
  update() {
    if (!this.active) return;
    const t = Math.min(1, (performance.now() - this.t0) / this.dur);
    this.apply && this.apply(ease(t));
    cur()._sync && cur()._sync();
    // 動畫跑完後,若語音還沒唸完就等它(上限 dur+15s 防卡)
    if (t >= 1 && (!this.clipWaiting || performance.now() - this.t0 > this.dur + 15000)) this.next();
  },
  cancel() {
    this.active = false; this.apply = null; this.clipWaiting = false;
    stopVoice();
    clearTimeout(this._hideT);
    captionEl.classList.remove("show");
    demoBtnEl.textContent = "▶ 看示範";
    camReset();
  },
  stop() { // 示範結束/跳過:回到起始狀態,交還控制
    this.cancel();
    const lv = cur();
    lv.enter && lv.enter();
    lv._sync && lv._sync();
    captionEl.textContent = "換你操作了 👆 完成任務清單";
    captionEl.classList.add("show");
    this._hideT = setTimeout(() => captionEl.classList.remove("show"), 2800);
  },
};

/* ---------- 關卡定義 ---------- */
const EP = {
  1: ["EP1 基向量與張成空間 ▶", "https://www.youtube.com/watch?v=ZvDpkXAvWGk"],
  2: ["EP2 行列式與矩陣秩 ▶", "https://www.youtube.com/watch?v=9gRzBcHhYXw"],
  3: ["EP3 特徵值與內積投影 ▶", "https://www.youtube.com/watch?v=Ddw4H_pT_AM"],
  // 概率系列
  P1: ["概率EP04 連續變數與機率密度 ▶", "https://www.youtube.com/watch?v=dGWDybzB8y8"],
  P2: ["概率EP05 正態分佈 ▶", "https://www.youtube.com/watch?v=x_pJlGB0S5c"],
  P3: ["概率EP06 健檢陽性的盲點 ▶", "https://www.youtube.com/watch?v=tFUBBCfnjs8"],
  P4: ["概率EP07 貝氏定理動態修正 ▶", "https://www.youtube.com/watch?v=TKvSIo8kKBg"],
  P5: ["概率EP02 隨機變數如何量化 ▶", "https://www.youtube.com/watch?v=QlKIuWLcdJ8"],
  P6: ["統計推論 大數法則 ▶", "https://www.youtube.com/watch?v=Zz_2gT2RHKU"],
  P7: ["統計推論 中心極限定理 ▶", "https://www.youtube.com/watch?v=Zz_2gT2RHKU"],
  P8: ["概率EP01 機率的本質 ▶", "https://www.youtube.com/watch?v=DKx6p4__gkQ"],
  P9: ["概率EP06 條件機率 ▶", "https://www.youtube.com/watch?v=tFUBBCfnjs8"],
  // 微積分系列
  C1: ["微積分EP1 極限與夾擠 ▶", "https://www.youtube.com/watch?v=hjEMERJlhXQ"],
  C2: ["微積分EP2 微分:瞬間斜率 ▶", "https://www.youtube.com/watch?v=VIVYtZPUGGM"],
  C3: ["微積分EP2 積分:總帳面積 ▶", "https://www.youtube.com/watch?v=VIVYtZPUGGM"],
  C4: ["微積分EP3 基本定理 ▶", "https://www.youtube.com/watch?v=vqzEcFxNN_U"],
};
const readout = document.getElementById("readout");

const LA_LEVELS = [

/* ─── 關 1:向量 = 基向量的組合 ─── */
{
  id: "L1", short: "向量=配方", title: "關 1|向量其實是一張「配方」", ep: 1,
  intro: `<p>畫面上的黃色向量 <span class="hl">v</span>,其實是兩個基向量的<b>調配結果</b>:先沿 <span class="ih">î</span> 走幾步、再沿 <span class="jh">ĵ</span> 走幾步。座標 (x, y) 不是「位置」,是<b>配方</b>。</p><p>拖動黃色箭頭端點,看虛線怎麼把它拆回 <span class="ih">î</span> 和 <span class="jh">ĵ</span> 的份量。</p>`,
  formal: `<p class="math">設 î=(1,0), ĵ=(0,1)。任意向量 v=(x,y) 可唯一表示為 v = x·î + y·ĵ,稱 x、y 為 v 在標準基底下的座標。</p>`,
  goals: [{ id: "L1-hit", text: "把 v 調成 3·î + 2·ĵ(拖到 (3,2))" }],
  state: { v: V(1.5, 1) },
  enter() { this.state.v = V(1.5, 1); setMatrixNow(MI()); },
  demo() { const s = this.state; return [
    { cap: "這根黃色箭頭 v,目前的配方:1.5 份 î + 1 份 ĵ", dur: 2400 },
    { cam: { scale: 95, x: 1.6, y: 1 }, cap: "虛線就是配方:先沿紅色 î 走,再沿綠色 ĵ 走", dur: 2200 },
    { vec: [() => s.v, (w) => s.v = w, V(3, 2)], cap: "現在把 v 拖去 (3, 2)……", dur: 2000 },
    { cap: "配方變成 3 份 î + 2 份 ĵ——座標就是配方", dur: 2200 },
    { cam: "reset", vec: [() => s.v, (w) => s.v = w, V(1.5, 1)], cap: "換你親手拖一次!", dur: 1400 },
  ]; },
  draggables() { const s = this.state; return [{ get: () => s.v, set: (w) => { s.v = w; } }]; },
  draw() {
    const v = this.state.v;
    drawGrid(MI(), { original: false });
    drawDash(V(0, 0), V(v.x, 0), COL.iHat);
    drawDash(V(v.x, 0), v, COL.jHat);
    drawArrow(V(0, 0), V(1, 0), COL.iHat, 3, "î");
    drawArrow(V(0, 0), V(0, 1), COL.jHat, 3, "ĵ");
    drawStar(V(3, 2), COL.star);
    drawArrow(V(0, 0), v, COL.vec, 4, "v");
    readout.innerHTML = `v = <b>${fmt(v.x)}</b>·î + <b>${fmt(v.y)}</b>·ĵ = (${fmt(v.x)}, ${fmt(v.y)})`;
    if (Math.abs(v.x - 3) < 0.15 && Math.abs(v.y - 2) < 0.15) markGoal("L1-hit");
  },
},

/* ─── 關 2:基向量搬家,全世界跟著搬 ─── */
{
  id: "L2", short: "基向量搬家", title: "關 2|基向量搬家,全世界跟著搬", ep: 1,
  intro: `<p>現在換成拖 <span class="ih">î</span> 和 <span class="jh">ĵ</span> 本人。黃點 p 的配方固定是 <b>2·î + 1·ĵ</b>——但配方裡的原料搬家了,成品就跟著跑,整片格線也一起變形。</p><p><b>任務:</b>把基向量搬到適當位置,讓黃點 p 降落在星星上。這就是「線性變換」:動的是基底,萬物跟著動。</p>`,
  formal: `<p class="math">線性變換 T 由基向量的去向完全決定:T(x·î + y·ĵ) = x·T(î) + y·T(ĵ)。格線保持平行且等距、原點不動,是線性的幾何特徵。</p>`,
  goals: [{ id: "L2-hit", text: "讓 p = 2î + ĵ 降落在星星 (1,3) 上" }],
  state: { i: V(1, 0), j: V(0, 1) },
  enter() { this.state.i = V(1, 0); this.state.j = V(0, 1); },
  demo() { const s = this.state; return [
    { cap: "黃點 p 的配方鎖死:2 份 î + 1 份 ĵ", dur: 2200 },
    { vec: [() => s.i, (w) => s.i = w, V(1, 0.5)], cap: "搬動 î——整片格線跟著變形", dur: 2000 },
    { vec: [() => s.j, (w) => s.j = w, V(-0.5, 1)], cap: "搬動 ĵ——p 被格線載著走", dur: 2000 },
    { cam: { scale: 95, x: 1.5, y: 2 }, cap: "p 永遠停在「2 格新 î + 1 格新 ĵ」的交會點", dur: 2400 },
    { cam: "reset", cap: "你的任務:把 p 載到星星上", dur: 1600 },
  ]; },
  draggables() {
    const s = this.state;
    return [{ get: () => s.i, set: (w) => { s.i = w; } }, { get: () => s.j, set: (w) => { s.j = w; } }];
  },
  draw() {
    const s = this.state, m = M(s.i, s.j);
    drawGrid(m);
    drawStar(V(1, 3), COL.star);
    const p = applyM(m, V(2, 1));
    drawArrow(V(0, 0), s.i, COL.iHat, 3.5, "î");
    drawArrow(V(0, 0), s.j, COL.jHat, 3.5, "ĵ");
    drawDot(p, COL.vec, 7);
    labelAt(p, "p", COL.vec);
    readout.innerHTML = `p = 2·î + 1·ĵ = (<b>${fmt(p.x)}</b>, <b>${fmt(p.y)}</b>)　目標 (1, 3)`;
    if (Math.hypot(p.x - 1, p.y - 3) < 0.25) markGoal("L2-hit");
  },
},

/* ─── 關 3:張成空間 ─── */
{
  id: "L3", short: "張成空間", title: "關 3|兩個向量能「張」出多大的地盤?", ep: 1,
  intro: `<p>拿兩個向量 <span class="hl">v</span>、<span style="color:var(--extra)"><b>w</b></span>,所有「a 份 v + b 份 w」能到達的點,就是它們的<b>張成空間 (span)</b>。淡黃色區域是 a、b 在 ±4 內掃出的範圍——只要不共線,放大係數就能鋪滿整個平面。</p><p>用滑桿調 a、b 命中星星;再把 w 拖到跟 v <b>同一條線上</b>,看地盤瞬間塌成一條線。</p>`,
  formal: `<p class="math">span{v, w} = { a·v + b·w : a, b ∈ ℝ }。v、w 線性獨立 ⇔ span 為整個 ℝ²;線性相依(共線)⇔ span 退化為一條直線(或一點)。</p>`,
  goals: [
    { id: "L3-hit", text: "調 a、b 讓組合點命中星星 (2,3)" },
    { id: "L3-collapse", text: "把 w 拖到與 v 共線,讓 span 塌成一條線" },
  ],
  state: { v: V(2, 1), w: V(-1, 1), a: 1, b: 1 },
  enter() { Object.assign(this.state, { v: V(2, 1), w: V(-1, 1), a: 1, b: 1 }); },
  demo() { const s = this.state; return [
    { cap: "淡黃色區域:v 和 w 一切組合能踩到的地盤", dur: 2400 },
    { num: [() => s.a, (x) => { s.a = x; }, 2], cap: "調 a——沿 v 方向走 2 份", dur: 1600 },
    { num: [() => s.b, (x) => { s.b = x; }, 1.5], cap: "調 b——再沿 w 走 1.5 份,白點就是組合結果", dur: 1800 },
    { vec: [() => s.w, (w) => s.w = w, V(1, 0.5)], cap: "現在把 w 拖到跟 v 同一條線上……", dur: 2200 },
    { cap: "整個地盤塌成一條線!這就是「線性相依」", dur: 2400 },
    { vec: [() => s.w, (w) => s.w = w, V(-1, 1)], cap: "換你:先命中星星,再親手塌一次", dur: 1600 },
  ]; },
  controls(el) {
    const s = this.state;
    el.innerHTML = `
      <div class="row"><label>a</label><input type="range" id="sa" min="-3" max="3" step="0.05" value="1"><span class="val" id="va">1</span></div>
      <div class="row"><label>b</label><input type="range" id="sb" min="-3" max="3" step="0.05" value="1"><span class="val" id="vb">1</span></div>`;
    el.querySelector("#sa").oninput = (e) => { s.a = +e.target.value; el.querySelector("#va").textContent = fmt(s.a); };
    el.querySelector("#sb").oninput = (e) => { s.b = +e.target.value; el.querySelector("#vb").textContent = fmt(s.b); };
    this._sync = () => { // 示範補間時讓滑桿跟著動
      el.querySelector("#sa").value = s.a; el.querySelector("#va").textContent = fmt(s.a);
      el.querySelector("#sb").value = s.b; el.querySelector("#vb").textContent = fmt(s.b);
    };
  },
  draggables() {
    const s = this.state;
    return [{ get: () => s.v, set: (w) => { s.v = w; } }, { get: () => s.w, set: (w) => { s.w = w; } }];
  },
  draw() {
    const s = this.state;
    drawGrid(MI(), { original: false });
    const collinear = Math.abs(cross(s.v, s.w)) < 0.05 * Math.max(0.4, len(s.v) * len(s.w));
    if (collinear) {
      const d = len(s.v) > len(s.w) ? s.v : s.w, L = 9 / Math.max(0.2, len(d));
      g.strokeStyle = COL.gold; g.lineWidth = 5; g.globalAlpha = 0.5;
      const a = toScr(scl(d, -L)), b = toScr(scl(d, L));
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      g.globalAlpha = 1;
      if (len(s.v) > 0.3 && len(s.w) > 0.3) markGoal("L3-collapse");
    } else {
      const c = [add(scl(s.v, 4), scl(s.w, 4)), add(scl(s.v, 4), scl(s.w, -4)),
                 add(scl(s.v, -4), scl(s.w, -4)), add(scl(s.v, -4), scl(s.w, 4))];
      fillQuad(c, COL.span);
    }
    drawStar(V(2, 3), COL.star);
    const av = scl(s.v, s.a), P = add(av, scl(s.w, s.b));
    drawDash(V(0, 0), av, COL.vec);
    drawDash(av, P, COL.extra);
    drawArrow(V(0, 0), s.v, COL.vec, 3.5, "v");
    drawArrow(V(0, 0), s.w, COL.extra, 3.5, "w");
    drawDot(P, "#fff", 6);
    readout.innerHTML = `${fmt(s.a)}·v + ${fmt(s.b)}·w = (<b>${fmt(P.x)}</b>, <b>${fmt(P.y)}</b>)　${collinear ? "<b>span 塌成一條線!</b>" : "目標 (2, 3)"}`;
    if (!collinear && Math.hypot(P.x - 2, P.y - 3) < 0.2) markGoal("L3-hit");
  },
},

/* ─── 關 4:矩陣 = 空間的變形指令 ─── */
{
  id: "L4", short: "矩陣=變形", title: "關 4|矩陣就是一道「變形指令」", ep: 2,
  intro: `<p>2×2 矩陣的<b>第一行(column)是 î 的新家,第二行是 ĵ 的新家</b>。整個矩陣唸出來就是:「把空間這樣掰」。</p><p>按四個預設指令,看畫面上的 <span class="hl">F</span> 怎麼被旋轉、剪切、縮放、鏡射;也可以自己填數字按「套用」。</p>`,
  formal: `<p class="math">矩陣 A = [T(î) | T(ĵ)] 完全編碼線性變換 T。A·(x,y)ᵀ = x·T(î) + y·T(ĵ),矩陣乘向量就是「查基向量的新家再組合」。</p>`,
  goals: [{ id: "L4-all", text: "四種預設變換(旋轉/剪切/縮放/鏡射)都試過一遍" }],
  state: { tried: {} },
  enter() { this.state.tried = {}; setMatrixNow(MI()); },
  demo() { return [
    { cap: "矩陣 = 變形指令:兩個 column 就是 î、ĵ 的新家", dur: 2400 },
    { mat: M(V(0, 1), V(-1, 0)), cap: "旋轉 90°:î → (0,1),ĵ → (−1,0)", dur: 1800 },
    { dur: 900 },
    { mat: MI(), dur: 900 },
    { mat: M(V(1, 0), V(1, 1)), cap: "剪切:î 不動,只推歪 ĵ——看 F 被掰", dur: 1800 },
    { cam: { scale: 100, x: 1.2, y: 1.5 }, cap: "拉近看:格線仍平行等距,這就是「線性」", dur: 2200 },
    { cam: "reset", mat: MI(), cap: "四個預設按鈕都按按看", dur: 1400 },
  ]; },
  controls(el) {
    const s = this.state;
    el.innerHTML = `
      <div class="row">
        <div class="matrix-grid">
          <input type="number" id="ma" value="0" step="0.5"><input type="number" id="mc" value="-1" step="0.5">
          <input type="number" id="mb" value="1" step="0.5"><input type="number" id="md" value="0" step="0.5">
        </div>
        <button class="primary" id="go">套用</button>
        <button id="rst">還原</button>
      </div>
      <div class="row" id="presets">
        <button data-k="rot" data-m="0,1,-1,0">旋轉 90°</button>
        <button data-k="shear" data-m="1,0,1,1">剪切</button>
        <button data-k="scale" data-m="2,0,0,0.5">縮放</button>
        <button data-k="mirror" data-m="-1,0,0,1">鏡射</button>
      </div>`;
    const setInputs = (a, b, c, d) => { el.querySelector("#ma").value = a; el.querySelector("#mb").value = b; el.querySelector("#mc").value = c; el.querySelector("#md").value = d; };
    el.querySelector("#go").onclick = () => {
      const a = +el.querySelector("#ma").value, b = +el.querySelector("#mb").value;
      const c = +el.querySelector("#mc").value, d = +el.querySelector("#md").value;
      animateTo(M(V(a, b), V(c, d)));
    };
    el.querySelector("#rst").onclick = () => animateTo(MI());
    el.querySelectorAll("#presets button").forEach((btn) => {
      btn.onclick = () => {
        const [a, b, c, d] = btn.dataset.m.split(",").map(Number);
        setInputs(a, b, c, d);
        animateTo(M(V(a, b), V(c, d)));
        s.tried[btn.dataset.k] = true;
        if (Object.keys(s.tried).length === 4) markGoal("L4-all");
      };
    });
  },
  draw() {
    const m = curMatrix();
    drawGrid(m);
    // 會翻面的「F」形,看得出旋轉/鏡射差別
    const F = [V(0,0),V(0,3),V(2,3),V(2,2.4),V(0.7,2.4),V(0.7,1.7),V(1.7,1.7),V(1.7,1.1),V(0.7,1.1),V(0.7,0)];
    fillQuad(F.map((p) => applyM(m, p)), "rgba(56,189,248,.35)");
    drawArrow(V(0, 0), m.i, COL.iHat, 3.5, "î");
    drawArrow(V(0, 0), m.j, COL.jHat, 3.5, "ĵ");
    readout.innerHTML = `î → (${fmt(m.i.x)}, ${fmt(m.i.y)})　ĵ → (${fmt(m.j.x)}, ${fmt(m.j.y)})`;
  },
},

/* ─── 關 5:行列式 = 面積的縮放倍率 ─── */
{
  id: "L5", short: "行列式", title: "關 5|行列式:這道指令把面積放大幾倍?", ep: 2,
  intro: `<p>拖動 <span class="ih">î</span>、<span class="jh">ĵ</span>,中間那塊平行四邊形是「單位方格被變換後的樣子」,它的面積就是<b>行列式 det</b>。</p><p>det 變 <b>0</b>:方格被壓扁,整個平面塌進一條線(秩掉到 1)——這就是「不可逆」。det 變<b>負</b>:方格翻面了(注意顏色變橘),空間的左右手性反轉。</p>`,
  formal: `<p class="math">det[a c; b d] = ad − bc = 變換後單位面積的有向縮放率。det = 0 ⇔ 行向量線性相依 ⇔ rank &lt; 2 ⇔ 不可逆;det &lt; 0 ⇔ 方向翻轉。</p>`,
  goals: [
    { id: "L5-zero", text: "把 det 壓到 0(空間塌陷)" },
    { id: "L5-neg", text: "做出 det < 0(方格翻面變橘)" },
  ],
  state: { i: V(1, 0), j: V(0, 1) },
  enter() { this.state.i = V(1, 0); this.state.j = V(0, 1); },
  demo() { const s = this.state; return [
    { cap: "藍色方格 = 單位方格被變換後的樣子,面積 = det", dur: 2400 },
    { vec: [() => s.i, (w) => s.i = w, V(2, 0)], cap: "î 拉長兩倍:面積 ×2,det = 2", dur: 2000 },
    { vec: [() => s.j, (w) => s.j = w, V(1, 0)], cap: "把 ĵ 壓向 î……空間塌進一條線,det = 0", dur: 2400 },
    { vec: [() => s.j, (w) => s.j = w, V(0, -1)], cap: "ĵ 翻到下面:方格翻面變橘,det < 0", dur: 2200 },
    { vec: [() => s.i, (w) => s.i = w, V(1, 0)], vec2: [() => s.j, (w) => s.j = w, V(0, 1)], cap: "換你做出 det = 0 和 det < 0!", dur: 1400 },
  ]; },
  draggables() {
    const s = this.state;
    return [{ get: () => s.i, set: (w) => { s.i = w; } }, { get: () => s.j, set: (w) => { s.j = w; } }];
  },
  draw() {
    const s = this.state, m = M(s.i, s.j), d = detM(m);
    drawGrid(m);
    fillQuad([V(0, 0), s.i, add(s.i, s.j), s.j], d >= 0 ? COL.posArea : COL.negArea);
    drawArrow(V(0, 0), s.i, COL.iHat, 3.5, "î");
    drawArrow(V(0, 0), s.j, COL.jHat, 3.5, "ĵ");
    readout.innerHTML = `det = <b>${fmt(d)}</b>${Math.abs(d) < 0.06 ? "　<b>塌了!整個平面擠進一條線</b>" : d < 0 ? "　翻面了(定向反轉)" : ""}`;
    if (Math.abs(d) < 0.06 && (len(s.i) > 0.3 || len(s.j) > 0.3)) markGoal("L5-zero");
    if (d < -0.05) markGoal("L5-neg");
  },
},

/* ─── 關 6:矩陣乘法 = 變換的接力 ─── */
{
  id: "L6", short: "乘法=接力", title: "關 6|矩陣乘法:兩道指令接力執行", ep: 2,
  intro: `<p>矩陣乘法 <b>B·A</b> 的意思是:「先執行 A,再執行 B」——<b>從右往左讀</b>,跟函數合成 f(g(x)) 一樣。</p><p>用按鈕把「剪切」和「旋轉 90°」照不同順序接力,看最後格線長得一不一樣。做完實驗再回答小測驗。</p>`,
  formal: `<p class="math">(B·A)(v) = B(A(v))。矩陣乘法即變換合成,故一般 AB ≠ BA(不可交換)。乘積的 column k = B·(A 的 column k)。</p>`,
  goals: [
    { id: "L6-both", text: "兩種順序(先剪後旋、先旋後剪)都跑過" },
    { id: "L6-quiz", text: "答對小測驗" },
  ],
  state: { cur: MI(), seq: [], orders: {} },
  enter() { this.state.cur = MI(); this.state.seq = []; this.state.orders = {}; setMatrixNow(MI()); },
  demo() {
    const s = this.state;
    const SH = M(V(1, 0), V(1, 1)), RO = M(V(0, 1), V(-1, 0));
    const set = (seq, m) => () => { s.seq = seq; s.cur = m; };
    return [
      { mat: MI(), call: set([], MI()), cap: "接力實驗:先「剪切 S」再「旋轉 R」", dur: 1600 },
      { mat: SH, call: set(["S"], SH), cap: "第一棒:剪切 S", dur: 1600 },
      { mat: mulM(RO, SH), call: set(["S", "R"], mulM(RO, SH)), cap: "第二棒:旋轉 R——合成矩陣 = R·S", dur: 2000 },
      { dur: 1200 },
      { mat: MI(), call: set([], MI()), cap: "重來,順序對調:先旋轉、再剪切", dur: 1200 },
      { mat: RO, call: set(["R"], RO), cap: "第一棒:旋轉 R", dur: 1600 },
      { mat: mulM(SH, RO), call: set(["R", "S"], mulM(SH, RO)), cap: "第二棒:剪切 S——合成 = S·R,長得不一樣!", dur: 2200 },
      { dur: 1200 },
      { mat: MI(), call: set([], MI()), cap: "順序不同、結果不同:AB ≠ BA。換你接力+答題", dur: 1600 },
    ];
  },
  controls(el) {
    const s = this.state;
    const SH = M(V(1, 0), V(1, 1)), RO = M(V(0, 1), V(-1, 0));
    el.innerHTML = `
      <div class="row">
        <button id="sh">套用 剪切 S</button>
        <button id="ro">套用 旋轉 R</button>
        <button id="rst">重置</button>
      </div>
      <div class="row quiz-msg">小測驗:「<b>先剪切、再旋轉</b>」對應哪個矩陣乘積?</div>
      <div class="row">
        <button id="qa">R·S</button>
        <button id="qb">S·R</button>
        <span class="quiz-msg" id="qmsg"></span>
      </div>`;
    const apply = (T, name) => {
      s.cur = mulM(T, s.cur); s.seq.push(name);
      animateTo(s.cur);
      const key = s.seq.join(">");
      if (key === "S>R") s.orders.sr = true;
      if (key === "R>S") s.orders.rs = true;
      if (s.orders.sr && s.orders.rs) markGoal("L6-both");
    };
    el.querySelector("#sh").onclick = () => apply(SH, "S");
    el.querySelector("#ro").onclick = () => apply(RO, "R");
    el.querySelector("#rst").onclick = () => { s.cur = MI(); s.seq = []; animateTo(MI()); };
    const qmsg = el.querySelector("#qmsg");
    el.querySelector("#qa").onclick = () => { qmsg.innerHTML = "<b style='color:var(--ok)'>✓ 對!先做的 S 貼在右邊,從右往左讀。</b>"; markGoal("L6-quiz"); };
    el.querySelector("#qb").onclick = () => { qmsg.innerHTML = "<span style='color:var(--i-hat)'>✗ 再想想:先做的要寫在右邊(先進先被吃)。</span>"; };
  },
  draw() {
    const m = curMatrix();
    drawGrid(m);
    const F = [V(0,0),V(0,3),V(2,3),V(2,2.4),V(0.7,2.4),V(0.7,1.7),V(1.7,1.7),V(1.7,1.1),V(0.7,1.1),V(0.7,0)];
    fillQuad(F.map((p) => applyM(m, p)), "rgba(56,189,248,.35)");
    drawArrow(V(0, 0), m.i, COL.iHat, 3.5, "î");
    drawArrow(V(0, 0), m.j, COL.jHat, 3.5, "ĵ");
    const s = this.state;
    readout.innerHTML = `已執行:${s.seq.length ? s.seq.join(" → ") : "(無)"}　合成矩陣 = [${fmt(s.cur.i.x)} ${fmt(s.cur.j.x)}; ${fmt(s.cur.i.y)} ${fmt(s.cur.j.y)}]`;
  },
},

/* ─── 關 7:內積 = 投影 ─── */
{
  id: "L7", short: "內積投影", title: "關 7|內積:你在我方向上「投」了多少?", ep: 3,
  intro: `<p>內積 u·w 量的是「u 在 w 方向上的影子」乘上 w 的長度。虛線是從 u 的頭垂直落到 w 方向線上的<b>投影</b>。</p><p>同向 → 內積為正;背對 → 為負;<b>垂直 → 恰好是 0</b>。拖動兩個向量,把內積調到 0,親手做出「正交」。</p>`,
  formal: `<p class="math">u·w = |u||w|cosθ = uₓwₓ + u_yw_y。proj_w(u) = (u·w / |w|²)·w。u·w = 0 ⇔ u ⊥ w。內積把「角度與長度」翻譯成一個純量。</p>`,
  goals: [{ id: "L7-perp", text: "把內積調到 0(兩向量垂直,長度都 > 1)" }],
  state: { u: V(3, 1), w: V(1, 2) },
  enter() { this.state.u = V(3, 1); this.state.w = V(1, 2); },
  demo() { const s = this.state; return [
    { cap: "藍色粗線 = u 在 w 方向上的影子(投影)", dur: 2400 },
    { vec: [() => s.u, (w) => s.u = w, V(-1, 3)], cap: "轉動 u……影子越縮越短,內積跟著變小", dur: 2600 },
    { vec: [() => s.u, (w) => s.u = w, V(-2, 1)], cap: "影子縮到 0:內積 = 0,u ⊥ w", dur: 2000 },
    { dur: 1600 },
    { vec: [() => s.u, (w) => s.u = w, V(3, 1)], cap: "換你親手做出一次垂直!", dur: 1600 },
  ]; },
  draggables() {
    const s = this.state;
    return [{ get: () => s.u, set: (w) => { s.u = w; } }, { get: () => s.w, set: (w) => { s.w = w; } }];
  },
  draw() {
    const s = this.state, d = dot(s.u, s.w);
    drawGrid(MI(), { original: false });
    const wl = len(s.w);
    if (wl > 0.1) {
      const dir = scl(s.w, 1 / wl), L = 8;
      g.strokeStyle = "#3d4a75"; g.lineWidth = 1.5;
      const a = toScr(scl(dir, -L)), b = toScr(scl(dir, L));
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      const foot = scl(s.w, d / (wl * wl));
      drawDash(s.u, foot, COL.blue);
      g.strokeStyle = Math.abs(d) < 0.08 ? COL.gold : COL.blue;
      g.lineWidth = 5;
      const o = toScr(V(0, 0)), f = toScr(foot);
      g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(f.x, f.y); g.stroke();
    }
    drawArrow(V(0, 0), s.u, COL.vec, 3.5, "u");
    drawArrow(V(0, 0), s.w, COL.extra, 3.5, "w");
    const perp = Math.abs(d) < 0.08 && len(s.u) > 1 && wl > 1;
    const cosT = len(s.u) > 0.01 && wl > 0.01 ? d / (len(s.u) * wl) : 0;
    readout.innerHTML = `u·w = <b>${fmt(d)}</b>　cosθ = ${fmt(cosT)}${perp ? "　<b style='color:var(--gold,#fbbf24)'>⊥ 正交!</b>" : d > 0.08 ? "(同向成分)" : d < -0.08 ? "(反向成分)" : ""}`;
    if (perp) markGoal("L7-perp");
  },
},

/* ─── 關 8:特徵向量獵人 ─── */
{
  id: "L8", short: "特徵向量", title: "關 8|特徵向量獵人:找出「不轉向」的方向", ep: 3,
  intro: `<p>這關固定一個變換 A(格線已被它掰彎)。你手上有一支黃色探測向量 <span class="hl">u</span>,紫色箭頭是它被 A 打過去的結果 <span style="color:var(--extra)"><b>A·u</b></span>。</p><p>大部分方向被 A 一打就<b>轉向</b>;但存在特殊方向,打完只是<b>伸縮、不轉向</b>——那就是<b>特徵向量</b>,伸縮倍率就是<b>特徵值 λ</b>。轉動 u,把兩條特徵方向都獵到(對齊時會亮金色)。</p>`,
  formal: `<p class="math">A·u = λ·u(u ≠ 0)時,u 為 A 的特徵向量、λ 為特徵值。本關 A = [2 1; 0 3],特徵對:λ=2 沿 (1,0)、λ=3 沿 (1,1)。</p>`,
  goals: [
    { id: "L8-e1", text: "獵到第一條特徵方向(λ = 2)" },
    { id: "L8-e2", text: "獵到第二條特徵方向(λ = 3)" },
  ],
  state: { u: V(2, 1.4), A: M(V(2, 0), V(1, 3)) },
  enter() { this.state.u = V(2, 1.4); setMatrixNow(this.state.A); },
  demo() { const s = this.state; return [
    { cap: "紫色箭頭 = u 被矩陣 A 打過去的結果 A·u", dur: 2400 },
    { vec: [() => s.u, (w) => s.u = w, V(0.5, 2)], cap: "隨便一個方向:一打就轉向", dur: 2000 },
    { vec: [() => s.u, (w) => s.u = w, V(-1.5, 1.5)], cap: "再換一個……還是轉向", dur: 2000 },
    { vec: [() => s.u, (w) => s.u = w, V(2, 2)], cap: "但這個方向——", dur: 1800 },
    { cap: "不轉向!只被拉長 3 倍:特徵向量,λ = 3", dur: 2600 },
    { vec: [() => s.u, (w) => s.u = w, V(2, 1.4)], cap: "另一條特徵方向藏在別處,換你獵!", dur: 1600 },
  ]; },
  draggables() { const s = this.state; return [{ get: () => s.u, set: (w) => { s.u = w; } }]; },
  draw() {
    const s = this.state;
    drawGrid(s.A);
    const Au = applyM(s.A, s.u), lu = len(s.u), lAu = len(Au);
    const aligned = lu > 0.4 && lAu > 0.1 && Math.abs(cross(s.u, Au)) / (lu * lAu) < 0.02 && dot(s.u, Au) > 0;
    if (aligned) {
      const dir = scl(s.u, 9 / lu);
      g.strokeStyle = COL.gold; g.globalAlpha = 0.35; g.lineWidth = 8;
      const a = toScr(scl(dir, -1)), b = toScr(dir);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      g.globalAlpha = 1;
    }
    drawArrow(V(0, 0), Au, COL.extra, 4, "A·u");
    drawArrow(V(0, 0), s.u, COL.vec, 4, "u");
    let msg = "還在轉向……繼續轉動 u";
    if (aligned) {
      const lam = dot(Au, s.u) / (lu * lu);
      msg = `<b style="color:#fbbf24">不轉向!λ ≈ ${fmt(lam)}</b>`;
      // 方向角(mod π)分辨兩條特徵線:0 與 π/4
      let th = Math.atan2(s.u.y, s.u.x) % Math.PI;
      if (th < 0) th += Math.PI;
      if (Math.abs(th) < 0.1 || Math.abs(th - Math.PI) < 0.1) markGoal("L8-e1");
      if (Math.abs(th - Math.PI / 4) < 0.1) markGoal("L8-e2");
    }
    readout.innerHTML = `A·u = (${fmt(Au.x)}, ${fmt(Au.y)})　${msg}`;
  },
},

/* ─── 關 9:投影到直線 + 投影矩陣 ─── */
{
  id: "L9", short: "投影矩陣", title: "關 9|投影:把向量壓到一條線上", ep: 3,
  intro: `<p>把向量 <span class="hl">v</span> 投影到一條直線,就是問:「v 的影子落在這條線的哪裡?」答案是從 v 的頭<b>垂直</b>落到線上的那一點。</p><p>拖動 <span class="hl">v</span> 和直線方向 <span style="color:var(--extra)"><b>d</b></span>。把直線<b>轉到跟 v 同向</b>,影子就等於 v 本身;把直線<b>轉到垂直於 v</b>,影子縮成 0。</p>`,
  formal: `<p class="math">proj_d(v) = (v·d / d·d)·d。投影矩陣 P = d dᵀ / (dᵀd),滿足 P² = P、Pᵀ = P。P 把整個平面壓到 d 所在的直線上。</p>`,
  goals: [
    { id: "L9-full", text: "把直線轉到與 v 同向,讓影子 = v" },
    { id: "L9-zero", text: "把直線轉到垂直於 v,讓影子 = 0" },
  ],
  state: { v: V(2, 2.5), d: V(3, 0.4) },
  enter() { this.state.v = V(2, 2.5); this.state.d = V(3, 0.4); },
  demo() { const s = this.state; return [
    { cap: "紫色直線 d,黃色向量 v。影子 = v 垂直落到 d 上", dur: 2400 },
    { vec: [() => s.d, (w) => s.d = w, V(2, 2.5)], cap: "把 d 轉到跟 v 同向……影子伸長到 = v", dur: 2200 },
    { vec: [() => s.d, (w) => s.d = w, V(-2.5, 2)], cap: "把 d 轉到垂直於 v……影子縮成一點:0", dur: 2400 },
    { vec: [() => s.d, (w) => s.d = w, V(3, 0.4)], cap: "換你:各做出一次「影子=v」和「影子=0」", dur: 1600 },
  ]; },
  draggables() {
    const s = this.state;
    return [{ get: () => s.v, set: (w) => { s.v = w; } }, { get: () => s.d, set: (w) => { s.d = w; } }];
  },
  draw() {
    const s = this.state, dd = dot(s.d, s.d);
    drawGrid(MI(), { original: false });
    // 直線(雙向延伸)
    if (dd > 0.02) {
      const dir = scl(s.d, 1 / len(s.d)), L = 9;
      g.strokeStyle = "#4a3d75"; g.lineWidth = 2;
      const a = toScr(scl(dir, -L)), b = toScr(scl(dir, L));
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    const proj = dd > 0.02 ? scl(s.d, dot(s.v, s.d) / dd) : V(0, 0);
    drawDash(s.v, proj, COL.blue);
    drawArrow(V(0, 0), s.d, COL.extra, 3, "d");
    drawArrow(V(0, 0), s.v, COL.vec, 3.5, "v");
    drawDot(proj, COL.blue, 7);
    labelAt(proj, "影子", COL.blue, 8, 18);
    const onFull = len(sub(proj, s.v)) < 0.18 && len(s.v) > 1;
    const isZero = len(proj) < 0.12 && len(s.v) > 1;
    readout.innerHTML = `影子 = (${fmt(proj.x)}, ${fmt(proj.y)})　長度 ${fmt(len(proj))}${onFull ? "　<b style='color:#4ade80'>= v!</b>" : isZero ? "　<b style='color:#4ade80'>= 0!(v ⊥ d)</b>" : ""}`;
    if (onFull) markGoal("L9-full");
    if (isZero) markGoal("L9-zero");
  },
},

/* ─── 關 10:基變換 ─── */
{
  id: "L10", short: "基變換", title: "關 10|同一個向量,換一組基底來描述", ep: 1,
  intro: `<p>座標從來不是絕對的,它只是「在某組基底下的配方」。同一個 <span class="hl">v</span>,用標準基底看是一組數字,用另一組基底 <span class="ih">b₁</span>、<span class="jh">b₂</span> 看又是另一組。</p><p>拖動基底和 v。目標:讓 v 在新基底下的座標剛好是 <b>(1, 2)</b>——也就是讓 v 落在 1·b₁ + 2·b₂ 的星星上。再把兩個基向量弄成<b>不垂直的斜基底</b>,看座標照樣讀得出來。</p>`,
  formal: `<p class="math">設 B = [b₁ | b₂],則 v 在新基底下的座標 [v]_B = B⁻¹v。基變換不改變向量本身,只換一套「量它的尺」。</p>`,
  goals: [
    { id: "L10-hit", text: "讓 v 的新座標 = (1, 2)(落在星星上)" },
    { id: "L10-skew", text: "把 b₁、b₂ 弄成不垂直的斜基底" },
  ],
  state: { b1: V(1.5, 0.3), b2: V(-0.4, 1.4), v: V(2.4, 0.9) },
  enter() { this.state.b1 = V(1.5, 0.3); this.state.b2 = V(-0.4, 1.4); this.state.v = V(2.4, 0.9); },
  demo() { const s = this.state; return [
    { cap: "斜格線 = 新基底 b₁、b₂ 張出的座標系", dur: 2400 },
    { cam: { scale: 82, x: 0.7, y: 1.6 }, cap: "星星在 1·b₁ + 2·b₂——就是新座標 (1,2) 的位置", dur: 2600 },
    { cam: "reset", vec: [() => s.v, (w) => s.v = w, add(s.b1, scl(s.b2, 2))], cap: "把 v 拖到星星上,新座標就變成 (1,2)", dur: 2200 },
    { vec: [() => s.v, (w) => s.v = w, V(2.4, 0.9)], cap: "換你:命中 (1,2),再把基底弄斜", dur: 1600 },
  ]; },
  draggables() {
    const s = this.state;
    return [
      { get: () => s.b1, set: (w) => { s.b1 = w; } },
      { get: () => s.b2, set: (w) => { s.b2 = w; } },
      { get: () => s.v, set: (w) => { s.v = w; } },
    ];
  },
  draw() {
    const s = this.state, det = cross(s.b1, s.b2);
    drawGrid(M(s.b1, s.b2));
    const star = add(s.b1, scl(s.b2, 2));
    drawStar(star, COL.star);
    drawArrow(V(0, 0), s.b1, COL.iHat, 3.5, "b₁");
    drawArrow(V(0, 0), s.b2, COL.jHat, 3.5, "b₂");
    drawArrow(V(0, 0), s.v, COL.vec, 3.5, "v");
    let c1 = 0, c2 = 0;
    if (Math.abs(det) > 0.02) {
      c1 = (s.b2.y * s.v.x - s.b2.x * s.v.y) / det;
      c2 = (-s.b1.y * s.v.x + s.b1.x * s.v.y) / det;
    }
    const hit = Math.abs(c1 - 1) < 0.12 && Math.abs(c2 - 2) < 0.12;
    const cosb = Math.abs(dot(s.b1, s.b2)) / Math.max(1e-6, len(s.b1) * len(s.b2));
    const skew = cosb > 0.2 && len(s.b1) > 0.5 && len(s.b2) > 0.5;
    readout.innerHTML = `[v]<sub>B</sub> = (<b>${fmt(c1)}</b>, <b>${fmt(c2)}</b>)　目標 (1, 2)${hit ? "　<b style='color:#4ade80'>✓</b>" : ""}`;
    if (hit) markGoal("L10-hit");
    if (skew) markGoal("L10-skew");
  },
},

/* ─── 關 11:SVD 奇異值 ─── */
{
  id: "L11", short: "SVD 奇異值", title: "關 11|SVD:任何矩陣都是「轉 → 拉 → 轉」", ep: 3,
  intro: `<p>把一個<b>單位圓</b>丟進任何矩陣,出來一定是<b>橢圓</b>(或塌成線段)。橢圓的兩條半軸長,就是矩陣的<b>奇異值</b> σ₁ ≥ σ₂——它們量的是「這個變換在兩個互相垂直的方向上,各拉伸了多少」。</p><p>拖動 <span class="ih">î</span>、<span class="jh">ĵ</span> 改變矩陣。讓 <b>σ₁ = σ₂</b>(橢圓變回正圓,只有旋轉+等比縮放);再讓 <b>σ₂ = 0</b>(橢圓塌成線段,秩掉到 1)。</p>`,
  formal: `<p class="math">任意 M = U Σ Vᵀ:Vᵀ 先旋轉、Σ = diag(σ₁,σ₂) 沿軸拉伸、U 再旋轉。σᵢ = √(MᵀM 的特徵值),且 σ₁σ₂ = |det M|(面積縮放率)。σ₂ = 0 ⇔ 秩 1。</p>`,
  goals: [
    { id: "L11-circle", text: "讓 σ₁ ≈ σ₂(橢圓變回正圓)" },
    { id: "L11-sing", text: "讓 σ₂ ≈ 0(橢圓塌成線段,秩 1)" },
  ],
  state: { i: V(1.6, 0.5), j: V(-0.6, 1.2) },
  enter() { this.state.i = V(1.6, 0.5); this.state.j = V(-0.6, 1.2); },
  demo() { const s = this.state; return [
    { cap: "淡圈 = 單位圓,金色 = 它被矩陣變成的橢圓", dur: 2400 },
    { vec: [() => s.i, (w) => s.i = w, V(1.4, 0)], vec2: [() => s.j, (w) => s.j = w, V(0, 1.4)], cap: "調成正圓:σ₁ = σ₂,純旋轉+等比縮放", dur: 2400 },
    { vec: [() => s.i, (w) => s.i = w, V(2, 1)], vec2: [() => s.j, (w) => s.j = w, V(1, 0.5)], cap: "把 î、ĵ 弄共線:橢圓塌成線段,σ₂ = 0", dur: 2600 },
    { vec: [() => s.i, (w) => s.i = w, V(1.6, 0.5)], vec2: [() => s.j, (w) => s.j = w, V(-0.6, 1.2)], cap: "換你:做出正圓,再做出塌陷", dur: 1600 },
  ]; },
  draggables() {
    const s = this.state;
    return [{ get: () => s.i, set: (w) => { s.i = w; } }, { get: () => s.j, set: (w) => { s.j = w; } }];
  },
  sv() {
    const s = this.state, a = dot(s.i, s.i), b = dot(s.i, s.j), c = dot(s.j, s.j);
    const tr = a + c, dt = a * c - b * b, disc = Math.sqrt(Math.max(0, tr * tr - 4 * dt));
    return [Math.sqrt(Math.max(0, (tr + disc) / 2)), Math.sqrt(Math.max(0, (tr - disc) / 2))];
  },
  draw() {
    const s = this.state, m = M(s.i, s.j);
    drawGrid(m);
    // 原始單位圓(淡)
    g.strokeStyle = "#39456e"; g.lineWidth = 1.5; g.beginPath();
    for (let k = 0; k <= 60; k++) { const th = k / 60 * 2 * Math.PI, p = toScr(V(Math.cos(th), Math.sin(th))); k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }
    g.stroke();
    // 變換後橢圓(金)
    g.strokeStyle = COL.gold; g.lineWidth = 3; g.beginPath();
    for (let k = 0; k <= 60; k++) { const th = k / 60 * 2 * Math.PI, p = toScr(applyM(m, V(Math.cos(th), Math.sin(th)))); k ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }
    g.stroke();
    drawArrow(V(0, 0), s.i, COL.iHat, 3, "î");
    drawArrow(V(0, 0), s.j, COL.jHat, 3, "ĵ");
    const [s1, s2] = this.sv();
    const circle = Math.abs(s1 - s2) < 0.12 && s1 > 0.4;
    const sing = s2 < 0.1 && s1 > 0.4;
    readout.innerHTML = `σ₁ = <b>${fmt(s1)}</b>　σ₂ = <b>${fmt(s2)}</b>　秩 ${s2 < 0.1 ? 1 : 2}${circle ? "　<b style='color:#4ade80'>正圓!</b>" : sing ? "　<b style='color:#fbbf24'>塌成線段!</b>" : ""}`;
    if (circle) markGoal("L11-circle");
    if (sing) markGoal("L11-sing");
  },
},

/* ─── 關 12:零空間與行空間 ─── */
{
  id: "L12", short: "零空間", title: "關 12|塌陷之後:行空間與零空間", ep: 2,
  intro: `<p>當矩陣把平面<b>壓扁</b>(行列式 = 0),兩件事同時發生:所有輸出擠進一條線——這條線叫<b>行空間</b>(值域,金色);同時有一整條線的向量全被送到<b>原點</b>——這條叫<b>零空間</b>(核,紫色)。</p><p>先拖 <span class="ih">î</span>、<span class="jh">ĵ</span> 讓行列式塌成 0(兩個基向量共線);再拖測試向量 <span class="hl">u</span>,找到那條讓 <b>A·u = 0</b> 的方向。維度守恆:行空間 + 零空間 = 2。</p>`,
  formal: `<p class="math">行空間 = col(A) = span{欄向量};零空間 = null(A) = {u : Au = 0}。秩–零化度定理:rank(A) + nullity(A) = n。A 可逆 ⇔ null(A) = {0}。</p>`,
  goals: [
    { id: "L12-collapse", text: "把矩陣弄成奇異(det ≈ 0),平面塌成行空間" },
    { id: "L12-null", text: "找到零空間:拖 u 讓 A·u = 0(u ≠ 0)" },
  ],
  state: { i: V(1.5, 0.5), j: V(0, 1), u: V(-1.5, 2) },
  enter() { this.state.i = V(1.5, 0.5); this.state.j = V(0, 1); this.state.u = V(-1.5, 2); },
  demo() { const s = this.state; return [
    { cap: "目前 det ≠ 0,整個平面都填得滿", dur: 2000 },
    { vec: [() => s.j, (w) => s.j = w, V(3, 1)], cap: "把 ĵ 拖到與 î 共線:平面塌成一條線=行空間", dur: 2400 },
    { vec: [() => s.u, (w) => s.u = w, V(-1, 3)], cap: "沿某個方向的 u,被 A 壓成 0——這就是零空間", dur: 2600 },
    { vec: [() => s.i, (w) => s.i = w, V(1.5, 0.5)], vec2: [() => s.j, (w) => s.j = w, V(0, 1)], cap: "換你:先塌陷,再獵零空間", dur: 1600 },
  ]; },
  draggables() {
    const s = this.state;
    return [
      { get: () => s.i, set: (w) => { s.i = w; } },
      { get: () => s.j, set: (w) => { s.j = w; } },
      { get: () => s.u, set: (w) => { s.u = w; } },
    ];
  },
  draw() {
    const s = this.state, m = M(s.i, s.j), det = detM(m);
    drawGrid(m);
    const singular = Math.abs(det) < 0.06;
    if (singular) {
      // 行空間(金線,沿較長的欄向量)
      const c = len(s.i) > len(s.j) ? s.i : s.j;
      if (len(c) > 0.2) {
        const dir = scl(c, 9 / len(c));
        g.strokeStyle = COL.gold; g.lineWidth = 4; g.globalAlpha = 0.6;
        let a = toScr(scl(dir, -1)), b = toScr(dir);
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.globalAlpha = 1;
      }
      // 零空間(紫虛線):n = (j.x, -i.x) 或 (j.y, -i.y)
      let n = V(s.j.x, -s.i.x);
      if (len(n) < 0.05) n = V(s.j.y, -s.i.y);
      if (len(n) > 0.05) {
        const dir = scl(n, 9 / len(n));
        g.strokeStyle = COL.extra; g.lineWidth = 2; g.setLineDash([7, 5]);
        let a = toScr(scl(dir, -1)), b = toScr(dir);
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.setLineDash([]);
        labelAt(dir, "零空間", COL.extra, 6, -6);
      }
      if (len(s.i) > 0.3 || len(s.j) > 0.3) markGoal("L12-collapse");
    }
    const Au = applyM(m, s.u);
    drawArrow(V(0, 0), s.i, COL.iHat, 3, "î");
    drawArrow(V(0, 0), s.j, COL.jHat, 3, "ĵ");
    drawArrow(V(0, 0), s.u, COL.vec, 3.5, "u");
    if (len(Au) > 0.15) drawArrow(V(0, 0), Au, COL.blue, 3, "A·u");
    else drawDot(V(0, 0), COL.blue, 8);
    const nulled = len(Au) < 0.12 && len(s.u) > 0.8;
    readout.innerHTML = `det = <b>${fmt(det)}</b>　秩 ${singular ? 1 : 2}　|A·u| = <b>${fmt(len(Au))}</b>${nulled ? "　<b style='color:#a78bfa'>u 在零空間!</b>" : ""}`;
    if (nulled) markGoal("L12-null");
  },
},

/* ─── 關 13:馬可夫鏈穩態(特徵向量的應用) ─── */
{
  id: "L13", short: "馬可夫穩態", title: "關 13|馬可夫鏈:一直走,忘掉起點", ep: 3,
  intro: `<p>天氣在「晴 / 雨」間跳,轉移機率固定。從<b>任何</b>初始分布出發,一步步套用轉移矩陣,分布會<b>收斂到穩態</b>——而且跟你從哪開始無關。這個穩態,正是轉移矩陣<b>特徵值 = 1 的特徵向量</b>。</p><p>調兩個滑桿(留在晴、留在雨的機率),按「走一步」看分布爬向紅色穩態線。改轉移機率,穩態就跟著移動。</p>`,
  formal: `<p class="math">轉移矩陣 T(各欄和為 1)。分布 xₜ₊₁ = T xₜ。穩態 π 滿足 Tπ = π(即 λ=1 的特徵向量)。2 態時 π_晴 = (1−b)/((1−a)+(1−b)),a、b 為留在原狀態的機率。</p>`,
  goals: [
    { id: "L13-converge", text: "連走 ≥ 15 步,看分布收斂到穩態" },
    { id: "L13-extreme", text: "調轉移機率,讓穩態 π(晴) > 0.7 或 < 0.3" },
  ],
  state: { a: 0.8, b: 0.6, s: 0.05, hist: [0.05], steps: 0 },
  enter() { this.state.a = 0.8; this.state.b = 0.6; this.state.s = 0.05; this.state.hist = [0.05]; this.state.steps = 0; },
  pi() { const s = this.state; const den = (1 - s.a) + (1 - s.b); return den < 1e-6 ? 0.5 : (1 - s.b) / den; },
  walk(k) { const s = this.state; for (let i = 0; i < k; i++) { s.s = s.a * s.s + (1 - s.b) * (1 - s.s); s.hist.push(s.s); s.steps++; } },
  demo() { const self = this, s = this.state; return [
    { call: () => self.enter(), cap: "從幾乎全雨(晴=5%)開始", dur: 1800 },
    { call: () => self.walk(6), cap: "走幾步:晴天比例快速爬升", dur: 2200 },
    { call: () => self.walk(14), cap: "20 步後,分布黏在紅色穩態線上,起點被遺忘", dur: 2600 },
    { num: [() => s.b, (v) => s.b = v, 0.9], call: () => { s.s = self.state.hist[self.state.hist.length - 1]; }, cap: "改「留在雨」的機率,穩態整條移動", dur: 2400 },
    { call: () => self.enter(), cap: "換你:走到收斂,再把穩態推到極端", dur: 1600 },
  ]; },
  controls(el) {
    const self = this, s = this.state;
    el.innerHTML = `
      <div class="row"><label>留在晴</label><input type="range" id="ma" min="0.05" max="0.95" step="0.01" value="0.8"><span class="val" id="vma">0.80</span></div>
      <div class="row"><label>留在雨</label><input type="range" id="mb" min="0.05" max="0.95" step="0.01" value="0.6"><span class="val" id="vmb">0.60</span></div>
      <div class="row"><button class="primary" id="w1">走一步</button><button id="w10">走 10 步</button><button id="wr">重設</button></div>`;
    el.querySelector("#ma").oninput = (e) => { s.a = +e.target.value; el.querySelector("#vma").textContent = s.a.toFixed(2); };
    el.querySelector("#mb").oninput = (e) => { s.b = +e.target.value; el.querySelector("#vmb").textContent = s.b.toFixed(2); };
    el.querySelector("#w1").onclick = () => self.walk(1);
    el.querySelector("#w10").onclick = () => self.walk(10);
    el.querySelector("#wr").onclick = () => { s.s = Math.random(); s.hist = [s.s]; s.steps = 0; };
    this._sync = () => { el.querySelector("#ma").value = s.a; el.querySelector("#vma").textContent = s.a.toFixed(2); el.querySelector("#mb").value = s.b; el.querySelector("#vmb").textContent = s.b.toFixed(2); };
  },
  draw() {
    const s = this.state, pi = this.pi();
    // 當前分布條
    const bx = 90, by = 70, bw = 180, bh = 60;
    g.fillStyle = PC.curve; g.fillRect(bx, by, bw * s.s, bh);
    g.fillStyle = PC.prior; g.fillRect(bx + bw * s.s, by, bw * (1 - s.s), bh);
    g.strokeStyle = PC.axis; g.lineWidth = 1.5; g.strokeRect(bx, by, bw, bh);
    pText(bx, by - 10, "當前分布", PC.dim, 13);
    pText(bx + bw * s.s / 2, by + bh / 2 + 5, "晴", "#1a1a1a", 14, "center", true);
    pText(bx + bw * s.s + bw * (1 - s.s) / 2, by + bh / 2 + 5, "雨", "#0a0e1a", 14, "center", true);
    // 軌跡圖
    const X0 = 90, Y0 = 180, W = 480, H = 340, Yb = Y0 + H;
    const Y = (v) => Yb - v * H;
    g.strokeStyle = PC.axis; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X0, Y0); g.lineTo(X0, Yb); g.lineTo(X0 + W, Yb); g.stroke();
    pText(X0 - 8, Y(1) + 5, "1", PC.dim, 12, "right"); pText(X0 - 8, Yb + 5, "0", PC.dim, 12, "right");
    // 穩態線
    g.strokeStyle = PC.sick; g.setLineDash([6, 4]); g.lineWidth = 2;
    g.beginPath(); g.moveTo(X0, Y(pi)); g.lineTo(X0 + W, Y(pi)); g.stroke(); g.setLineDash([]);
    pText(X0 + W + 4, Y(pi) + 4, "π=" + pi.toFixed(2), PC.sick, 12);
    // P(晴) 軌跡
    const nn = Math.max(1, s.hist.length - 1);
    g.strokeStyle = PC.curve; g.lineWidth = 2.5; g.beginPath();
    s.hist.forEach((v, k) => { const px = X0 + (s.hist.length === 1 ? 0 : k / nn * W), py = Y(v); k ? g.lineTo(px, py) : g.moveTo(px, py); });
    g.stroke();
    s.hist.forEach((v, k) => { drawDisc(X0 + (s.hist.length === 1 ? 0 : k / nn * W), Y(v), 3, PC.curve, null); });
    pText(X0, Y0 - 8, `P(晴) 隨步數的軌跡　已走 ${s.steps} 步`, PC.dim, 13);
    readout.innerHTML = `P(晴) = <b>${s.s.toFixed(3)}</b>　穩態 π(晴) = <b>${pi.toFixed(3)}</b>${s.steps >= 15 && Math.abs(s.s - pi) < 0.02 ? "　<b style='color:#4ade80'>✓ 已收斂</b>" : ""}`;
    if (s.steps >= 15 && Math.abs(s.s - pi) < 0.03) markGoal("L13-converge");
    if (pi > 0.7 || pi < 0.3) markGoal("L13-extreme");
  },
},
];

/* ═══════════════════════════════════════════════════════════
   概率模組 — 自己的 2D 繪圖(螢幕座標,不經 toScr/相機)
   ═══════════════════════════════════════════════════════════ */
const PC = { // 概率配色(比線代更柔和,近 Anthropic 課程感)
  ink: "#e8ecf8", dim: "#9aa5c4", axis: "#55648f",
  curve: "#ffd166", fill: "rgba(255,209,102,.30)", fill2: "rgba(56,189,248,.28)",
  sick: "#ff5c7a", well: "#4ade80", pos: "#fbbf24", grid: "#212a4b",
  prior: "#38bdf8", post: "#a78bfa",
};
// 繪圖框(畫布內留白)
const PLOT = { x0: 70, y0: 70, x1: 610, y1: 560 };
const gaussPDF = (x, mu, sig) => Math.exp(-((x - mu) ** 2) / (2 * sig * sig)) / (sig * Math.sqrt(2 * Math.PI));

function pAxes(xmin, xmax, ymax, xlabel) {
  g.strokeStyle = PC.axis; g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(PLOT.x0, PLOT.y1); g.lineTo(PLOT.x1, PLOT.y1); // x 軸
  g.moveTo(PLOT.x0, PLOT.y0); g.lineTo(PLOT.x0, PLOT.y1); // y 軸
  g.stroke();
  g.fillStyle = PC.dim; g.font = "13px sans-serif"; g.textAlign = "center";
  for (let k = Math.ceil(xmin); k <= Math.floor(xmax); k++) {
    const px = PLOT.x0 + (k - xmin) / (xmax - xmin) * (PLOT.x1 - PLOT.x0);
    g.fillText(String(k), px, PLOT.y1 + 20);
    g.strokeStyle = PC.grid; g.beginPath(); g.moveTo(px, PLOT.y0); g.lineTo(px, PLOT.y1); g.stroke();
  }
  g.fillStyle = PC.dim; g.font = "14px sans-serif";
  g.fillText(xlabel || "x", (PLOT.x0 + PLOT.x1) / 2, PLOT.y1 + 44);
  g.textAlign = "left";
}
// 密度曲線 x→px, density→py 的映射
function densityMap(xmin, xmax, ymax) {
  return {
    X: (x) => PLOT.x0 + (x - xmin) / (xmax - xmin) * (PLOT.x1 - PLOT.x0),
    Y: (d) => PLOT.y1 - d / ymax * (PLOT.y1 - PLOT.y0),
    invX: (px) => xmin + (px - PLOT.x0) / (PLOT.x1 - PLOT.x0) * (xmax - xmin),
    xmin, xmax, ymax,
  };
}
function drawCurve(map, pdf, color) {
  g.strokeStyle = color; g.lineWidth = 3; g.beginPath();
  for (let px = PLOT.x0; px <= PLOT.x1; px += 2) {
    const x = map.invX(px), py = map.Y(pdf(x));
    px === PLOT.x0 ? g.moveTo(px, py) : g.lineTo(px, py);
  }
  g.stroke();
}
function fillUnder(map, pdf, a, b, color) {
  g.fillStyle = color; g.beginPath();
  const pa = map.X(a);
  g.moveTo(pa, PLOT.y1);
  for (let px = pa; px <= map.X(b); px += 2) g.lineTo(px, map.Y(pdf(map.invX(px))));
  g.lineTo(map.X(b), PLOT.y1); g.closePath(); g.fill();
}
// 數值積分 P(a<X<b)
function integ(pdf, a, b) {
  let s = 0; const n = 240, h = (b - a) / n;
  for (let k = 0; k < n; k++) s += pdf(a + (k + 0.5) * h) * h;
  return s;
}
function pText(x, y, txt, color, size = 15, align = "left", bold = false) {
  g.fillStyle = color; g.textAlign = align;
  g.font = `${bold ? "bold " : ""}${size}px sans-serif`;
  g.fillText(txt, x, y); g.textAlign = "left";
}
// 兩圓交集面積(lens);r1,r2 半徑,d 圓心距
function lensArea(d, r1, r2) {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a1 = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const a2 = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  const a3 = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  return a1 + a2 - a3;
}
function drawDisc(cx, cy, r, fill, stroke, lw = 2) {
  g.beginPath(); g.arc(cx, cy, r, 0, 7);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
// 函數繪圖:任意 box、x/y 範圍
function plotMap(xmin, xmax, ymin, ymax, box) {
  const B = box || PLOT;
  return {
    X: (x) => B.x0 + (x - xmin) / (xmax - xmin) * (B.x1 - B.x0),
    Y: (y) => B.y1 - (y - ymin) / (ymax - ymin) * (B.y1 - B.y0),
    invX: (px) => xmin + (px - B.x0) / (B.x1 - B.x0) * (xmax - xmin),
    xmin, xmax, ymin, ymax, B,
  };
}
function plotAxes(m, xlabel) {
  const B = m.B;
  g.strokeStyle = TH.grid; g.lineWidth = 1;
  g.strokeRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0);
  g.strokeStyle = TH.axis; g.lineWidth = 1.5;
  if (m.ymin < 0 && m.ymax > 0) { const y0 = m.Y(0); g.beginPath(); g.moveTo(B.x0, y0); g.lineTo(B.x1, y0); g.stroke(); }
  if (m.xmin < 0 && m.xmax > 0) { const x0 = m.X(0); g.beginPath(); g.moveTo(x0, B.y0); g.lineTo(x0, B.y1); g.stroke(); }
  if (xlabel) pText((B.x0 + B.x1) / 2, B.y1 + 22, xlabel, TH.dim, 13, "center");
}
function plotFn(m, f, color, lw = 2.5) {
  g.strokeStyle = color; g.lineWidth = lw; g.beginPath();
  let pen = false;
  for (let px = m.B.x0; px <= m.B.x1; px += 1.5) {
    const y = f(m.invX(px));
    if (!isFinite(y) || y < m.ymin - 1 || y > m.ymax + 1) { pen = false; continue; }
    const py = m.Y(y);
    pen ? g.lineTo(px, py) : g.moveTo(px, py); pen = true;
  }
  g.stroke();
}

const PROB_LEVELS = [

/* ─── P1:機率密度 = 麵粉撒桌 ─── */
{
  id: "P1", short: "機率密度", title: "關 1|機率密度:單點是 0,面積才是機率", ep: "P1", subj: "prob",
  intro: `<p>連續變數(身高、等車時間)有個怪事:<b>「剛好等於某一個值」的機率是 0</b>——因為單一個點沒有寬度。有意義的問題是「落在<b>一段區間</b>裡」的機率,也就是密度曲線底下的<b>面積</b>。</p><p>拖動兩條門檻線 <span style="color:#38bdf8"><b>a</b></span>、<span style="color:#38bdf8"><b>b</b></span>,黃色面積就是 P(a &lt; X &lt; b)。把它框到 <b>0.5</b> 試試——那是「一半機率」的區間。</p>`,
  formal: `<p class="math">連續型 X 的密度函數 f(x) ≥ 0 且 ∫f = 1。P(a&lt;X&lt;b)=∫ₐᵇ f(x)dx。任意單點 P(X=c)=∫_c^c f=0,故 P(a≤X≤b)=P(a&lt;X&lt;b)。</p>`,
  goals: [{ id: "P1-half", text: "框出一段面積 ≈ 0.5 的區間(誤差 < 0.03)" }],
  state: { a: -0.6, b: 0.6 },
  pdf: (x) => gaussPDF(x, 0, 1.1),
  enter() { this.state.a = -0.6; this.state.b = 0.6; },
  map() { return densityMap(-4, 4, 0.40); },
  demo() { const s = this.state; return [
    { cap: "這條曲線是機率密度 f(x),整條底下面積 = 1", dur: 2400 },
    { cap: "問「X 剛好 = 0」?寬度 0 的線,面積 0——機率是 0", dur: 2600 },
    { num: [() => s.a, (v) => s.a = v, -1.1], dur: 100 },
    { num: [() => s.b, (v) => s.b = v, 1.1], cap: "改問一段區間:黃色面積才是機率", dur: 2000 },
    { num: [() => s.b, (v) => s.b = v, 0.7], cap: "區間越窄,面積(機率)越小", dur: 2000 },
    { num: [() => s.a, (v) => s.a = v, -0.6], num2: [() => s.b, (v) => s.b = v, 0.6], cap: "換你:拖兩條線,框出剛好一半的機率", dur: 1600 },
  ]; },
  draggables() {
    const s = this.state, m = this.map();
    const mk = (key) => ({
      getScreen: () => ({ x: m.X(s[key]), y: (PLOT.y0 + PLOT.y1) / 2 }),
      setScreen: (px) => { s[key] = Math.max(-4, Math.min(4, m.invX(px))); },
    });
    return [mk("a"), mk("b")];
  },
  draw() {
    const s = this.state, m = this.map(), pdf = this.pdf;
    let a = Math.min(s.a, s.b), b = Math.max(s.a, s.b);
    pAxes(-4, 4, m.ymax, "X(某個連續量,例如標準化身高)");
    fillUnder(m, pdf, a, b, PC.fill);
    drawCurve(m, pdf, PC.curve);
    for (const [key, lbl] of [["a", "a"], ["b", "b"]]) {
      const px = m.X(s[key]);
      g.strokeStyle = PC.prior; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(px, PLOT.y0 - 6); g.lineTo(px, PLOT.y1); g.stroke();
      g.fillStyle = PC.prior; g.beginPath(); g.arc(px, (PLOT.y0 + PLOT.y1) / 2, 8, 0, 7); g.fill();
      pText(px, PLOT.y0 - 12, lbl, PC.prior, 16, "center", true);
    }
    const P = integ(pdf, a, b);
    readout.innerHTML = `P(${fmt(a)} &lt; X &lt; ${fmt(b)}) = <b>${P.toFixed(3)}</b>${Math.abs(P - 0.5) < 0.03 ? "　<b style='color:#4ade80'>✓ 剛好一半!</b>" : ""}`;
    if (Math.abs(P - 0.5) < 0.03) markGoal("P1-half");
  },
},

/* ─── P2:正態分佈 μ、σ + 68-95-99.7 ─── */
{
  id: "P2", short: "正態分佈", title: "關 2|正態分佈:平均定位置,標準差定胖瘦", ep: "P2", subj: "prob",
  intro: `<p>大自然的預設鐘形曲線由兩個數字決定:<b>μ(平均)</b>把整條曲線<b>左右平移</b>,<b>σ(標準差)</b>決定它<b>多胖多瘦</b>。</p><p>拖滑桿感受一下,並注意三塊陰影:不論 μ、σ 怎麼變,<b>±1σ 內永遠約 68%、±2σ 約 95%、±3σ 約 99.7%</b>——這就是有名的經驗法則。</p>`,
  formal: `<p class="math">X~N(μ,σ²),f(x)=1/(σ√2π)·exp(−(x−μ)²/2σ²)。P(|X−μ|&lt;σ)≈0.6827、&lt;2σ≈0.9545、&lt;3σ≈0.9973,與 μ、σ 無關。</p>`,
  goals: [
    { id: "P2-narrow", text: "把 σ 調到 ≤ 0.6(尖瘦、集中)" },
    { id: "P2-shift", text: "把 μ 平移到 ≥ 1.5(整條移位)" },
  ],
  state: { mu: 0, sig: 1 },
  enter() { this.state.mu = 0; this.state.sig = 1; },
  map() { return densityMap(-5, 5, 1.05); },
  demo() { const s = this.state; return [
    { cap: "標準鐘形:μ=0 在正中間,σ=1", dur: 2200 },
    { num: [() => s.sig, (v) => s.sig = v, 0.5], cap: "σ 變小 → 又高又瘦,機率集中在中間", dur: 2200 },
    { num: [() => s.sig, (v) => s.sig = v, 1.8], cap: "σ 變大 → 又矮又胖,散得更開", dur: 2200 },
    { num: [() => s.sig, (v) => s.sig = v, 1], num2: [() => s.mu, (v) => s.mu = v, 2], cap: "μ 平移 → 整條曲線左右滑動,形狀不變", dur: 2200 },
    { cap: "三塊陰影 68/95/99.7% 永遠不變——換你玩", dur: 2200 },
    { num: [() => s.mu, (v) => s.mu = v, 0], dur: 1200 },
  ]; },
  controls(el) {
    const s = this.state;
    el.innerHTML = `
      <div class="row"><label>μ 平均</label><input type="range" id="pmu" min="-2.5" max="2.5" step="0.05" value="0"><span class="val" id="vmu">0</span></div>
      <div class="row"><label>σ 標準差</label><input type="range" id="psig" min="0.4" max="2" step="0.05" value="1"><span class="val" id="vsig">1</span></div>`;
    el.querySelector("#pmu").oninput = (e) => { s.mu = +e.target.value; el.querySelector("#vmu").textContent = fmt(s.mu); };
    el.querySelector("#psig").oninput = (e) => { s.sig = +e.target.value; el.querySelector("#vsig").textContent = fmt(s.sig); };
    this._sync = () => {
      el.querySelector("#pmu").value = s.mu; el.querySelector("#vmu").textContent = fmt(s.mu);
      el.querySelector("#psig").value = s.sig; el.querySelector("#vsig").textContent = fmt(s.sig);
    };
  },
  draw() {
    const s = this.state, m = densityMap(-5, 5, Math.max(0.42, gaussPDF(0, 0, s.sig)) * 1.15);
    const pdf = (x) => gaussPDF(x, s.mu, s.sig);
    pAxes(-5, 5, m.ymax, "X");
    fillUnder(m, pdf, s.mu - 3 * s.sig, s.mu + 3 * s.sig, "rgba(56,189,248,.14)");
    fillUnder(m, pdf, s.mu - 2 * s.sig, s.mu + 2 * s.sig, "rgba(56,189,248,.18)");
    fillUnder(m, pdf, s.mu - s.sig, s.mu + s.sig, PC.fill);
    drawCurve(m, pdf, PC.curve);
    // μ 中線
    g.strokeStyle = PC.post; g.lineWidth = 2; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(m.X(s.mu), PLOT.y0); g.lineTo(m.X(s.mu), PLOT.y1); g.stroke(); g.setLineDash([]);
    pText(m.X(s.mu), PLOT.y0 - 10, "μ", PC.post, 16, "center", true);
    pText(PLOT.x0 + 8, PLOT.y0 + 20, "±1σ ≈ 68%", PC.curve, 13);
    pText(PLOT.x0 + 8, PLOT.y0 + 40, "±2σ ≈ 95%　±3σ ≈ 99.7%", PC.dim, 13);
    readout.innerHTML = `μ = <b>${fmt(s.mu)}</b>　σ = <b>${fmt(s.sig)}</b>　±1σ 內機率 = ${(integ(pdf, s.mu - s.sig, s.mu + s.sig)).toFixed(3)}`;
    if (s.sig <= 0.6) markGoal("P2-narrow");
    if (s.mu >= 1.5) markGoal("P2-shift");
  },
},

/* ─── P3:健檢偽陽性 = 自然頻率方格 ─── */
{
  id: "P3", short: "健檢陽性", title: "關 3|健檢陽性 ≠ 生病:自然頻率破解盲點", ep: "P3", subj: "prob",
  intro: `<p>一個準確率 90% 的檢測,驗出陽性——你真的有病的機率是多少?直覺喊「90%」,但通常<b>遠低於此</b>。關鍵是<b>盛行率</b>:病本來就很罕見時,大量健康人貢獻的<b>偽陽性</b>會淹沒真陽性。</p><p>方塊代表 1000 人:左欄<span style="color:#ff5c7a">有病</span>、右欄<span style="color:#4ade80">健康</span>,亮起來的是<b>驗出陽性</b>的人。右邊 <b>PPV</b> = 陽性者裡真的有病的比例。拉動盛行率滑桿,看 PPV 怎麼崩。</p>`,
  formal: `<p class="math">PPV = P(病|陽) = (prev·sens) / (prev·sens + (1−prev)·fpr)。sens=敏感度、fpr=偽陽性率。prev→0 時 PPV→0,與檢測本身多準無關。這是貝氏定理的頻率版。</p>`,
  goals: [
    { id: "P3-low", text: "把盛行率調到 1%,看 PPV 掉到多低" },
    { id: "P3-high", text: "把盛行率調高到讓 PPV > 50%" },
  ],
  state: { prev: 0.1, sens: 0.9, fpr: 0.09 },
  enter() { this.state.prev = 0.1; },
  demo() { const s = this.state; return [
    { cap: "1000 人:左欄有病、右欄健康,亮=驗出陽性", dur: 2400 },
    { num: [() => s.prev, (v) => s.prev = v, 0.01], cap: "盛行率降到 1%:有病的人只剩一小條", dur: 2600 },
    { cap: "問題來了:健康人雖只 9% 偽陽,但基數超大", dur: 2400 },
    { cap: "結果陽性裡大多是「虛驚」——PPV 只有個位數 %", dur: 2600 },
    { num: [() => s.prev, (v) => s.prev = v, 0.3], cap: "把病調成常見(30%):真陽性追上,PPV 才高", dur: 2400 },
    { num: [() => s.prev, (v) => s.prev = v, 0.1], cap: "換你:先探 1%,再找出讓 PPV>50% 的盛行率", dur: 1600 },
  ]; },
  controls(el) {
    const s = this.state;
    el.innerHTML = `
      <div class="row"><label>盛行率</label><input type="range" id="pprev" min="0.005" max="0.5" step="0.005" value="0.1"><span class="val" id="vprev">10%</span></div>
      <div class="row" style="font-size:.82rem;color:var(--dim)">敏感度固定 90%、偽陽性率固定 9%</div>`;
    el.querySelector("#pprev").oninput = (e) => { s.prev = +e.target.value; el.querySelector("#vprev").textContent = (s.prev * 100).toFixed(1) + "%"; };
    this._sync = () => { el.querySelector("#pprev").value = s.prev; el.querySelector("#vprev").textContent = (s.prev * 100).toFixed(1) + "%"; };
  },
  draw() {
    const s = this.state;
    const X0 = 90, Y0 = 90, W = 380, H = 440;
    const sickW = W * s.prev;
    const truePos = s.prev * s.sens, falsePos = (1 - s.prev) * s.fpr;
    const ppv = truePos / (truePos + falsePos);
    // 有病欄
    g.fillStyle = "rgba(255,92,122,.18)"; g.fillRect(X0, Y0, sickW, H);
    g.fillStyle = PC.sick; g.fillRect(X0, Y0, sickW, H * s.sens); // 真陽性(上段亮)
    // 健康欄
    g.fillStyle = "rgba(74,222,128,.15)"; g.fillRect(X0 + sickW, Y0, W - sickW, H);
    g.fillStyle = PC.pos; g.fillRect(X0 + sickW, Y0, W - sickW, H * s.fpr); // 偽陽性(上段亮)
    g.strokeStyle = "#0a0e1a"; g.lineWidth = 2; g.strokeRect(X0, Y0, sickW, H); g.strokeRect(X0 + sickW, Y0, W - sickW, H);
    pText(X0 + sickW / 2, Y0 - 12, "有病", PC.sick, 13, "center", true);
    pText(X0 + sickW + (W - sickW) / 2, Y0 - 12, "健康", PC.well, 13, "center", true);
    pText(X0, Y0 + H + 22, `盛行率 ${(s.prev * 100).toFixed(1)}% · 亮色 = 檢測陽性`, PC.dim, 13);
    // 右側 PPV 讀數條
    const bx = X0 + W + 40, bw = 46, bh = H;
    g.fillStyle = "#1d2440"; g.fillRect(bx, Y0, bw, bh);
    g.fillStyle = PC.post; g.fillRect(bx, Y0 + bh * (1 - ppv), bw, bh * ppv);
    g.strokeStyle = PC.axis; g.strokeRect(bx, Y0, bw, bh);
    pText(bx + bw / 2, Y0 - 12, "PPV", PC.post, 13, "center", true);
    pText(bx + bw / 2, Y0 + bh * (1 - ppv) - 8, (ppv * 100).toFixed(0) + "%", PC.post, 16, "center", true);
    readout.innerHTML = `驗出陽性者中,真的有病 = <b>${(ppv * 100).toFixed(1)}%</b>　(每 1000 人:真陽 ${Math.round(truePos * 1000)}、偽陽 ${Math.round(falsePos * 1000)})`;
    if (Math.abs(s.prev - 0.01) < 0.006) markGoal("P3-low");
    if (ppv > 0.5) markGoal("P3-high");
  },
},

/* ─── P4:貝氏定理 = 先驗→後驗 ─── */
{
  id: "P4", short: "貝氏更新", title: "關 4|貝氏定理:證據一筆筆改寫你的信念", ep: "P4", subj: "prob",
  intro: `<p>貝氏定理是一台<b>信念更新機</b>:你帶著一個<b>先驗</b>機率進場,每看到一筆證據,就把它乘上證據的說服力,得到<b>後驗</b>——然後後驗變成下一輪的先驗,不斷疊加。</p><p>設好先驗(這個人患病的初始猜測),按「驗出陽性/陰性」餵證據,看藍色<span style="color:#38bdf8">信念條</span>怎麼跳。<b>連續幾次陽性</b>才會把信念推到高處——這正是醫生為何要複檢。</p>`,
  formal: `<p class="math">後驗 P(H|E)=P(E|H)P(H) / [P(E|H)P(H)+P(E|¬H)P(¬H)]。本關 P(+|病)=0.9、P(+|健)=0.09。每筆證據把當前後驗當新先驗代入,即序貫貝氏更新。</p>`,
  goals: [
    { id: "P4-up", text: "從低先驗連按陽性,把後驗推到 > 90%" },
    { id: "P4-down", text: "按一次陰性,看信念被拉回去" },
  ],
  state: { prior0: 0.1, p: 0.1, hist: [], sens: 0.9, fpr: 0.09 },
  enter() { this.state.prior0 = 0.1; this.state.p = 0.1; this.state.hist = []; },
  demo() { const s = this.state; return [
    { call: () => { s.prior0 = 0.1; s.p = 0.1; s.hist = []; }, cap: "先驗:這個人有 10% 機率患病", dur: 2200 },
    { call: () => { s.p = s.p * s.sens / (s.p * s.sens + (1 - s.p) * s.fpr); s.hist.push(1); }, cap: "驗出陽性一次 → 信念跳到約 53%", dur: 2400 },
    { call: () => { s.p = s.p * s.sens / (s.p * s.sens + (1 - s.p) * s.fpr); s.hist.push(1); }, cap: "再一次陽性 → 約 92%,複檢的威力", dur: 2400 },
    { call: () => { s.p = s.p * s.fpr / (s.p * s.fpr + (1 - s.p) * (1 - s.sens)); s.hist.push(0); }, cap: "但突然一次陰性 → 信念被大幅拉回", dur: 2600 },
    { call: () => { s.prior0 = 0.1; s.p = 0.1; s.hist = []; }, cap: "換你:調先驗,連按陽性衝上 90%", dur: 1800 },
  ]; },
  controls(el) {
    const s = this.state;
    el.innerHTML = `
      <div class="row"><label>先驗</label><input type="range" id="pri" min="0.01" max="0.9" step="0.01" value="0.1"><span class="val" id="vpri">10%</span></div>
      <div class="row">
        <button class="primary" id="bpos">驗出陽性 +</button>
        <button id="bneg">驗出陰性 −</button>
        <button id="brst">重設</button>
      </div>`;
    const setPrior = (v) => { s.prior0 = v; if (!s.hist.length) s.p = v; el.querySelector("#vpri").textContent = (v * 100).toFixed(0) + "%"; };
    el.querySelector("#pri").oninput = (e) => setPrior(+e.target.value);
    el.querySelector("#bpos").onclick = () => { s.p = s.p * s.sens / (s.p * s.sens + (1 - s.p) * s.fpr); s.hist.push(1); };
    el.querySelector("#bneg").onclick = () => { s.p = s.p * s.fpr / (s.p * s.fpr + (1 - s.p) * (1 - s.sens)); s.hist.push(0); };
    el.querySelector("#brst").onclick = () => { s.p = s.prior0; s.hist = []; };
    this._sync = () => { el.querySelector("#pri").value = s.prior0; el.querySelector("#vpri").textContent = (s.prior0 * 100).toFixed(0) + "%"; };
  },
  draw() {
    const s = this.state;
    const bx = 250, bw = 150, Y0 = 90, bh = 400;
    // 信念條
    g.fillStyle = "#1d2440"; g.fillRect(bx, Y0, bw, bh);
    g.fillStyle = PC.prior; g.fillRect(bx, Y0 + bh * (1 - s.p), bw, bh * s.p);
    g.strokeStyle = PC.axis; g.lineWidth = 1.5; g.strokeRect(bx, Y0, bw, bh);
    // 90% 目標線
    g.strokeStyle = "#4ade80"; g.setLineDash([6, 4]);
    g.beginPath(); g.moveTo(bx - 10, Y0 + bh * 0.1); g.lineTo(bx + bw + 10, Y0 + bh * 0.1); g.stroke(); g.setLineDash([]);
    pText(bx + bw + 16, Y0 + bh * 0.1 + 4, "90%", "#4ade80", 12);
    const pyTop = Y0 + bh * (1 - s.p);
    const labY = pyTop < Y0 + 30 ? pyTop + 26 : pyTop - 12; // 太高就把數字塞進條內
    pText(bx + bw / 2, labY, (s.p * 100).toFixed(1) + "%", pyTop < Y0 + 30 ? "#0a0e1a" : PC.prior, 22, "center", true);
    pText(bx + bw / 2, Y0 - 16, "當前信念(患病機率)", PC.dim, 13, "center");
    // 證據歷史
    let hx = bx, hy = Y0 + bh + 34;
    pText(bx, hy - 18, `證據序列(${s.hist.length} 筆):`, PC.dim, 13);
    s.hist.slice(-16).forEach((e, k) => {
      g.fillStyle = e ? PC.pos : PC.well;
      g.beginPath(); g.arc(hx + 14 + k * 22, hy + 6, 8, 0, 7); g.fill();
      pText(hx + 14 + k * 22, hy + 11, e ? "+" : "−", "#0a0e1a", 13, "center", true);
    });
    readout.innerHTML = `後驗 = <b>${(s.p * 100).toFixed(1)}%</b>${s.p > 0.9 ? "　<b style='color:#4ade80'>✓ 信念已高</b>" : ""}`;
    if (s.p > 0.9) markGoal("P4-up");
    if (s.hist.length && s.hist[s.hist.length - 1] === 0 && s.hist.slice(0, -1).some((e) => e === 1)) markGoal("P4-down");
  },
},

/* ─── P5:隨機變數與期望值 = 分布的重心 ─── */
{
  id: "P5", short: "期望值", title: "關 5|期望值:機率分布的「重心」", ep: "P5", subj: "prob",
  intro: `<p>隨機變數把「結果」對應成數字——擲一顆骰子,點數 1~6 就是它的取值。每個值有各自的機率(長條高度)。</p><p><b>期望值 E[X]</b> 不是「最常出現的值」,而是整條分布的<b>重心</b>:把長條想成秤上的砝碼,支點放在剛好平衡的位置。拖「灌鉛」滑桿讓骰子偏心,看重心(三角支點)怎麼滑動。</p>`,
  formal: `<p class="math">離散隨機變數 E[X] = Σ xₖ·P(X=xₖ)。它是機率加權的平均、分布的一階矩(質心)。公平骰 E[X] = (1+…+6)/6 = 3.5。</p>`,
  goals: [
    { id: "P5-high", text: "把骰子灌成高點偏重,讓 E[X] ≥ 4.5" },
    { id: "P5-low", text: "反過來偏重低點,讓 E[X] ≤ 2.5" },
  ],
  state: { bias: 0 },
  enter() { this.state.bias = 0; },
  probs() {
    const s = this.state, w = [], base = 3.5;
    for (let k = 1; k <= 6; k++) w.push(Math.exp(s.bias * (k - base)));
    const sum = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / sum);
  },
  demo() { const s = this.state; return [
    { cap: "公平骰:六根等高長條,重心(三角)在正中 3.5", dur: 2400 },
    { num: [() => s.bias, (v) => s.bias = v, 0.6], cap: "往高點灌鉛:右邊變重,重心右移", dur: 2200 },
    { num: [() => s.bias, (v) => s.bias = v, -0.6], cap: "往低點灌鉛:重心滑到左邊", dur: 2200 },
    { num: [() => s.bias, (v) => s.bias = v, 0], cap: "期望值 = 支點平衡處。換你推到兩端", dur: 1600 },
  ]; },
  controls(el) {
    const s = this.state;
    el.innerHTML = `<div class="row"><label>灌鉛</label><input type="range" id="pbias" min="-1" max="1" step="0.02" value="0"><span class="val" id="vbias">0</span></div>
      <div class="row" style="font-size:.82rem;color:var(--dim)">← 偏重低點　　偏重高點 →</div>`;
    el.querySelector("#pbias").oninput = (e) => { s.bias = +e.target.value; el.querySelector("#vbias").textContent = fmt(s.bias); };
    this._sync = () => { el.querySelector("#pbias").value = s.bias; el.querySelector("#vbias").textContent = fmt(s.bias); };
  },
  draw() {
    const p = this.probs();
    const X0 = 90, Y0 = 90, W = 460, H = 380, Ybase = Y0 + H;
    const maxP = Math.max(...p, 0.3), bw = W / 6;
    const E = p.reduce((a, pk, k) => a + (k + 1) * pk, 0);
    // 長條
    for (let k = 0; k < 6; k++) {
      const h = p[k] / maxP * H, x = X0 + k * bw;
      g.fillStyle = PC.fill2; g.fillRect(x + 6, Ybase - h, bw - 12, h);
      g.strokeStyle = PC.prior; g.lineWidth = 1.5; g.strokeRect(x + 6, Ybase - h, bw - 12, h);
      pText(x + bw / 2, Ybase + 22, String(k + 1), PC.dim, 15, "center");
      pText(x + bw / 2, Ybase - h - 8, (p[k] * 100).toFixed(0) + "%", PC.dim, 12, "center");
    }
    g.strokeStyle = PC.axis; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(X0, Ybase); g.lineTo(X0 + W, Ybase); g.stroke();
    // 重心三角支點
    const ex = X0 + (E - 0.5) * bw;
    g.fillStyle = PC.curve; g.beginPath();
    g.moveTo(ex, Ybase + 6); g.lineTo(ex - 12, Ybase + 30); g.lineTo(ex + 12, Ybase + 30); g.closePath(); g.fill();
    pText(ex, Ybase + 48, "E[X] = " + E.toFixed(2), PC.curve, 15, "center", true);
    readout.innerHTML = `期望值 E[X] = <b>${E.toFixed(3)}</b>　(公平骰為 3.5)`;
    if (E >= 4.5) markGoal("P5-high");
    if (E <= 2.5) markGoal("P5-low");
  },
},

/* ─── P6:大數法則 ─── */
{
  id: "P6", short: "大數法則", title: "關 6|大數法則:擲越多次,平均越靠近真值", ep: "P6", subj: "prob",
  intro: `<p>單次擲骰完全隨機,但把<b>累積平均</b>畫出來,會看到它一路晃動、然後<b>收斂</b>到期望值 3.5。前幾十次上下亂跳,幾百次後就黏在紅線附近——這就是大數法則。</p><p>按「擲 100 次」一批批餵資料,看藍線怎麼從劇烈震盪慢慢平靜下來。<b>注意:早期的偏離是正常的</b>,不是骰子壞了。</p>`,
  formal: `<p class="math">獨立同分布 X₁,…,Xₙ,樣本平均 X̄ₙ = (1/n)ΣXᵢ。大數法則:n→∞ 時 X̄ₙ → E[X](幾乎必然)。收斂速率 ~ 1/√n,故早期波動大。</p>`,
  goals: [
    { id: "P6-early", text: "先擲一小批(≥ 20 次),觀察早期劇烈震盪" },
    { id: "P6-converge", text: "累積 ≥ 500 次,看平均收斂到 3.5 附近" },
  ],
  state: { series: [], n: 0, sum: 0 },
  enter() { this.state.series = []; this.state.n = 0; this.state.sum = 0; },
  roll(k) {
    const s = this.state;
    for (let i = 0; i < k; i++) { s.sum += 1 + Math.floor(Math.random() * 6); s.n++; s.series.push(s.sum / s.n); }
  },
  demo() { const self = this; return [
    { call: () => self.enter(), cap: "從零開始,一批批擲公平骰", dur: 1400 },
    { call: () => self.roll(15), cap: "才 15 次:累積平均上下亂跳,離 3.5 很遠也正常", dur: 2600 },
    { call: () => self.roll(85), cap: "累積到 100 次:震盪明顯收斂", dur: 2400 },
    { call: () => self.roll(400), cap: "500 次:藍線幾乎黏在紅線 3.5 上", dur: 2600 },
    { call: () => self.enter(), cap: "換你:先擲一小批看亂跳,再狂擲到收斂", dur: 1600 },
  ]; },
  controls(el) {
    const self = this;
    el.innerHTML = `<div class="row">
        <button class="primary" id="r10">擲 10 次</button>
        <button id="r100">擲 100 次</button>
        <button id="rrst">重來</button>
      </div>`;
    el.querySelector("#r10").onclick = () => self.roll(10);
    el.querySelector("#r100").onclick = () => self.roll(100);
    el.querySelector("#rrst").onclick = () => self.enter();
  },
  draw() {
    const s = this.state;
    const X0 = 80, Y0 = 80, W = 500, H = 420, Yb = Y0 + H;
    const ymin = 1, ymax = 6;
    const Y = (v) => Yb - (v - ymin) / (ymax - ymin) * H;
    // 座標
    g.strokeStyle = PC.axis; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(X0, Y0); g.lineTo(X0, Yb); g.lineTo(X0 + W, Yb); g.stroke();
    for (let v = 1; v <= 6; v++) { pText(X0 - 10, Y(v) + 5, String(v), PC.dim, 12, "right"); g.strokeStyle = PC.grid; g.beginPath(); g.moveTo(X0, Y(v)); g.lineTo(X0 + W, Y(v)); g.stroke(); }
    // 3.5 目標線
    g.strokeStyle = PC.sick; g.setLineDash([6, 4]); g.lineWidth = 2;
    g.beginPath(); g.moveTo(X0, Y(3.5)); g.lineTo(X0 + W, Y(3.5)); g.stroke(); g.setLineDash([]);
    pText(X0 + W + 4, Y(3.5) + 4, "3.5", PC.sick, 12);
    // 累積平均曲線
    if (s.n > 1) {
      g.strokeStyle = PC.prior; g.lineWidth = 2.5; g.beginPath();
      for (let k = 0; k < s.series.length; k++) {
        const px = X0 + k / (s.n - 1) * W, py = Y(s.series[k]);
        k ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.stroke();
    }
    pText(X0, Y0 - 12, `已擲 ${s.n} 次`, PC.dim, 14);
    const cur = s.n ? s.series[s.n - 1] : 0;
    readout.innerHTML = `擲了 <b>${s.n}</b> 次　累積平均 = <b>${s.n ? cur.toFixed(3) : "—"}</b>${s.n >= 500 && Math.abs(cur - 3.5) < 0.15 ? "　<b style='color:#4ade80'>✓ 已收斂</b>" : ""}`;
    if (s.n >= 20) markGoal("P6-early");
    if (s.n >= 500 && Math.abs(cur - 3.5) < 0.2) markGoal("P6-converge");
  },
},

/* ─── P7:中心極限定理 ─── */
{
  id: "P7", short: "中心極限", title: "關 7|中心極限定理:多個相加,自動變鐘形", ep: "P7", subj: "prob",
  intro: `<p>一顆骰子的分布是<b>平的</b>(1~6 機率均等)。但把 <b>N 顆骰子的點數加起來</b>,分布會神奇地隆起成<b>鐘形</b>——而且 N 越大越像正態分佈,不管原本長什麼樣。</p><p>拖 N 滑桿。N = 1 是平的,N ≥ 8 幾乎就是完美鐘形。金色曲線是理論上對應的正態分佈,看它怎麼越貼越準。這就是為什麼常態分佈到處都是。</p>`,
  formal: `<p class="math">獨立同分布 X₁,…,X_N,和 S_N = ΣXᵢ。中心極限定理:(S_N − Nμ)/(σ√N) → N(0,1)。與 Xᵢ 原分布形狀無關,只要變異數有限。</p>`,
  goals: [
    { id: "P7-flat", text: "把 N 調到 1,確認單顆骰是平的(均勻)" },
    { id: "P7-bell", text: "把 N 調到 ≥ 8,看鐘形浮現" },
  ],
  state: { N: 1 },
  enter() { this.state.N = 1; },
  dist(N) { // N 顆骰和的分布(卷積)
    let d = [0, 1]; // index = 點數
    for (let n = 0; n < N; n++) {
      const nd = new Array(d.length + 6).fill(0);
      for (let i = 0; i < d.length; i++) if (d[i]) for (let f = 1; f <= 6; f++) nd[i + f] += d[i] / 6;
      d = nd;
    }
    return d;
  },
  demo() { const s = this.state; return [
    { num: [() => s.N, (v) => s.N = Math.round(v), 1], cap: "N = 1:單顆骰,分布完全平坦(均勻)", dur: 2200 },
    { num: [() => s.N, (v) => s.N = Math.round(v), 2], cap: "N = 2:兩顆相加,中間 7 最常見,出現三角形", dur: 2200 },
    { num: [() => s.N, (v) => s.N = Math.round(v), 5], cap: "N = 5:已經隆成鐘形", dur: 2000 },
    { num: [() => s.N, (v) => s.N = Math.round(v), 10], cap: "N = 10:幾乎完美貼合金色的正態曲線", dur: 2400 },
    { num: [() => s.N, (v) => s.N = Math.round(v), 1], cap: "換你:從 1 拉到 8+,看鐘形自己長出來", dur: 1600 },
  ]; },
  controls(el) {
    const s = this.state;
    el.innerHTML = `<div class="row"><label>N 骰數</label><input type="range" id="pN" min="1" max="12" step="1" value="1"><span class="val" id="vN">1</span></div>`;
    el.querySelector("#pN").oninput = (e) => { s.N = +e.target.value; el.querySelector("#vN").textContent = s.N; };
    this._sync = () => { el.querySelector("#pN").value = s.N; el.querySelector("#vN").textContent = s.N; };
  },
  draw() {
    const N = Math.max(1, Math.round(this.state.N));
    const d = this.dist(N), lo = N, hi = 6 * N;
    const X0 = 80, Y0 = 80, W = 500, H = 420, Yb = Y0 + H;
    let maxP = 0; for (let k = lo; k <= hi; k++) maxP = Math.max(maxP, d[k]);
    const span = hi - lo, bw = W / (span + 1);
    // 長條
    for (let k = lo; k <= hi; k++) {
      const h = d[k] / maxP * H, x = X0 + (k - lo) * bw;
      g.fillStyle = PC.fill2; g.fillRect(x + 1, Yb - h, Math.max(1, bw - 2), h);
    }
    g.strokeStyle = PC.axis; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(X0, Yb); g.lineTo(X0 + W, Yb); g.stroke();
    // 理論正態曲線
    const mu = 3.5 * N, sig = Math.sqrt(N * 35 / 12);
    g.strokeStyle = PC.curve; g.lineWidth = 3; g.beginPath();
    for (let px = 0; px <= W; px += 3) {
      const val = lo + px / W * span, pd = gaussPDF(val, mu, sig);
      const py = Yb - pd / (maxP) * H;
      px ? g.lineTo(X0 + px, py) : g.moveTo(X0 + px, py);
    }
    g.stroke();
    pText(X0, Y0 - 12, `${N} 顆骰的點數和(範圍 ${lo}–${hi})`, PC.dim, 14);
    pText(X0 + W, Y0 + 6, "金線 = 對應的正態分佈", PC.curve, 12, "right");
    readout.innerHTML = `N = <b>${N}</b>　和的平均 ${mu.toFixed(1)}、標準差 ${sig.toFixed(2)}${N === 1 ? "　(平坦=均勻)" : N >= 8 ? "　<b style='color:#4ade80'>✓ 鐘形</b>" : ""}`;
    if (N === 1) markGoal("P7-flat");
    if (N >= 8) markGoal("P7-bell");
  },
},

/* ─── P8:樣本空間與加法法則 ─── */
{
  id: "P8", short: "樣本空間", title: "關 8|樣本空間:機率就是「面積佔比」", ep: "P8", subj: "prob",
  intro: `<p>把所有可能結果想成一個<b>方框</b>(樣本空間),事件就是框裡的<b>區域</b>,機率 = 區域面積 ÷ 整框面積。拖動兩個圓 <span style="color:#fbbf24"><b>A</b></span>、<span style="color:#38bdf8"><b>B</b></span>。</p><p>把它們<b>拉開不重疊</b>,P(A∪B) = P(A)+P(B);讓它們<b>重疊</b>,就得扣掉算了兩次的交集:<b>P(A∪B) = P(A)+P(B)−P(A∩B)</b>。這就是加法法則(排容原理)。</p>`,
  formal: `<p class="math">機率公理:P(Ω)=1、P(A)≥0、互斥事件可加。加法法則 P(A∪B)=P(A)+P(B)−P(A∩B);互斥(A∩B=∅)時退化為 P(A)+P(B)。</p>`,
  goals: [
    { id: "P8-disjoint", text: "把 A、B 拉到完全不重疊(互斥)" },
    { id: "P8-overlap", text: "讓 A、B 明顯重疊,看聯集要扣掉交集" },
  ],
  state: { ax: 0.34, ay: 0.5, bx: 0.64, by: 0.5, rA: 0.19, rB: 0.22 },
  enter() { Object.assign(this.state, { ax: 0.34, ay: 0.5, bx: 0.64, by: 0.5 }); },
  box() { return { X: 130, Y: 90, S: 420 }; }, // 樣本空間方框(螢幕)
  demo() { const s = this.state; return [
    { cap: "方框 = 樣本空間,兩個圓是事件 A、B", dur: 2200 },
    { num: [() => s.ax, (v) => s.ax = v, 0.28], num2: [() => s.bx, (v) => s.bx = v, 0.72], cap: "拉開不重疊:P(A∪B) 剛好 = P(A)+P(B)", dur: 2400 },
    { num: [() => s.ax, (v) => s.ax = v, 0.42], num2: [() => s.bx, (v) => s.bx = v, 0.58], cap: "推到重疊:交集被算了兩次,要扣掉", dur: 2400 },
    { num: [() => s.ax, (v) => s.ax = v, 0.34], num2: [() => s.bx, (v) => s.bx = v, 0.64], cap: "換你:各做出一次互斥和重疊", dur: 1600 },
  ]; },
  draggables() {
    const s = this.state, bx = this.box();
    const mk = (kx, ky, r) => ({
      getScreen: () => ({ x: bx.X + s[kx] * bx.S, y: bx.Y + s[ky] * bx.S }),
      setScreen: (px, py) => {
        s[kx] = Math.max(r, Math.min(1 - r, (px - bx.X) / bx.S));
        s[ky] = Math.max(r, Math.min(1 - r, (py - bx.Y) / bx.S));
      },
    });
    return [mk("ax", "ay", s.rA), mk("bx", "by", s.rB)];
  },
  draw() {
    const s = this.state, B = this.box();
    g.fillStyle = "#0f1424"; g.fillRect(B.X, B.Y, B.S, B.S);
    g.strokeStyle = PC.axis; g.lineWidth = 2; g.strokeRect(B.X, B.Y, B.S, B.S);
    pText(B.X, B.Y - 10, "Ω 樣本空間(面積 = 1)", PC.dim, 13);
    const Ax = B.X + s.ax * B.S, Ay = B.Y + s.ay * B.S, rA = s.rA * B.S;
    const Bx = B.X + s.bx * B.S, By = B.Y + s.by * B.S, rB = s.rB * B.S;
    drawDisc(Ax, Ay, rA, "rgba(255,209,102,.32)", PC.curve, 2);
    drawDisc(Bx, By, rB, "rgba(56,189,248,.30)", PC.prior, 2);
    pText(Ax, Ay + 5, "A", PC.curve, 18, "center", true);
    pText(Bx, By + 5, "B", PC.prior, 18, "center", true);
    const PA = Math.PI * s.rA ** 2, PB = Math.PI * s.rB ** 2;
    const d = Math.hypot(s.ax - s.bx, s.ay - s.by);
    const inter = lensArea(d, s.rA, s.rB), uni = PA + PB - inter;
    pText(B.X + B.S + 20, B.Y + 30, `P(A) = ${PA.toFixed(3)}`, PC.curve, 15);
    pText(B.X + B.S + 20, B.Y + 58, `P(B) = ${PB.toFixed(3)}`, PC.prior, 15);
    pText(B.X + B.S + 20, B.Y + 86, `P(A∩B) = ${inter.toFixed(3)}`, PC.post, 15);
    pText(B.X + B.S + 20, B.Y + 118, `P(A∪B) = ${uni.toFixed(3)}`, PC.ink, 16, "left", true);
    readout.innerHTML = `P(A)+P(B) = ${(PA + PB).toFixed(3)}　−　交集 ${inter.toFixed(3)}　=　<b>聯集 ${uni.toFixed(3)}</b>`;
    if (d >= s.rA + s.rB) markGoal("P8-disjoint");
    if (inter > 0.25 * Math.min(PA, PB)) markGoal("P8-overlap");
  },
},

/* ─── P9:條件機率 = 把世界縮小到 B ─── */
{
  id: "P9", short: "條件機率", title: "關 9|條件機率:把世界縮小到 B 之內", ep: "P9", subj: "prob",
  intro: `<p>P(A | B) 唸作「已知 B 發生,A 的機率」。做法就是:把整個世界<b>縮小到 B 這個圈</b>裡,再看 A 佔了多少——<b>P(A|B) = P(A∩B) / P(B)</b>。</p><p>藍圈 <span style="color:#38bdf8"><b>B</b></span> 固定當「新世界」,框外變暗。拖金圈 <span style="color:#fbbf24"><b>A</b></span>:把 A <b>整個塞進 B</b>,和把 A <b>完全移出 B</b>(此時 P(A|B)=0),感受條件如何改寫機率。這也是貝氏定理的地基。</p>`,
  formal: `<p class="math">P(A|B) = P(A∩B)/P(B)(P(B)>0)。條件化 = 把樣本空間限制到 B 並重新歸一。獨立 ⇔ P(A|B)=P(A)。貝氏定理由此翻轉:P(B|A)=P(A|B)P(B)/P(A)。</p>`,
  goals: [
    { id: "P9-inside", text: "把 A 整個塞進 B 內(A ⊆ B)" },
    { id: "P9-outside", text: "把 A 完全移出 B,讓 P(A|B) = 0" },
  ],
  state: { ax: 0.3, ay: 0.38, bx: 0.6, by: 0.56, rA: 0.15, rB: 0.3 },
  enter() { this.state.ax = 0.3; this.state.ay = 0.38; },
  box() { return { X: 130, Y: 90, S: 420 }; },
  demo() { const s = this.state; return [
    { cap: "藍圈 B 是「新世界」,框外變暗", dur: 2000 },
    { num: [() => s.ax, (v) => s.ax = v, 0.6], num2: [() => s.ay, (v) => s.ay = v, 0.56], cap: "把 A 塞進 B 裡:A 的結果全落在新世界中", dur: 2400 },
    { num: [() => s.ax, (v) => s.ax = v, 0.18], num2: [() => s.ay, (v) => s.ay = v, 0.2], cap: "把 A 移出 B:在 B 的世界裡 A 不可能,P(A|B)=0", dur: 2600 },
    { num: [() => s.ax, (v) => s.ax = v, 0.3], num2: [() => s.ay, (v) => s.ay = v, 0.38], cap: "換你:各做一次「塞進去」和「移出來」", dur: 1600 },
  ]; },
  draggables() {
    const s = this.state, bx = this.box();
    return [{
      getScreen: () => ({ x: bx.X + s.ax * bx.S, y: bx.Y + s.ay * bx.S }),
      setScreen: (px, py) => {
        s.ax = Math.max(s.rA, Math.min(1 - s.rA, (px - bx.X) / bx.S));
        s.ay = Math.max(s.rA, Math.min(1 - s.rA, (py - bx.Y) / bx.S));
      },
    }];
  },
  draw() {
    const s = this.state, B = this.box();
    const Bx = B.X + s.bx * B.S, By = B.Y + s.by * B.S, rB = s.rB * B.S;
    const Ax = B.X + s.ax * B.S, Ay = B.Y + s.ay * B.S, rA = s.rA * B.S;
    // 暗底(B 外的世界被壓暗)
    g.fillStyle = "#0b0e1a"; g.fillRect(B.X, B.Y, B.S, B.S);
    g.strokeStyle = PC.axis; g.lineWidth = 2; g.strokeRect(B.X, B.Y, B.S, B.S);
    // B = 新世界(較亮)
    drawDisc(Bx, By, rB, "rgba(56,189,248,.20)", PC.prior, 2.5);
    // A∩B 用剪裁高亮
    g.save(); g.beginPath(); g.arc(Bx, By, rB, 0, 7); g.clip();
    drawDisc(Ax, Ay, rA, "rgba(255,209,102,.55)", null);
    g.restore();
    drawDisc(Ax, Ay, rA, null, PC.curve, 2);
    pText(Bx, By - rB - 8, "B(新世界)", PC.prior, 14, "center", true);
    pText(Ax, Ay + 5, "A", PC.curve, 16, "center", true);
    const PA = Math.PI * s.rA ** 2, PB = Math.PI * s.rB ** 2;
    const d = Math.hypot(s.ax - s.bx, s.ay - s.by);
    const inter = lensArea(d, s.rA, s.rB), cond = PB > 1e-9 ? inter / PB : 0;
    // P(A|B) 大數字 + 條
    const rx = B.X + B.S + 20, ry = B.Y + 40, rw = 120, rh = 260;
    pText(rx, ry - 14, "P(A|B)", PC.ink, 15, "left", true);
    g.fillStyle = "#1d2440"; g.fillRect(rx, ry, 40, rh);
    g.fillStyle = PC.curve; g.fillRect(rx, ry + rh * (1 - cond), 40, rh * cond);
    g.strokeStyle = PC.axis; g.strokeRect(rx, ry, 40, rh);
    pText(rx + 52, ry + rh / 2, (cond * 100).toFixed(0) + "%", PC.curve, 26, "left", true);
    pText(rx, ry + rh + 24, `= P(A∩B)/P(B)`, PC.dim, 13);
    pText(rx, ry + rh + 44, `= ${inter.toFixed(3)}/${PB.toFixed(3)}`, PC.dim, 13);
    const inside = d + s.rA <= s.rB + 0.005, outside = d >= s.rA + s.rB;
    readout.innerHTML = `P(A|B) = <b>${(cond * 100).toFixed(1)}%</b>${inside ? "　<b style='color:#4ade80'>A ⊆ B</b>" : outside ? "　<b style='color:#4ade80'>P(A|B)=0</b>" : ""}`;
    if (inside) markGoal("P9-inside");
    if (outside) markGoal("P9-outside");
  },
},
];

/* ═══════════════════════════════════════════════════════════
   微積分模組 — 函數繪圖(螢幕座標)
   ═══════════════════════════════════════════════════════════ */
const CALC_LEVELS = [

/* ─── C1:極限與夾擠 ─── */
{
  id: "C1", short: "極限夾擠", title: "關 1|極限:算不出來,就用兩邊「夾」", ep: "C1", subj: "calc",
  intro: `<p>函數 <b>sin(x)/x</b> 在 x = 0 是 0/0——直接代<b>算不出來</b>,那裡是個「洞」。但它附近的值明明趨近某個數。怎麼確定?用<b>夾擠</b>:找兩條會合的函數把它夾住。</p><p>這裡 <b>cos(x) ≤ sin(x)/x ≤ 1</b>。拖滑桿讓探針 x → 0,看上下界都逼近 <b>1</b>,中間的它<b>逃不掉</b>,極限就是 1。再把探針拖到正中央 x = 0,確認函數在該點<b>沒有定義</b>(洞),但極限存在。</p>`,
  formal: `<p class="math">夾擠定理:若 g(x) ≤ f(x) ≤ h(x) 且 lim g = lim h = L,則 lim f = L。由 cos x ≤ sin x / x ≤ 1 且 cos x → 1,得 lim_{x→0} sin x / x = 1。函數在 0 未定義不影響極限。</p>`,
  goals: [
    { id: "C1-near", text: "把探針拖到 |x| < 0.15,看三線都夾到 1" },
    { id: "C1-hole", text: "把探針移到 x = 0,發現函數在該點是「洞」" },
  ],
  state: { x0: 2.2 },
  f: (x) => Math.abs(x) < 1e-9 ? NaN : Math.sin(x) / x,
  enter() { this.state.x0 = 2.2; },
  map() { return plotMap(-Math.PI, Math.PI, -0.4, 1.25); },
  demo() { const s = this.state; return [
    { cap: "藍線 sin(x)/x,上界 1、下界 cos(x) 把它夾在中間", dur: 2600 },
    { num: [() => s.x0, (v) => s.x0 = v, 0.1], cap: "探針 x → 0:上下界一起收斂到 1", dur: 2600 },
    { cap: "中間的 sin(x)/x 被夾住,極限 = 1", dur: 2200 },
    { num: [() => s.x0, (v) => s.x0 = v, 0], cap: "但 x = 0 本身是個洞:函數沒定義", dur: 2400 },
    { num: [() => s.x0, (v) => s.x0 = v, 2.2], cap: "換你:拖近 0 看夾擠,再停在 0 看洞", dur: 1600 },
  ]; },
  controls(el) {
    const s = this.state;
    el.innerHTML = `<div class="row"><label>探針 x</label><input type="range" id="cx" min="-3.14" max="3.14" step="0.01" value="2.2"><span class="val" id="vcx">2.2</span></div>`;
    el.querySelector("#cx").oninput = (e) => { s.x0 = +e.target.value; el.querySelector("#vcx").textContent = fmt(s.x0); };
    this._sync = () => { el.querySelector("#cx").value = s.x0; el.querySelector("#vcx").textContent = fmt(s.x0); };
  },
  draw() {
    const s = this.state, m = this.map();
    plotAxes(m, "x");
    plotFn(m, (x) => Math.cos(x), "#4ade80", 2);          // 下界
    plotFn(m, () => 1, "#38bdf8", 2);                      // 上界
    plotFn(m, this.f, "#ffd166", 3);                       // sin(x)/x
    pText(m.X(2.2), m.Y(Math.cos(2.2)) + 18, "cos x", "#4ade80", 12, "center");
    pText(m.B.x0 + 40, m.Y(1) - 8, "y = 1", "#38bdf8", 12);
    // 洞 at x=0
    drawDisc(m.X(0), m.Y(1), 5, TH.bg, "#ffd166", 2);
    // 探針
    const px = m.X(s.x0), fv = this.f(s.x0);
    g.strokeStyle = PC.post; g.lineWidth = 2; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(px, m.B.y0); g.lineTo(px, m.B.y1); g.stroke(); g.setLineDash([]);
    if (isFinite(fv)) drawDisc(px, m.Y(fv), 6, PC.post, null);
    const near = Math.abs(s.x0) < 0.15;
    readout.innerHTML = Math.abs(s.x0) < 1e-6
      ? `x = 0:sin(x)/x = 0/0 <b style="color:#ffd166">未定義(洞)</b>,但極限 = 1`
      : `x = ${fmt(s.x0)}　cos x = ${fmt(Math.cos(s.x0))} ≤ <b>sin x/x = ${fmt(fv)}</b> ≤ 1${near ? "　<b style='color:#4ade80'>夾到 1!</b>" : ""}`;
    if (near) markGoal("C1-near");
    if (Math.abs(s.x0) < 1e-6) markGoal("C1-hole");
  },
},

/* ─── C2:導數 = 割線趨近切線 ─── */
{
  id: "C2", short: "導數斜率", title: "關 2|導數:割線縮成切線,斜率就是瞬間變化", ep: "C2", subj: "calc",
  intro: `<p>平均變化率是<b>割線</b>的斜率:取 x 和 x+h 兩點連線。把間距 <b>h 縮到 0</b>,割線就轉成<b>切線</b>,它的斜率就是<b>導數 f′(x)</b>——那一瞬間的變化率。</p><p>拖 x 選位置,調滑桿讓 h → 0,看割線(紫)貼合切線、斜率讀數趨近 f′(x)。再把 x 移到曲線的<b>山頂或谷底</b>,那裡斜率 = 0。</p>`,
  formal: `<p class="math">f′(x) = lim_{h→0} [f(x+h) − f(x)] / h。此處 f(x) = 0.15x³ − 0.6x,f′(x) = 0.45x² − 0.6,零點 x = ±√(4/3) ≈ ±1.15(極值處切線水平)。</p>`,
  goals: [
    { id: "C2-shrink", text: "把 h 調到 < 0.15,割線幾乎變成切線" },
    { id: "C2-flat", text: "把 x 移到極值處,讓切線斜率 ≈ 0" },
  ],
  state: { px: -2, h: 1.4 },
  f: (x) => 0.15 * x ** 3 - 0.6 * x,
  df: (x) => 0.45 * x * x - 0.6,
  enter() { this.state.px = -2; this.state.h = 1.4; },
  map() { return plotMap(-3, 3, -1.8, 1.8); },
  demo() { const s = this.state; return [
    { cap: "紫色是割線:連 x 與 x+h 兩點", dur: 2200 },
    { num: [() => s.h, (v) => s.h = v, 0.08], cap: "h → 0:割線轉成切線,斜率 → 導數", dur: 2600 },
    { num: [() => s.px, (v) => s.px = v, -1.15], cap: "移到山頂:切線水平,斜率 = 0", dur: 2400 },
    { num: [() => s.px, (v) => s.px = v, 1.15], cap: "移到谷底:斜率也是 0", dur: 2200 },
    { num: [() => s.px, (v) => s.px = v, -2], num2: [() => s.h, (v) => s.h = v, 1.4], cap: "換你:縮 h 成切線,再找斜率=0 的點", dur: 1600 },
  ]; },
  draggables() {
    const s = this.state, m = this.map();
    return [{
      getScreen: () => ({ x: m.X(s.px), y: m.B.y1 - 6 }), // x 軸上的握把,好抓
      setScreen: (px) => { s.px = Math.max(-2.8, Math.min(2.8, m.invX(px))); },
    }];
  },
  controls(el) {
    const s = this.state;
    el.innerHTML = `<div class="row"><label>間距 h</label><input type="range" id="ch" min="0.02" max="2" step="0.02" value="1.4"><span class="val" id="vch">1.4</span></div>
      <div class="row" style="font-size:.82rem;color:var(--dim)">拖 x 軸上的 ▲ 握把移動 x</div>`;
    el.querySelector("#ch").oninput = (e) => { s.h = +e.target.value; el.querySelector("#vch").textContent = fmt(s.h); };
    this._sync = () => { el.querySelector("#ch").value = s.h; el.querySelector("#vch").textContent = fmt(s.h); };
  },
  draw() {
    const s = this.state, m = this.map(), f = this.f;
    plotAxes(m, "x");
    plotFn(m, f, "#ffd166", 3);
    const x1 = s.px, x2 = s.px + s.h, y1 = f(x1), y2 = f(x2);
    const sec = (y2 - y1) / s.h;
    // 割線(延伸)
    g.strokeStyle = PC.post; g.lineWidth = 2.5; g.beginPath();
    g.moveTo(m.B.x0, m.Y(y1 + sec * (m.invX(m.B.x0) - x1)));
    g.lineTo(m.B.x1, m.Y(y1 + sec * (m.invX(m.B.x1) - x1))); g.stroke();
    drawDisc(m.X(x1), m.Y(y1), 6, "#ffd166", null);
    drawDisc(m.X(x2), m.Y(y2), 5, PC.post, null);
    // x 軸握把
    const hx = m.X(x1);
    g.fillStyle = "#ffd166"; g.beginPath();
    g.moveTo(hx, m.B.y1 - 12); g.lineTo(hx - 8, m.B.y1 + 2); g.lineTo(hx + 8, m.B.y1 + 2); g.closePath(); g.fill();
    const der = this.df(x1);
    readout.innerHTML = `割線斜率 = <b>${fmt(sec)}</b>　→　導數 f′(${fmt(x1)}) = <b>${fmt(der)}</b>${Math.abs(der) < 0.06 ? "　<b style='color:#4ade80'>切線水平!</b>" : ""}`;
    if (s.h < 0.15) markGoal("C2-shrink");
    if (Math.abs(der) < 0.06) markGoal("C2-flat");
  },
},

/* ─── C3:積分 = 黎曼和逼近面積 ─── */
{
  id: "C3", short: "積分面積", title: "關 3|積分:用長方形一格格逼近面積", ep: "C3", subj: "calc",
  intro: `<p>曲線下的<b>面積</b>怎麼算?先用<b>長方形</b>把它切成一格格加起來(黎曼和)。格子少時很粗糙,誤差大;把格子<b>切得越細</b>,長方形總面積就越貼近真正的面積——那個極限就是<b>定積分</b>。</p><p>拖滑桿加格數 N,看藍色長方形逐漸填滿曲線下方,黎曼和逼近真實值。</p>`,
  formal: `<p class="math">∫ₐᵇ f(x)dx = lim_{N→∞} Σ f(xᵢ*)·Δx,Δx = (b−a)/N。長方形和隨 N→∞ 收斂到曲線下有向面積。此為積分的定義。</p>`,
  goals: [
    { id: "C3-coarse", text: "把 N 調到 ≤ 4,看粗糙長方形的明顯誤差" },
    { id: "C3-fine", text: "把 N 調到 ≥ 40,黎曼和逼近真實面積" },
  ],
  state: { N: 4 },
  f: (x) => 1.4 * Math.exp(-((x - 1.5) ** 2) / 1.3) + 0.3,
  enter() { this.state.N = 4; },
  map() { return plotMap(0, 3, 0, 2, { x0: 80, y0: 80, x1: 600, y1: 540 }); },
  exact() { return integ(this.f, 0, 3); },
  riemann(N) { let s = 0; const h = 3 / N; for (let k = 0; k < N; k++) s += this.f((k + 0.5) * h) * h; return s; },
  demo() { const s = this.state; return [
    { num: [() => s.N, (v) => s.N = Math.round(v), 3], cap: "只有 3 格:長方形和曲線差很多", dur: 2400 },
    { num: [() => s.N, (v) => s.N = Math.round(v), 10], cap: "10 格:誤差變小", dur: 2000 },
    { num: [() => s.N, (v) => s.N = Math.round(v), 60], cap: "60 格:幾乎填滿,黎曼和 ≈ 真實面積", dur: 2600 },
    { num: [() => s.N, (v) => s.N = Math.round(v), 4], cap: "換你:從粗到細,看和收斂", dur: 1600 },
  ]; },
  controls(el) {
    const s = this.state;
    el.innerHTML = `<div class="row"><label>格數 N</label><input type="range" id="cn" min="1" max="80" step="1" value="4"><span class="val" id="vcn">4</span></div>`;
    el.querySelector("#cn").oninput = (e) => { s.N = +e.target.value; el.querySelector("#vcn").textContent = s.N; };
    this._sync = () => { el.querySelector("#cn").value = s.N; el.querySelector("#vcn").textContent = s.N; };
  },
  draw() {
    const N = Math.max(1, Math.round(this.state.N)), m = this.map(), f = this.f, h = 3 / N;
    // 長方形
    for (let k = 0; k < N; k++) {
      const xm = (k + 0.5) * h, yv = f(xm);
      const xL = m.X(k * h), xR = m.X((k + 1) * h), yT = m.Y(yv), yB = m.Y(0);
      g.fillStyle = "rgba(56,189,248,.30)"; g.fillRect(xL, yT, xR - xL, yB - yT);
      g.strokeStyle = PC.prior; g.lineWidth = 1; g.strokeRect(xL, yT, xR - xL, yB - yT);
    }
    plotAxes(m, "x");
    plotFn(m, f, "#ffd166", 3);
    const approx = this.riemann(N), exact = this.exact();
    readout.innerHTML = `N = <b>${N}</b>　黎曼和 = <b>${approx.toFixed(3)}</b>　真實面積 ≈ ${exact.toFixed(3)}　誤差 ${Math.abs(approx - exact).toFixed(3)}`;
    if (N <= 4) markGoal("C3-coarse");
    if (N >= 40) markGoal("C3-fine");
  },
},

/* ─── C4:微積分基本定理 ─── */
{
  id: "C4", short: "基本定理", title: "關 4|基本定理:面積的變化率,就是原函數", ep: "C4", subj: "calc",
  intro: `<p>把「從 0 累積到 x 的面積」看成一個新函數 <b>A(x)</b>(下圖)。微積分基本定理說:<b>A′(x) = f(x)</b>——面積函數的<b>斜率</b>,剛好等於上圖曲線在該處的<b>高度</b>。微分和積分,是同一件事的兩面。</p><p>拖動 x。f 高的地方(上圖),A 爬得陡(下圖);f 碰到 <b>0</b> 的地方,A 暫時<b>走平</b>(斜率 0)。</p>`,
  formal: `<p class="math">微積分基本定理:若 A(x) = ∫ₐˣ f(t)dt,則 A′(x) = f(x)。故 ∫ₐᵇ f = A(b) − A(a)。累積量的瞬間變化率 = 被積函數本身。</p>`,
  goals: [
    { id: "C4-peak", text: "把 x 移到 f 最高處,看 A 爬得最陡" },
    { id: "C4-zero", text: "把 x 移到 f = 0 處,看 A 暫時走平" },
  ],
  state: { x0: 1.2 },
  f: (x) => 1 + Math.sin(x),
  A: (x) => x + 1 - Math.cos(x),       // ∫₀ˣ(1+sin) = x + 1 − cos x
  enter() { this.state.x0 = 1.2; },
  mTop() { return plotMap(0, 2 * Math.PI, 0, 2.2, { x0: 80, y0: 60, x1: 600, y1: 300 }); },
  mBot() { return plotMap(0, 2 * Math.PI, 0, 8, { x0: 80, y0: 350, x1: 600, y1: 590 }); },
  demo() { const s = this.state; return [
    { cap: "上圖 f(x)=1+sin x,下圖 A(x)=從 0 累積的面積", dur: 2600 },
    { num: [() => s.x0, (v) => s.x0 = v, Math.PI / 2], cap: "x 到 f 的最高點:A 在這裡爬得最陡", dur: 2600 },
    { num: [() => s.x0, (v) => s.x0 = v, 3 * Math.PI / 2], cap: "x 到 f = 0 處:A 的斜率變 0,暫時走平", dur: 2600 },
    { num: [() => s.x0, (v) => s.x0 = v, 1.2], cap: "A′(x) = f(x)。換你拖拖看", dur: 1600 },
  ]; },
  draggables() {
    const s = this.state, m = this.mTop();
    return [{
      getScreen: () => ({ x: m.X(s.x0), y: m.B.y1 - 6 }), // 頂圖 x 軸握把
      setScreen: (px) => { s.x0 = Math.max(0, Math.min(2 * Math.PI, m.invX(px))); },
    }];
  },
  draw() {
    const s = this.state, mt = this.mTop(), mb = this.mBot(), f = this.f, A = this.A;
    // 上:f + 到 x 的陰影面積
    g.fillStyle = "rgba(255,209,102,.22)"; g.beginPath();
    g.moveTo(mt.X(0), mt.Y(0));
    for (let px = mt.B.x0; px <= mt.X(s.x0); px += 2) g.lineTo(px, mt.Y(f(mt.invX(px))));
    g.lineTo(mt.X(s.x0), mt.Y(0)); g.closePath(); g.fill();
    plotAxes(mt, "");
    plotFn(mt, f, "#ffd166", 3);
    pText(mt.B.x0 + 4, mt.B.y0 + 16, "f(x)", "#ffd166", 13);
    // 下:A(x) + 當前點切線斜率
    plotAxes(mb, "x");
    plotFn(mb, A, "#38bdf8", 3);
    pText(mb.B.x0 + 4, mb.B.y0 + 16, "A(x) = 累積面積", "#38bdf8", 13);
    const slope = f(s.x0), ay = A(s.x0);
    // A 上的切線(斜率 = f(x0)),下圖 y 尺度不同需換算像素斜率
    const kx = (mb.B.x1 - mb.B.x0) / (mb.xmax - mb.xmin), ky = (mb.B.y1 - mb.B.y0) / (mb.ymax - mb.ymin);
    const pxSlope = -slope * ky / kx; // 像素空間的切線斜率(dpy/dpx)
    const cx = mb.X(s.x0), cy = mb.Y(ay), L = 70;
    g.strokeStyle = PC.post; g.lineWidth = 2.5; g.beginPath();
    g.moveTo(cx - L, cy - pxSlope * L);
    g.lineTo(cx + L, cy + pxSlope * L);
    g.stroke();
    drawDisc(cx, cy, 6, PC.post, null);
    // 探針垂直線貫穿兩圖
    g.strokeStyle = TH.demoAxis; g.lineWidth = 1.5; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(mt.X(s.x0), mt.B.y0); g.lineTo(mt.X(s.x0), mt.B.y1); g.stroke();
    drawDisc(mt.X(s.x0), mt.Y(f(s.x0)), 6, "#ffd166", null);
    g.setLineDash([]);
    // 頂圖 x 軸握把
    const hx = mt.X(s.x0);
    g.fillStyle = "#ffd166"; g.beginPath();
    g.moveTo(hx, mt.B.y1 - 12); g.lineTo(hx - 8, mt.B.y1 + 2); g.lineTo(hx + 8, mt.B.y1 + 2); g.closePath(); g.fill();
    readout.innerHTML = `x = ${fmt(s.x0)}　f(x) = <b>${fmt(slope)}</b> = A 的斜率　A(x) = ${fmt(ay)}${slope < 0.06 ? "　<b style='color:#4ade80'>A 走平</b>" : slope > 1.94 ? "　<b style='color:#4ade80'>A 最陡</b>" : ""}`;
    if (slope > 1.94) markGoal("C4-peak");
    if (slope < 0.06) markGoal("C4-zero");
  },
},
];

/* ---------- 科目 ---------- */
const SUBJECTS = {
  la: { name: "線性代數", levels: LA_LEVELS },
  prob: { name: "機率與統計", levels: PROB_LEVELS },
  calc: { name: "微積分", levels: CALC_LEVELS },
};
let curSubject = "la";

/* ---------- UI 骨架 ---------- */
const tabsEl = document.getElementById("tabs");
const subjEl = document.getElementById("subjects");
let levels = LA_LEVELS;
let curIdx = 0;
const cur = () => levels[curIdx];

function levelDone(lv) { return lv.goals.every((gl) => progress[gl.id]); }
function subjectDone(key) { return SUBJECTS[key].levels.every(levelDone); }
function allLevels() { return Object.values(SUBJECTS).flatMap((s) => s.levels); }

const overallEl = document.getElementById("overall");
const certEl = document.getElementById("cert");
function renderOverall() {
  const all = allLevels(), done = all.filter(levelDone).length;
  overallEl.textContent = `　🎓 總進度 ${done}/${all.length}`;
}
function updateCert() {
  const allDone = Object.keys(SUBJECTS).every(subjectDone);
  const key = curSubject, sub = SUBJECTS[key];
  const date = new Date().toISOString().slice(0, 10);
  if (allDone) {
    certEl.className = "show";
    certEl.innerHTML = `<div class="big">🏆 全通關!三科 ${allLevels().length} 關全部完成</div><div class="sub">數感實驗室 · ${date} · 截圖留念吧</div>`;
  } else if (subjectDone(key)) {
    certEl.className = "show";
    certEl.innerHTML = `<div class="big">🎓 恭喜完成【${sub.name}】${sub.levels.length} 關!</div><div class="sub">數感實驗室 · ${date} · 換個科目繼續?</div>`;
  } else {
    certEl.className = "";
    certEl.innerHTML = "";
  }
}

function renderSubjects() {
  subjEl.innerHTML = "";
  for (const [key, sub] of Object.entries(SUBJECTS)) {
    const b = document.createElement("button");
    const done = sub.levels.filter(levelDone).length;
    b.textContent = `${sub.name} (${done}/${sub.levels.length})`;
    b.className = key === curSubject ? "active" : "";
    b.onclick = () => switchSubject(key);
    subjEl.appendChild(b);
  }
}

function switchSubject(key) {
  if (key === curSubject && levels === SUBJECTS[key].levels) return;
  player.cancel();
  curSubject = key;
  levels = SUBJECTS[key].levels;
  renderSubjects();
  switchLevel(0);
}

function renderTabs() {
  tabsEl.innerHTML = "";
  levels.forEach((lv, k) => {
    const b = document.createElement("button");
    b.textContent = `${k + 1}. ${lv.short}`;
    b.className = (k === curIdx ? "active " : "") + (levelDone(lv) ? "done" : "");
    b.onclick = () => switchLevel(k);
    tabsEl.appendChild(b);
  });
}

function renderGoals() {
  const el = document.getElementById("lv-goals");
  el.innerHTML = "";
  cur().goals.forEach((gl) => {
    const d = document.createElement("div");
    d.className = "goal" + (progress[gl.id] ? " done" : "");
    d.innerHTML = `<span class="box">${progress[gl.id] ? "✓" : "○"}</span>${gl.text}`;
    el.appendChild(d);
  });
}

function switchLevel(k) {
  player.cancel();
  curIdx = k;
  const lv = cur();
  document.getElementById("lv-title").textContent = lv.title;
  const ep = document.getElementById("lv-ep");
  ep.textContent = EP[lv.ep][0]; ep.href = EP[lv.ep][1];
  document.getElementById("lv-intro").innerHTML = lv.intro;
  document.getElementById("lv-formal-body").innerHTML = lv.formal;
  document.getElementById("lv-formal").open = false;
  const ctl = document.getElementById("lv-controls");
  ctl.innerHTML = "";
  lv._sync = null;
  lv.enter && lv.enter();
  lv.controls && lv.controls(ctl);
  renderGoals(); renderTabs(); renderSubjects(); renderOverall(); updateCert();
  // 第一次進入且尚未通關 → 自動播示範
  if (lv.demo && !demoSeen[lv.id] && !levelDone(lv)) {
    demoSeen[lv.id] = true;
    localStorage.setItem("lalab-demoseen", JSON.stringify(demoSeen));
    player.start(lv.demo());
  }
}

demoBtnEl.onclick = () => {
  if (player.active) player.stop();
  else if (cur().demo) player.start(cur().demo());
};

function frame() {
  player.update();
  clear();
  cur().draw();
  requestAnimationFrame(frame);
}

// 主題初始化 + 切換鈕
applyTheme(themeName);
const themeBtn = document.getElementById("theme-btn");
themeBtn.textContent = themeName === "light" ? "☀️" : "🌙";
themeBtn.onclick = () => {
  applyTheme(themeName === "light" ? "dark" : "light");
  themeBtn.textContent = themeName === "light" ? "☀️" : "🌙";
};

// 旁白語音開關
const voiceBtn = document.getElementById("voice-btn");
function syncVoiceBtn() { voiceBtn.textContent = voiceOn ? "🔊" : "🔇"; voiceBtn.classList.toggle("on", voiceOn); }
syncVoiceBtn();
voiceBtn.onclick = () => {
  voiceOn = !voiceOn;
  localStorage.setItem("lalab-voice", voiceOn ? "1" : "0");
  syncVoiceBtn();
  if (!voiceOn) { stopVoice(); player.clipWaiting = false; }
  else { getAudioEl(); if (player.active) player.playClip(player.steps[player.idx]); } // 開啟時解鎖音訊+補播當前句
};

renderSubjects();
switchLevel(0);
frame();
