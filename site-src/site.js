const endpoint = "https://mingpan.bzwai.com/mcp";
const status = document.querySelector(".copy-status");
let hideStatusTimer;

function showStatus(message) {
  if (!(status instanceof HTMLElement)) return;
  status.textContent = message;
  status.dataset.visible = "true";
  window.clearTimeout(hideStatusTimer);
  hideStatusTimer = window.setTimeout(() => {
    delete status.dataset.visible;
  }, 5000);
}

async function copyEndpoint() {
  const success = document.body.dataset.copySuccess || "Copied";
  const failure = document.body.dataset.copyFailure || "Copy failed";
  try {
    await navigator.clipboard.writeText(endpoint);
    showStatus(success);
  } catch {
    showStatus(failure);
  }
}

for (const button of document.querySelectorAll("[data-copy-endpoint]")) {
  button.addEventListener("click", copyEndpoint);
}

// 複製的內容只來自建置期寫死的 data-copy-text（指令或設定片段），不讀取任何使用者輸入。
for (const button of document.querySelectorAll("[data-copy-text]")) {
  button.addEventListener("click", async () => {
    const text = button.dataset.copyText;
    if (!text) return;
    const success = button.dataset.copiedLabel || document.body.dataset.copySuccess || "Copied";
    const failure = document.body.dataset.copyFailure || "Copy failed";
    try {
      await navigator.clipboard.writeText(text);
      showStatus(success);
    } catch {
      showStatus(failure);
    }
  });
}

const languageMenu = document.querySelector(".language-menu");
document.addEventListener("click", (event) => {
  if (languageMenu instanceof HTMLDetailsElement && !languageMenu.contains(event.target)) {
    languageMenu.open = false;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && languageMenu instanceof HTMLDetailsElement && languageMenu.open) {
    languageMenu.open = false;
    languageMenu.querySelector("summary")?.focus();
  }
});
