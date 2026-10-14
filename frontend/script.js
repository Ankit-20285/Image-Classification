/* VisionAI frontend prototype.
 * Sections: 1 Config · 2 Mock data (replace later) · 3 API layer · 4 Helpers · 5 Renderers · 6 Upload logic · 7 Init
 */

/* ============ 1. CONFIG ============ */
const API_BASE = "http://127.0.0.1:8000";
const USE_MOCK_API = false;           // set to false once FastAPI is wired up
const MAX_FILE_BYTES = 5 * 1024 * 1024;    // 5 MiB, matches the backend
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const HISTORY_PREVIEW_COUNT = 5;

const CLASSES = ["buildings", "forest", "glacier", "mountain", "sea", "street"];

/* ============ 2. MOCK DATA (prototype only) ============ */
// Everything in this block is placeholder content. Delete it when the backend is connected.
function mockPredict(file) {
  // Deterministic fake result from filename + size, so the same file gives the same demo output.
  let hash = 0;
  for (const ch of `${file.name}:${file.size}`) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return {
    filename: file.name,
    predicted_class: CLASSES[hash % CLASSES.length],
    confidence_score: 0.62 + ((hash >> 3) % 350) / 1000, // 0.62 – 0.97
  };
}

function mockHistory() {
  const mins = (m) => new Date(Date.now() - m * 60000).toISOString();
  const rows = [
    ["alpine_lake.jpg", "mountain", 0.912, 18], ["old_town_square.png", "buildings", 0.874, 95],
    ["pine_trail.webp", "forest", 0.931, 340], ["harbour_morning.jpg", "sea", 0.846, 1500],
    ["ice_field.jpg", "glacier", 0.779, 2900], ["night_market.png", "street", 0.688, 4400],
    ["fjord_view.jpeg", "sea", 0.901, 7200],
  ];
  return rows.map(([filename, predicted_class, confidence_score, m], i) =>
    ({ id: `sample-${i + 1}`, filename, predicted_class, confidence_score, timestamp: mins(m) }));
}

/* ============ 3. API LAYER (swap these two functions) ============ */
/** POST /predict → { filename, predicted_class, confidence_score } */
async function predictImage(file) {
  if (USE_MOCK_API) {
    await new Promise((r) => setTimeout(r, 1100)); // simulate waiting
    return mockPredict(file);
  }
  const body = new FormData();
  body.append("file", file);                       // field name expected by FastAPI
  const res = await fetch(`${API_BASE}/predict`, { method: "POST", body });
  if (!res.ok) throw new Error(`The server returned an error (${res.status}). Try again.`);
  return res.json();
}

/** GET /history → [{ id, filename, predicted_class, confidence_score, timestamp }] */
async function fetchHistory() {
  if (USE_MOCK_API) return mockHistory();
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error(`Could not load history (${res.status}).`);
  return res.json();
}

/* ============ 4. HELPERS ============ */
const $ = (id) => document.getElementById(id);
const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}
/** Accepts 0–1 or 0–100 and returns a percentage number. */
function toPercent(score) {
  return Math.min(100, Math.max(0, score <= 1 ? score * 100 : score));
}
/** SQLite CURRENT_TIMESTAMP is UTC without a timezone ("2026-10-14 18:46:00"); treat it as UTC. */
function parseTimestamp(ts) {
  const iso = String(ts).trim().replace(" ", "T");
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + "Z");
}
function formatTime(ts) {
  const d = parseTimestamp(ts);
  return isNaN(d) ? "" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
}

// Small generated scene illustrations, used as category art and as thumbnails for records without an image.
const SCENE_COLORS = {
  buildings: ["#2b2a6b", "#6a5cf0"], forest: ["#0f3d3a", "#2fae7a"], glacier: ["#5aa9d6", "#d9f2ff"],
  mountain: ["#3a3f8f", "#f0a3c4"], sea: ["#0b3a73", "#4aa3ff"], street: ["#23233d", "#8b6cff"],
};
const SCENE_SHAPES = {
  buildings: '<g fill="#14132e"><rect x="10" y="40" width="26" height="60"/><rect x="40" y="22" width="30" height="78"/><rect x="74" y="46" width="24" height="54"/><rect x="102" y="30" width="28" height="70"/><rect x="134" y="54" width="20" height="46"/></g><g fill="#ffd27a" opacity=".85"><rect x="47" y="30" width="5" height="6"/><rect x="58" y="44" width="5" height="6"/><rect x="109" y="40" width="5" height="6"/><rect x="118" y="58" width="5" height="6"/><rect x="18" y="52" width="5" height="6"/></g>',
  forest: '<g fill="#0a2a27"><path d="M10 100 30 40 50 100z"/><path d="M40 100 66 28 92 100z"/><path d="M84 100 108 46 132 100z"/><path d="M116 100 138 36 160 100z"/></g><g fill="#134e44"><path d="M0 100 18 60 36 100z"/><path d="M70 100 92 64 114 100z"/></g>',
  glacier: '<path d="M0 100 34 44 56 70 88 24 124 76 150 50 160 62V100z" fill="#eaf8ff"/><path d="M88 24 124 76 100 100 70 100z" fill="#9fd4ee" opacity=".7"/><path d="M0 100h160v-12c-30 6-60-6-90 0s-50 4-70-2z" fill="#3b86b8"/>',
  mountain: '<circle cx="124" cy="26" r="10" fill="#ffe7a8" opacity=".9"/><path d="M0 100 44 32 78 82 106 48 160 100z" fill="#1f1e55"/><path d="M44 32 54 48 44 44 36 48z" fill="#fff"/><path d="M106 48 114 60 106 56 98 60z" fill="#fff"/>',
  sea: '<circle cx="116" cy="34" r="12" fill="#ffe7a8" opacity=".9"/><path d="M0 62c20-8 40 8 60 0s40-8 60 0 30 8 40 2V100H0z" fill="#1565c0"/><path d="M0 78c20-8 40 8 60 0s40-8 60 0 30 8 40 2V100H0z" fill="#0a3c7a"/>',
  street: '<path d="M0 100 60 52h40l60 48z" fill="#15152b"/><path d="M78 100l2-48h0l2 48z" fill="#8b6cff" opacity=".7"/><g fill="#14132e"><rect x="4" y="30" width="38" height="70"/><rect x="118" y="24" width="38" height="76"/></g><g fill="#ffd27a"><circle cx="50" cy="48" r="3"/><circle cx="110" cy="48" r="3"/></g>',
};
function sceneDataUri(cls) {
  const [a, b] = SCENE_COLORS[cls] || ["#23233d", "#8b6cff"];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="160" height="100" fill="url(#g)"/>${SCENE_SHAPES[cls] || ""}</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

/* ============ 5. RENDERERS ============ */
const resultsEl = $("results");

function renderResultIdle() {
  resultsEl.innerHTML = `<div class="state"><h3>Results appear here</h3><p>Choose an image, then select Analyze Image.</p></div>`;
}
function renderResultLoading() {
  resultsEl.setAttribute("aria-busy", "true");
  resultsEl.innerHTML = `<div class="state"><div class="spinner lg" role="status" aria-label="Analyzing"></div><h3>Analyzing image…</h3><p>This only takes a moment.</p></div>`;
}
function renderResultError(message) {
  resultsEl.setAttribute("aria-busy", "false");
  resultsEl.innerHTML = `<div class="state error"><h3>Analysis failed</h3><p>${escapeHtml(message)}</p></div>`;
}
/** Accepts the real /predict response shape: { filename, predicted_class, confidence_score }. */
function renderResult(data, previewSrc, { isDemo = USE_MOCK_API } = {}) {
  const pct = toPercent(data.confidence_score);
  resultsEl.setAttribute("aria-busy", "false");
  resultsEl.innerHTML = `
    <div class="res">
      ${isDemo ? '<span class="demo-tag">Demo result – not from the trained model</span>' : ""}
      <img src="${previewSrc}" alt="Analyzed image" />
      <div class="res-main">
        <span class="res-class">${escapeHtml(titleCase(data.predicted_class))}</span>
        <span class="res-pct">${pct.toFixed(1)}%</span>
      </div>
      <div class="meter" role="progressbar" aria-label="Confidence" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct.toFixed(1)}"><span></span></div>
      <div class="ok-chip">✓ Analysis complete</div>
      <p class="fname">${escapeHtml(data.filename)}</p>
      <button type="button" class="btn btn-ghost" id="another-btn">Classify Another Image</button>
    </div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => { resultsEl.querySelector(".meter span").style.width = pct + "%"; }));
  $("another-btn").addEventListener("click", () => { clearSelection(); $("dropzone").focus(); $("classify").scrollIntoView({ behavior: "smooth" }); });
}

/* ---- History ---- */
let historyRecords = [];
let showAllHistory = false;

/** Accepts the real /history array. Optional record.thumbnail is used when present. */
function renderHistory(records) {
  const query = $("history-search").value.trim().toLowerCase();
  const category = $("history-filter").value;
  const matches = records.filter((r) =>
    (!category || r.predicted_class === category) && r.filename.toLowerCase().includes(query));
  const filtering = Boolean(query || category);
  const visible = showAllHistory || filtering ? matches : matches.slice(0, HISTORY_PREVIEW_COUNT);

  $("history-list").innerHTML = visible.map((r) => {
    const pct = toPercent(r.confidence_score);
    return `<li>
      <img src="${r.thumbnail || sceneDataUri(r.predicted_class)}" alt="" />
      <span class="h-name" title="${escapeHtml(r.filename)}">${escapeHtml(r.filename)}</span>
      <span class="h-class">${escapeHtml(titleCase(r.predicted_class))}</span>
      <span class="h-conf"><span>${pct.toFixed(1)}%</span><span class="meter" aria-hidden="true"><span style="width:${pct}%"></span></span></span>
      <time class="h-time" datetime="${escapeHtml(r.timestamp)}">${formatTime(r.timestamp)}</time>
    </li>`;
  }).join("");

  const empty = $("history-empty");
  empty.hidden = matches.length > 0;
  if (!matches.length) {
    empty.innerHTML = records.length
      ? `<h3>No matching predictions</h3><p>Try a different filename or category.</p>`
      : `<h3>No predictions yet</h3><p>Analyze an image and it will show up here.</p>`;
  }
  const more = $("history-more");
  more.hidden = filtering || matches.length <= HISTORY_PREVIEW_COUNT;
  more.textContent = showAllHistory ? "Show fewer" : `View all ${matches.length}`;
}

function renderCategories() {
  $("category-grid").innerHTML = CLASSES.map((c) =>
    `<li class="cat"><img src="${sceneDataUri(c)}" alt="" /><span>${titleCase(c)}</span></li>`).join("");
  $("history-filter").innerHTML = `<option value="">All categories</option>` +
    CLASSES.map((c) => `<option value="${c}">${titleCase(c)}</option>`).join("");
}

/* ============ 6. UPLOAD LOGIC ============ */
let selectedFile = null;
let previewDataUrl = null;
const fileInput = $("file-input"), dropzone = $("dropzone");

function showUploadError(message) { const el = $("upload-error"); el.textContent = message; el.hidden = !message; }

/** Returns an error message, or null when the file is acceptable. */
function validateFile(file) {
  if (!file) return "Choose an image to analyze.";
  if (!ALLOWED_TYPES.includes(file.type)) return "Unsupported format. Use a JPG, JPEG, PNG or WEBP image.";
  if (file.size === 0) return "That file is empty. Choose a different image.";
  if (file.size > MAX_FILE_BYTES) return `That image is ${formatBytes(file.size)}. The limit is 5 MiB.`;
  return null;
}

function selectFile(file) {
  const error = validateFile(file);
  if (error) { showUploadError(error); return; }
  showUploadError("");
  selectedFile = file;
  const reader = new FileReader();                       // preview immediately, no upload needed
  reader.onload = () => {
    previewDataUrl = reader.result;
    $("preview-img").src = previewDataUrl;
    $("file-name").textContent = file.name;
    $("file-size").textContent = formatBytes(file.size);
    dropzone.hidden = true;
    $("preview").hidden = false;
    renderResultIdle();
  };
  reader.readAsDataURL(file);
}

function clearSelection() {
  selectedFile = null; previewDataUrl = null;
  fileInput.value = "";
  $("preview").hidden = true;
  dropzone.hidden = false;
  showUploadError("");
  renderResultIdle();
}

async function handleAnalyze() {
  if (!selectedFile) { showUploadError(validateFile(null)); return; }
  const btn = $("analyze-btn");
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Analyzing…';
  renderResultLoading();
  try {
    const data = await predictImage(selectedFile);
    renderResult(data, previewDataUrl);

    
    if (USE_MOCK_API) {
      // Mock mode: session-only entry so the list reacts. Not saved anywhere.
      historyRecords.unshift({ id: `session-${Date.now()}`, ...data, timestamp: new Date().toISOString(), thumbnail: previewDataUrl });
    } else {
      // Real mode: the backend saved it, so reload the list. A failure here must not hide the result.
      try { historyRecords = await fetchHistory(); } catch (e) { console.error(e); }
    }
    renderHistory(historyRecords);
  } catch (err) {
    renderResultError(err.message || "Something went wrong. Try again.");
  } finally {
    btn.disabled = false; btn.textContent = "Analyze Image";
  }
}

/* ============ 7. INIT ============ */
function initNav() {
  const btn = $("menu-btn"), nav = $("site-nav");
  const setOpen = (open) => { nav.classList.toggle("open", open); btn.setAttribute("aria-expanded", String(open)); };
  btn.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
}

function initUpload() {
  $("browse-btn").addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
  $("change-btn").addEventListener("click", () => fileInput.click());
  $("remove-btn").addEventListener("click", clearSelection);
  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener("change", () => { if (fileInput.files[0]) selectFile(fileInput.files[0]); });
  ["dragenter", "dragover"].forEach((t) => dropzone.addEventListener(t, (e) => { e.preventDefault(); dropzone.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((t) => dropzone.addEventListener(t, (e) => { e.preventDefault(); dropzone.classList.remove("is-over"); }));
  dropzone.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) selectFile(f); });
  $("analyze-btn").addEventListener("click", handleAnalyze);
}

async function initHistory() {
  $("history-search").addEventListener("input", () => renderHistory(historyRecords));
  $("history-filter").addEventListener("change", () => renderHistory(historyRecords));
  $("history-more").addEventListener("click", () => { showAllHistory = !showAllHistory; renderHistory(historyRecords); });
  $("history-note").textContent = USE_MOCK_API ? "Sample records for the prototype. Not loaded from the backend." : "Your saved predictions.";
  try { historyRecords = await fetchHistory(); } catch (err) { historyRecords = []; $("history-note").textContent = err.message; }
  renderHistory(historyRecords);
}

renderCategories();
renderResultIdle();
initNav();
initUpload();
initHistory();
