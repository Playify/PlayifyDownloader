"use strict";
for (let button of document.querySelectorAll("button[data-action]")) {
    const action = button.getAttribute("data-action");
    button.addEventListener("click", () => {
        switch (action) {
            case "openConfig":
                chrome.runtime.openOptionsPage();
                break;
            default:
                chrome.runtime.sendMessage({ action });
                break;
        }
    });
}
const search = document.querySelector("input[data-action='search']");
search.addEventListener("keypress", async (e) => {
    if (e.key !== "Enter")
        return;
    const text = search.value;
    search.value = "";
    const providers = ((await chrome.storage.local.get("searchProviders")).searchProviders ?? "")
        .replaceAll("???", encodeURIComponent(text))
        .split('\n');
    chrome.runtime.sendMessage({ action: "multiSearch", providers, title: text });
});
//# sourceMappingURL=popup.js.map