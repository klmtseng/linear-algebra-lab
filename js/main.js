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

function clear() { g.clearRect(0, 0, canvas.width, canvas.height); }

function drawGrid(m, opt = {}) {
  const N = 9;
  if (opt.original !== false) { // 原始格線(淡)
    g.strokeStyle = COL.gridFaint; g.lineWidth = 1;
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
    g.strokeStyle = isAxis ? (player.active ? "#39456e" : COL.axis)
                           : (player.active ? "#212a4b" : COL.grid);
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
  renderGoals(); renderTabs();
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
  let best = null, bestD = 26;
  for (const d of dl) {
    const s = toScr(d.get());
    const dist = Math.hypot(s.x - p.x, s.y - p.y);
    if (dist < bestD) { bestD = dist; best = d; }
  }
  if (best) { dragTarget = best; canvas.setPointerCapture(ev.pointerId); }
});
canvas.addEventListener("pointermove", (ev) => {
  if (!dragTarget) return;
  const p = canvasPos(ev);
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

const player = {
  active: false, steps: [], idx: -1, t0: 0, dur: 0, apply: null, _hideT: 0,
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
    if (st.num) {
      const [get, set, to] = st.num, from = get();
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
  },
  update() {
    if (!this.active) return;
    const t = Math.min(1, (performance.now() - this.t0) / this.dur);
    this.apply && this.apply(ease(t));
    cur()._sync && cur()._sync();
    if (t >= 1) this.next();
  },
  cancel() {
    this.active = false; this.apply = null;
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
};
const readout = document.getElementById("readout");

const levels = [

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
];

/* ---------- UI 骨架 ---------- */
const tabsEl = document.getElementById("tabs");
let curIdx = 0;
const cur = () => levels[curIdx];

function levelDone(lv) { return lv.goals.every((gl) => progress[gl.id]); }

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
  renderGoals(); renderTabs();
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

switchLevel(0);
frame();
