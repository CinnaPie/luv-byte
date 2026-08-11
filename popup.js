const DEFAULT_IMAGE = chrome.runtime.getURL("images/pop.png");
const DEFAULT_SIZE = 45;
const DEFAULT_COLOR = "#1d9bf0";
const FIXED_SWATCH = "#D9DEE1";   // ★ 첫 번째 고정 색
const PREVIEW_FACTOR = 0.62;

const enabledToggle = document.getElementById("enabledToggle");
const body = document.getElementById("body");
const preview = document.getElementById("preview");
const fileInput = document.getElementById("fileInput");
const sizeSlider = document.getElementById("sizeSlider");
const sizeValue = document.getElementById("sizeValue");
const resetBtn = document.getElementById("resetBtn");
const svSquare = document.getElementById("svSquare");
const svHandle = document.getElementById("svHandle");
const hueBar = document.getElementById("hueBar");
const hueHandle = document.getElementById("hueHandle");
const swatch = document.getElementById("swatch");
const hexInput = document.getElementById("hexInput");
const addBtn = document.getElementById("addBtn");
const swatchRow = document.getElementById("swatchRow");

let hue = 205, sat = 0.87, val = 0.94;
let customSwatches = [null, null, null, null];

// 저장값 불러오기
chrome.storage.local.get(
  ["enabled", "popImage", "popSize", "buttonColor", "customSwatches"],
  (data) => {
    const enabled = data.enabled !== false;
    enabledToggle.checked = enabled;
    body.classList.toggle("off", !enabled);

    if (data.popImage) preview.src = data.popImage;
    const size = data.popSize || DEFAULT_SIZE;
    sizeSlider.value = size;
    applySize(size);

    if (Array.isArray(data.customSwatches)) customSwatches = data.customSwatches;
    [hue, sat, val] = hexToHsv(data.buttonColor || DEFAULT_COLOR);
    updateColorUI(false);
  }
);

// 전체 켜기/끄기
enabledToggle.addEventListener("change", () => {
  const on = enabledToggle.checked;
  body.classList.toggle("off", !on);
  chrome.storage.local.set({ enabled: on });
});

// 이미지
fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    preview.src = reader.result;
    chrome.storage.local.set({ popImage: reader.result });
  };
  reader.readAsDataURL(file);
  fileInput.value = "";
});

resetBtn.addEventListener("click", () => {
  chrome.storage.local.remove(["popImage"], () => { preview.src = DEFAULT_IMAGE; });
});

// 크기
sizeSlider.addEventListener("input", () => {
  const size = Number(sizeSlider.value);
  applySize(size);
  chrome.storage.local.set({ popSize: size });
});
function applySize(size) {
  sizeValue.textContent = size + "px";
  preview.style.width = Math.round(size * PREVIEW_FACTOR) + "px";
  preview.style.height = "auto";
}

// 색상
makeDraggable(svSquare, (x, y) => { sat = x; val = 1 - y; updateColorUI(true); });
makeDraggable(hueBar, (x) => { hue = x * 360; updateColorUI(true); });

hexInput.addEventListener("change", () => {
  let v = hexInput.value.trim();
  if (!v.startsWith("#")) v = "#" + v;
  if (/^#[0-9a-fA-F]{6}$/.test(v)) { [hue, sat, val] = hexToHsv(v); updateColorUI(true); }
  else updateColorUI(false);
});

addBtn.addEventListener("click", () => {
  const hex = currentHex();
  const i = customSwatches.indexOf(null);
  if (i !== -1) customSwatches[i] = hex;
  else { customSwatches.shift(); customSwatches.push(hex); }
  chrome.storage.local.set({ customSwatches: customSwatches });
  renderSwatches();
});

// helper
function renderSwatches() {
  swatchRow.innerHTML = "";
  const list = [{ color: FIXED_SWATCH, base: true }].concat(customSwatches.map((c) => ({ color: c })));
  list.forEach((item) => {
    const dot = document.createElement("button");
    dot.className = "swatch";
    if (!item.color) dot.classList.add("empty");
    else {
      if (item.base) dot.classList.add("base");
      dot.style.background = item.color;
      dot.title = item.color;
      dot.addEventListener("click", () => { [hue, sat, val] = hexToHsv(item.color); updateColorUI(true); });
    }
    swatchRow.appendChild(dot);
  });
}

function makeDraggable(element, onMove) {
  let dragging = false;
  function handle(e) {
    const rect = element.getBoundingClientRect();
    let x = (e.clientX - rect.left) / rect.width;
    let y = (e.clientY - rect.top) / rect.height;
    x = Math.min(1, Math.max(0, x)); y = Math.min(1, Math.max(0, y));
    onMove(x, y);
  }
  element.addEventListener("pointerdown", (e) => { dragging = true; handle(e); });
  document.addEventListener("pointermove", (e) => { if (dragging) handle(e); });
  document.addEventListener("pointerup", () => { dragging = false; });
}

function currentHex() { const [r, g, b] = hsvToRgb(hue, sat, val); return rgbToHex(r, g, b); }

function updateColorUI(save) {
  svSquare.style.background =
    "linear-gradient(to top, #000, rgba(0,0,0,0)), " +
    "linear-gradient(to right, #fff, rgba(255,255,255,0)), " +
    `hsl(${hue}, 100%, 50%)`;
  svHandle.style.left = sat * 100 + "%";
  svHandle.style.top = (1 - val) * 100 + "%";
  hueHandle.style.left = (hue / 360) * 100 + "%";
  const hex = currentHex();
  swatch.style.background = hex;
  hexInput.value = hex.toUpperCase();
  renderSwatches();
  if (save) chrome.storage.local.set({ buttonColor: hex });
}

function hsvToRgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r, g, b;
  if (h < 60) [r,g,b]=[c,x,0]; else if (h<120) [r,g,b]=[x,c,0];
  else if (h<180) [r,g,b]=[0,c,x]; else if (h<240) [r,g,b]=[0,x,c];
  else if (h<300) [r,g,b]=[x,0,c]; else [r,g,b]=[c,0,x];
  return [Math.round((r+m)*255), Math.round((g+m)*255), Math.round((b+m)*255)];
}
function rgbToHex(r, g, b) { return "#" + [r,g,b].map((n) => n.toString(16).padStart(2, "0")).join(""); }
function hexToHsv(hex) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substr(0,2),16)/255, g = parseInt(hex.substr(2,2),16)/255, b = parseInt(hex.substr(4,2),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  let h = 0;
  if (d !== 0) { if (max===r) h=((g-b)/d)%6; else if (max===g) h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; if (h<0) h+=360; }
  return [h, max === 0 ? 0 : d/max, max];
}
