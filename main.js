// 原宿サウンドマップ
// sounds.json に書かれたピンを地図上に配置し、タップでループ再生をオン/オフする。
// 「編集」モードではピンをドラッグして動かし、空白をタップすると新規ピンを追加できる。
// 配置結果は「JSON書き出し」で sounds.json として保存できる。

const mapWrap = document.getElementById("map-wrap");
const pinsEl = document.getElementById("pins");
const statusEl = document.getElementById("status");
const editBtn = document.getElementById("edit-btn");
const exportBtn = document.getElementById("export-btn");
const stopAllBtn = document.getElementById("stop-all-btn");
const overlay = document.getElementById("start-overlay");
const startBtn = document.getElementById("start-btn");

let ctx = null;              // AudioContext（START で生成）
let pins = [];               // { id, title, creator, label, file, x, y, gain }
const buffers = new Map();   // file -> AudioBuffer
const playing = new Map();   // id -> { source, gainNode }
let editing = false;

function isFileProtocol() {
  return window.location.protocol === "file:";
}

function requireHttpServer() {
  if (!isFileProtocol()) return false;
  setStatus("音源読み込みにはローカル HTTP サーバーが必要です。http://127.0.0.1:8000/ で開いてください。");
  return true;
}

// ---------- 起動 ----------
startBtn.addEventListener("click", async () => {
  if (requireHttpServer()) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  await ctx.resume();
  overlay.classList.add("hidden");
  await loadPins();
  renderPins();
  preloadAll();
});

async function loadPins() {
  const res = await fetch("sounds.json", { cache: "no-store" });
  const json = await res.json();
  pins = (json.pins || []).map(pin => ({
    ...pin,
    title: pin.title || pin.label || "Sound",
    creator: pin.creator || pin.author || "制作者不明",
    label: pin.label || pin.title || "Sound",
  }));
}

async function preloadAll() {
  for (const p of pins) {
    try { await getBuffer(p.file); }
    catch (e) { console.error("load failed:", p.file, e); }
  }
  setStatus(`${buffers.size} / ${pins.length} 音をロード済み`);
}

async function getBuffer(file) {
  if (buffers.has(file)) return buffers.get(file);
  if (isFileProtocol()) {
    throw new Error("file:// では音源が読めません。HTTP サーバーで開いてください。");
  }
  const res = await fetch(`sounds/${file}`);
  if (!res.ok) throw new Error(`${res.status} ${file}`);
  const arr = await res.arrayBuffer();
  const buf = await ctx.decodeAudioData(arr);
  buffers.set(file, buf);
  return buf;
}

function setStatus(msg) { statusEl.textContent = msg; }

// ---------- 再生 ----------
async function toggle(pin, el) {
  const wrap = el.closest(".pin-wrap");
  if (playing.has(pin.id)) { stop(pin.id); if (wrap) wrap.classList.remove("playing"); return; }
  el.classList.add("loading");
  let buf;
  try { buf = await getBuffer(pin.file); }
  catch (e) { el.classList.remove("loading"); setStatus(`読み込み失敗: ${pin.file}`); return; }
  el.classList.remove("loading");
  if (ctx.state !== "running") await ctx.resume();

  const source = ctx.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  const gainNode = ctx.createGain();
  gainNode.gain.value = pin.gain ?? 1;
  source.connect(gainNode).connect(ctx.destination);
  source.start();
  playing.set(pin.id, { source, gainNode });
  if (wrap) wrap.classList.add("playing");
}

function stop(id) {
  const p = playing.get(id);
  if (!p) return;
  try { p.source.stop(); } catch (_) {}
  p.source.disconnect();
  playing.delete(id);
}

stopAllBtn.addEventListener("click", () => {
  for (const id of [...playing.keys()]) stop(id);
  pinsEl.querySelectorAll(".pin-wrap").forEach(wrap => wrap.classList.remove("playing"));
});

// ---------- 描画 ----------
function renderPins() {
  pinsEl.innerHTML = "";
  for (const pin of pins) {
    const wrap = document.createElement("div");
    wrap.className = "pin-wrap";
    wrap.dataset.id = pin.id;
    wrap.style.left = `${pin.x * 100}%`;
    wrap.style.top = `${pin.y * 100}%`;

    const el = document.createElement("button");
    el.type = "button";
    el.className = "pin";
    el.dataset.id = pin.id;
    el.setAttribute("aria-label", `${pin.title || pin.label || pin.id} / ${pin.creator || "制作者不明"}`);

    const info = document.createElement("div");
    info.className = "pin-info";

    const titleEl = document.createElement("div");
    titleEl.className = "pin-title";
    titleEl.textContent = pin.title || pin.label || pin.id;

    const metaEl = document.createElement("div");
    metaEl.className = "pin-meta";
    metaEl.textContent = pin.creator || "制作者不明";

    info.appendChild(titleEl);
    info.appendChild(metaEl);
    wrap.appendChild(info);
    wrap.appendChild(el);

    if (playing.has(pin.id)) wrap.classList.add("playing");
    attachPointer(el, pin);
    pinsEl.appendChild(wrap);
  }
}

// タップ＝再生切替、編集モード中のドラッグ＝移動
function attachPointer(el, pin) {
  let startX, startY, moved, dragging = false;
  el.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    startX = e.clientX; startY = e.clientY; moved = false; dragging = editing;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) moved = true;
    if (!moved) return;
    const r = mapWrap.getBoundingClientRect();
    pin.x = clamp((e.clientX - r.left) / r.width);
    pin.y = clamp((e.clientY - r.top) / r.height);
    el.style.left = `${pin.x * 100}%`;
    el.style.top = `${pin.y * 100}%`;
  });
  el.addEventListener("pointerup", () => {
    if (!moved) toggle(pin, el);
    dragging = false;
  });
}

const clamp = v => Math.min(1, Math.max(0, v));

// 編集モード中に地図の空白をタップ → 新規ピン
mapWrap.addEventListener("pointerup", (e) => {
  if (!editing) return;
  const r = mapWrap.getBoundingClientRect();
  const x = clamp((e.clientX - r.left) / r.width);
  const y = clamp((e.clientY - r.top) / r.height);
  const file = prompt("sounds/ 内のファイル名を入力（例: cat.wav）");
  if (!file) return;
  const title = prompt("タイトル（短く）", file.replace(/\.\w+$/, "")) || file;
  const creator = prompt("制作者名", "不明") || "不明";
  const id = `p${Date.now().toString(36)}`;
  pins.push({
    id,
    title,
    creator,
    label: title,
    file,
    x: +x.toFixed(4),
    y: +y.toFixed(4),
    gain: 1,
  });
  renderPins();
});

// ---------- 編集 / 書き出し ----------
editBtn.addEventListener("click", () => {
  editing = !editing;
  editBtn.classList.toggle("active", editing);
  mapWrap.classList.toggle("editing", editing);
  exportBtn.hidden = !editing;
  setStatus(editing ? "編集中: ピンをドラッグ / 空白タップで追加" : "");
});

exportBtn.addEventListener("click", () => {
  const data = JSON.stringify({ pins }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "sounds.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
