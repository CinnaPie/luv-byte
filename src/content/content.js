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

    /* "게시물을 전송했습니다" 파란 토스트 알림 */
    [data-testid="toast"] {
      background-color: ${color} !important;
    }
    
    svg[data-testid="icon-verified"] path {
      fill: ${color} !important;
    }
    /* 새(안 읽은) 알림만 옅은 색 → 읽으면 자동으로 원래 색 복귀
       r-1peqgm7 = 트위터가 새 알림에만 붙이는 옅은 배경 클래스 */
    article[data-testid="notification"].r-1peqgm7 {
      background-color: ${color}1a !important;
    }

    /* 알림창 하트 (분홍 → 내 색으로) */
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

// =========================================================
//  트위터 파란색(rgb(29, 155, 240)) 자동 색 변경
//  · 표식 없이 클래스로만 칠해진 파란 요소까지 잡음
//  · 이미지/영상은 제외
//  · CSS 규칙(applyButtonColor)이 못 잡는 것들을 보완
// =========================================================
const recolored = new Map(); // 우리가 바꾼 요소 → 바꾼 속성들 기억

// 요소 하나 검사: 트위터 파랑이면 내 색으로
function recolorEl(el) {
  if (!el || el.nodeType !== 1) return;
  const tag = el.tagName;
  if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS") return; // 이미지류 제외

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

// 특정 영역 전체 훑기
function scanBlue(root) {
  if (!state.enabled || !root || root.nodeType !== 1) return;
  recolorEl(root);
  const all = root.querySelectorAll("*");
  for (let i = 0; i < all.length; i++) recolorEl(all[i]);
}

// 색이 바뀌면 이미 바꾼 것들도 새 색으로 갱신
function reapplyBlue() {
  for (const [el, props] of recolored) {
    if (!el.isConnected) { recolored.delete(el); continue; }
    for (const p of props) el.style.setProperty(p, state.buttonColor, "important");
  }
}

// 끄면 원래 색으로 복구
function revertBlue() {
  for (const [el, props] of recolored) {
    for (const p of props) el.style.removeProperty(p);
  }
  recolored.clear();
}

function startBlueRecolor() {
  // 색/켜짐 상태 변화 감지
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.buttonColor && state.enabled) reapplyBlue();
    if (changes.enabled) {
      if (changes.enabled.newValue !== false) scanBlue(document.body);
      else revertBlue();
    }
  });

  // 화면이 바뀔 때(스크롤·새 글 등) 새로 나타난 부분만 검사 → 가벼움
  const observer = new MutationObserver((muts) => {
    if (!state.enabled) return;
    for (const m of muts) {
      for (const node of m.addedNodes) scanBlue(node);
    }
  });

  function begin() {
    observer.observe(document.body, { childList: true, subtree: true });
    scanBlue(document.body); // 처음 한 번 전체 검사
  }
  if (document.body) begin();
  else document.addEventListener("DOMContentLoaded", begin);
}

init();
