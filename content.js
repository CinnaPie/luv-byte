const DEFAULT_IMAGE = chrome.runtime.getURL("images/pop.png");
const DEFAULT_SIZE = 45;
const TWITTER_BLUE = "rgb(29, 155, 240)";

let enabled = true;
let popImageUrl = DEFAULT_IMAGE;
let popSize = DEFAULT_SIZE;
let buttonColor = "#1d9bf0";

// 저장값 불러오기
chrome.storage.local.get(
  ["enabled", "popImage", "popSize", "buttonColor"],
  (data) => {
    enabled = data.enabled !== false;
    if (data.popImage) popImageUrl = data.popImage;
    if (data.popSize) popSize = data.popSize;
    if (data.buttonColor) buttonColor = data.buttonColor;
    applyButtonColor();
  }
);

// 설정 변경 즉시 반영
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.enabled) enabled = changes.enabled.newValue !== false;
  if (changes.popImage) popImageUrl = changes.popImage.newValue || DEFAULT_IMAGE;
  if (changes.popSize) popSize = changes.popSize.newValue || DEFAULT_SIZE;
  if (changes.buttonColor) buttonColor = changes.buttonColor.newValue || buttonColor;
  if (changes.enabled || changes.buttonColor) applyButtonColor();
});

// X 색상 바꾸기
function applyButtonColor() {
  let style = document.getElementById("luvbyte-btn-color");
  // 꺼져 있으면 색 규칙 제거 (원래 트위터 색으로)
  if (!enabled) {
    if (style) style.remove();
    return;
  }
  if (!style) {
    style = document.createElement("style");
    style.id = "luvbyte-btn-color";
    document.head.appendChild(style);
  }
  const c = buttonColor;
  style.textContent = `
    [data-testid="SideNav_NewTweet_Button"],
    [data-testid="SideNav_NewTweet_Button"]:hover,
    [data-testid="tweetButton"],
    [data-testid="tweetButton"]:hover,
    [data-testid="tweetButtonInline"],
    [data-testid="tweetButtonInline"]:hover {
      background-color: ${c} !important;
    }
    [style*="background-color: ${TWITTER_BLUE}"] { background-color: ${c} !important; }
    [style*="color: ${TWITTER_BLUE}"] { color: ${c} !important; }
    [style*="border-color: ${TWITTER_BLUE}"] { border-color: ${c} !important; }

    [aria-label*="안 읽은 항목"] {
      background-color: ${c} !important;
    }
  `;
}

// 지정된 이미지로 하트 대체
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
  img.src = popImageUrl;
  img.className = "heart-pop-img";
  img.style.left = x + "px";
  img.style.top = y + "px";
  img.style.width = popSize + "px";
  document.body.appendChild(img);
  setTimeout(() => img.remove(), 1000);
}

document.addEventListener(
  "click",
  (event) => {
    if (!enabled) return;
    const likeButton = event.target.closest('[data-testid="like"]');
    if (!likeButton) return;
    const heartIcon = likeButton.querySelector("svg") || likeButton;
    const rect = heartIcon.getBoundingClientRect();
    showPop(rect.left + rect.width / 2, rect.top + rect.height / 2);
  },
  true
);
