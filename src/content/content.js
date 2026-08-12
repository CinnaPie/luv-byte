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

init();
