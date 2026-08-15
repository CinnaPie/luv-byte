/*!
 * luv-byte - Custom Heart Image for X (Twitter)
 * Copyright (c) 2026 CinnaPie (@CinnaPie), xxxx (@xxmerrywish)
 * Released under the MIT License.
 */

const DEFAULT_IMAGE = chrome.runtime.getURL("assets/images/pop.png");
const DEFAULT_SIZE = 45;
const TWITTER_BLUE = "rgb(29, 155, 240)";

const state = {
  enabled: true,
  popImageUrl: DEFAULT_IMAGE,
  popSize: DEFAULT_SIZE,
  buttonColor: "#1d9bf0"
};

function init() {
  loadSettings();
  bindStorageListener();
  bindClickHandler();
  startBlueRecolor();
}

function loadSettings() {
  chrome.storage.local.get(
    ["enabled", "popImage", "popSize", "buttonColor"],
    (data) => {
      state.enabled = data.enabled !== false;
      if (data.popImage) state.popImageUrl = data.popImage;
      if (data.popSize) state.popSize = data.popSize;
      if (data.buttonColor) state.buttonColor = data.buttonColor;
      applyButtonColor();
    }
  );
}

function bindStorageListener() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.enabled) state.enabled = changes.enabled.newValue !== false;
    if (changes.popImage) state.popImageUrl = changes.popImage.newValue || DEFAULT_IMAGE;
    if (changes.popSize) state.popSize = changes.popSize.newValue || DEFAULT_SIZE;
    if (changes.buttonColor) state.buttonColor = changes.buttonColor.newValue || state.buttonColor;
    if (changes.enabled || changes.buttonColor) applyButtonColor();
  });
}

function bindClickHandler() {
  document.addEventListener(
    "click",
    (event) => {
      if (!state.enabled) return;
      const likeButton = event.target.closest('[data-testid="like"]');
      if (!likeButton) return;
      const heartIcon = likeButton.querySelector("svg") || likeButton;
      const rect = heartIcon.getBoundingClientRect();
      showPop(rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    true
  );
}

function applyButtonColor() {
  let style = document.getElementById("luvbyte-btn-color");
  if (!state.enabled) {
    if (style) style.remove();
    return;
  }

  if (!style) {
    style = document.createElement("style");
    style.id = "luvbyte-btn-color";
    document.head.appendChild(style);
  }

  const color = state.buttonColor;
  style.textContent = `
    [data-testid="SideNav_NewTweet_Button"],
    [data-testid="SideNav_NewTweet_Button"]:hover,
    [data-testid="tweetButton"],
    [data-testid="tweetButton"]:hover,
    [data-testid="tweetButtonInline"],
    [data-testid="tweetButtonInline"]:hover {
      background-color: ${color} !important;
    }
    [style*="background-color: ${TWITTER_BLUE}"] { background-color: ${color} !important; }
    [style*="color: ${TWITTER_BLUE}"] { color: ${color} !important; }
    [style*="border-color: ${TWITTER_BLUE}"] { border-color: ${color} !important; }

    [aria-label*="안 읽은 항목"] {
      background-color: ${color} !important;
    }
    
    svg[data-testid="icon-verified"] {
      color: ${color} !important;
      fill: ${color} !important;
    }

    /* toast notification */
    [data-testid="toast"] {
      background-color: ${color} !important;
    }

    svg[data-testid="icon-verified"] path {
      fill: ${color} !important;
    }
    /* unread notification background */
    article[data-testid="notification"].r-1peqgm7 {
      background-color: ${color}1a !important;
    }

    /* notification heart icon */
    article[data-testid="notification"] svg {
      color: ${color} !important;
      fill: ${color} !important;
    }
    article[data-testid="notification"] svg path {
      fill: ${color} !important;
    }
  `;
}

function injectStyleOnce() {
  if (document.getElementById("heart-pop-style")) return;
  const style = document.createElement("style");
  style.id = "heart-pop-style";
  style.textContent = `
    .heart-pop-img {
      position: fixed; height: auto; pointer-events: none; z-index: 999999;
      transform: translate(-50%, -50%) scale(0.2); opacity: 0;
      animation: heartPop 0.9s ease-out forwards;
    }
    @keyframes heartPop {
      0%   { transform: translate(-50%, -50%) scale(0.2);  opacity: 0; }
      25%  { transform: translate(-50%, -50%) scale(1.3);  opacity: 1; }
      45%  { transform: translate(-50%, -50%) scale(1.0);  opacity: 1; }
      100% { transform: translate(-50%, -90%) scale(1.1);  opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

function showPop(x, y) {
  injectStyleOnce();
  const img = document.createElement("img");
  img.src = state.popImageUrl;
  img.className = "heart-pop-img";
  img.style.left = x + "px";
  img.style.top = y + "px";
  img.style.width = state.popSize + "px";
  document.body.appendChild(img);
  setTimeout(() => img.remove(), 1000);
}

// Twitter blue auto-recolor
const recolored = new Map(); // element -> changed properties

// Check element for Twitter blue, recolor
function recolorEl(el) {
  if (!el || el.nodeType !== 1) return;
  const tag = el.tagName;
  if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS") return; // skip media

  const cs = getComputedStyle(el);
  const checks = [
    ["color", cs.color],
    ["background-color", cs.backgroundColor],
    ["fill", cs.fill],
    ["stroke", cs.stroke],
    ["border-color", cs.borderColor]
  ];
  for (const [prop, value] of checks) {
    if (value === TWITTER_BLUE) {
      el.style.setProperty(prop, state.buttonColor, "important");
      let props = recolored.get(el);
      if (!props) { props = new Set(); recolored.set(el, props); }
      props.add(prop);
    }
  }
}

// Scan subtree
function scanBlue(root) {
  if (!state.enabled || !root || root.nodeType !== 1) return;
  recolorEl(root);
  const all = root.querySelectorAll("*");
  for (let i = 0; i < all.length; i++) recolorEl(all[i]);
}

// Reapply updated color
function reapplyBlue() {
  for (const [el, props] of recolored) {
    if (!el.isConnected) { recolored.delete(el); continue; }
    for (const p of props) el.style.setProperty(p, state.buttonColor, "important");
  }
}

// Revert to original colors
function revertBlue() {
  for (const [el, props] of recolored) {
    for (const p of props) el.style.removeProperty(p);
  }
  recolored.clear();
}

function startBlueRecolor() {
  // Storage change listener
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.buttonColor && state.enabled) reapplyBlue();
    if (changes.enabled) {
      if (changes.enabled.newValue !== false) scanBlue(document.body);
      else revertBlue();
    }
  });

  // Mutation observer for new nodes
  const observer = new MutationObserver((muts) => {
    if (!state.enabled) return;
    for (const m of muts) {
      for (const node of m.addedNodes) scanBlue(node);
    }
  });

  function begin() {
    observer.observe(document.body, { childList: true, subtree: true });
    scanBlue(document.body); // initial full scan
  }
  if (document.body) begin();
  else document.addEventListener("DOMContentLoaded", begin);
}

init();
