const DEFAULT_IMAGE = chrome.runtime.getURL("assets/images/pop.png");
const DEFAULT_SIZE = 45;
const DEFAULT_COLOR = "#1d9bf0";
const FIXED_SWATCH = "#D9DEE1";
const PREVIEW_FACTOR = 0.62;

const elements = {
  enabledToggle: document.getElementById("enabledToggle"),
  body: document.getElementById("body"),
  preview: document.getElementById("preview"),
  fileInput: document.getElementById("fileInput"),
  sizeSlider: document.getElementById("sizeSlider"),
  sizeValue: document.getElementById("sizeValue"),
  resetBtn: document.getElementById("resetBtn"),
  svSquare: document.getElementById("svSquare"),
  svHandle: document.getElementById("svHandle"),
  hueBar: document.getElementById("hueBar"),
  hueHandle: document.getElementById("hueHandle"),
  swatch: document.getElementById("swatch"),
  hexInput: document.getElementById("hexInput"),
  addBtn: document.getElementById("addBtn"),
  swatchRow: document.getElementById("swatchRow")
};

const state = {
  hue: 205,
  sat: 0.87,
  val: 0.94,
  customSwatches: [null, null, null, null]
};

function init() {
  bindEvents();
  loadSavedSettings();
}

function bindEvents() {
  elements.enabledToggle.addEventListener("change", handleEnabledToggle);
  elements.fileInput.addEventListener("change", handleFileSelect);
  elements.resetBtn.addEventListener("click", handleReset);
  elements.sizeSlider.addEventListener("input", handleSizeChange);
  makeDraggable(elements.svSquare, (x, y) => {
    state.sat = x;
    state.val = 1 - y;
    updateColorUI(true);
  });
  makeDraggable(elements.hueBar, (x) => {
    state.hue = x * 360;
    updateColorUI(true);
  });
  elements.hexInput.addEventListener("change", handleHexInput);
  elements.addBtn.addEventListener("click", handleAddSwatch);
}

function loadSavedSettings() {
  chrome.storage.local.get(
    ["enabled", "popImage", "popSize", "buttonColor", "customSwatches"],
    (data) => {
      const enabled = data.enabled !== false;
      elements.enabledToggle.checked = enabled;
      elements.body.classList.toggle("off", !enabled);

      if (data.popImage) elements.preview.src = data.popImage;
      const size = data.popSize || DEFAULT_SIZE;
      elements.sizeSlider.value = size;
      applySize(size);

      if (Array.isArray(data.customSwatches)) state.customSwatches = data.customSwatches;
      [state.hue, state.sat, state.val] = hexToHsv(data.buttonColor || DEFAULT_COLOR);
      updateColorUI(false);
    }
  );
}

function handleEnabledToggle() {
  const on = elements.enabledToggle.checked;
  elements.body.classList.toggle("off", !on);
  chrome.storage.local.set({ enabled: on });
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    elements.preview.src = reader.result;
    chrome.storage.local.set({ popImage: reader.result });
  };
  reader.readAsDataURL(file);
  elements.fileInput.value = "";
}

function handleReset() {
  chrome.storage.local.remove(["popImage"], () => {
    elements.preview.src = DEFAULT_IMAGE;
  });
}

function handleSizeChange() {
  const size = Number(elements.sizeSlider.value);
  applySize(size);
  chrome.storage.local.set({ popSize: size });
}

function applySize(size) {
  elements.sizeValue.textContent = size + "px";
  elements.preview.style.width = Math.round(size * PREVIEW_FACTOR) + "px";
  elements.preview.style.height = "auto";
}

function handleHexInput() {
  let value = elements.hexInput.value.trim();
  if (!value.startsWith("#")) value = "#" + value;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    [state.hue, state.sat, state.val] = hexToHsv(value);
    updateColorUI(true);
  } else {
    updateColorUI(false);
  }
}

function handleAddSwatch() {
  const hex = getCurrentHex();
  const index = state.customSwatches.indexOf(null);
  if (index !== -1) state.customSwatches[index] = hex;
  else {
    state.customSwatches.shift();
    state.customSwatches.push(hex);
  }
  chrome.storage.local.set({ customSwatches: state.customSwatches });
  renderSwatches();
}

function renderSwatches() {
  elements.swatchRow.innerHTML = "";
  const list = [{ color: FIXED_SWATCH, base: true }].concat(state.customSwatches.map((color) => ({ color })));

  list.forEach((item) => {
    const dot = document.createElement("button");
    dot.className = "swatch";
    if (!item.color) {
      dot.classList.add("empty");
    } else {
      if (item.base) dot.classList.add("base");
      dot.style.background = item.color;
      dot.title = item.color;
      dot.addEventListener("click", () => {
        [state.hue, state.sat, state.val] = hexToHsv(item.color);
        updateColorUI(true);
      });
    }
    elements.swatchRow.appendChild(dot);
  });
}

function makeDraggable(element, onMove) {
  let dragging = false;

  function handle(event) {
    const rect = element.getBoundingClientRect();
    let x = (event.clientX - rect.left) / rect.width;
    let y = (event.clientY - rect.top) / rect.height;
    x = Math.min(1, Math.max(0, x));
    y = Math.min(1, Math.max(0, y));
    onMove(x, y);
  }

  element.addEventListener("pointerdown", (event) => {
    dragging = true;
    handle(event);
  });
  document.addEventListener("pointermove", (event) => {
    if (dragging) handle(event);
  });
  document.addEventListener("pointerup", () => {
    dragging = false;
  });
}

function getCurrentHex() {
  const [r, g, b] = hsvToRgb(state.hue, state.sat, state.val);
  return rgbToHex(r, g, b);
}

function updateColorUI(save) {
  elements.svSquare.style.background =
    "linear-gradient(to top, #000, rgba(0,0,0,0)), " +
    "linear-gradient(to right, #fff, rgba(255,255,255,0)), " +
    `hsl(${state.hue}, 100%, 50%)`;
  elements.svHandle.style.left = state.sat * 100 + "%";
  elements.svHandle.style.top = (1 - state.val) * 100 + "%";
  elements.hueHandle.style.left = (state.hue / 360) * 100 + "%";

  const hex = getCurrentHex();
  elements.swatch.style.background = hex;
  elements.hexInput.value = hex.toUpperCase();
  renderSwatches();

  if (save) chrome.storage.local.set({ buttonColor: hex });
}

function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r;
  let g;
  let b;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function hexToHsv(hex) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return [h, max === 0 ? 0 : delta / max, max];
}

init();
