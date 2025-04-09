"use strict";
for (let button of document.querySelectorAll("button[data-action]")) {
    const action = button.getAttribute("data-action");
    button.addEventListener("click", () => chrome.runtime.sendMessage({ action }));
}
const useFFmpeg = document.querySelector("#useFFmpeg");
chrome.storage.local.get("useFFmpeg").then(b => useFFmpeg.checked = b.useFFmpeg);
useFFmpeg.addEventListener("click", () => chrome.storage.local.set({ useFFmpeg: useFFmpeg.checked }));
const useSeriesFolder = document.querySelector("#useSeriesFolder");
chrome.storage.local.get("useSeriesFolder").then(b => useSeriesFolder.checked = b.useSeriesFolder);
useSeriesFolder.addEventListener("click", () => chrome.storage.local.set({ useSeriesFolder: useSeriesFolder.checked }));
//# sourceMappingURL=popup.js.map