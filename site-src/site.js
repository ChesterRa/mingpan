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
  }, 2600);
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

const languageMenu = document.querySelector(".language-menu");
document.addEventListener("click", (event) => {
  if (languageMenu instanceof HTMLDetailsElement && !languageMenu.contains(event.target)) {
    languageMenu.open = false;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && languageMenu instanceof HTMLDetailsElement) {
    languageMenu.open = false;
    languageMenu.querySelector("summary")?.focus();
  }
});
