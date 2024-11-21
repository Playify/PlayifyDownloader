"use strict";
for (let button of document.querySelectorAll("button[data-action]")) {
    const action = button.getAttribute("data-action");
    button.addEventListener("click", () => chrome.runtime.sendMessage({ action }));
}
//# sourceMappingURL=popup.js.map