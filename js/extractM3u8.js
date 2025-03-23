"use strict";
new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
        if (URL.canParse(entry.name) && new URL(entry.name).pathname.endsWith("/master.m3u8")) {
            console.log("[PlayifyDownloader] found M3u8 link (document is " + document.readyState + ")");
            if (document.readyState == "complete")
                onM3u8andDocumentReady(entry.name);
            document.addEventListener("readystatechange", () => {
                if (document.readyState == "complete")
                    onM3u8andDocumentReady(entry.name);
            });
        }
    }
}).observe({ entryTypes: ["resource"] });
function onM3u8andDocumentReady(url) {
    if (!document.querySelector("meta[name='keywords']")?.content?.includes("VOE"))
        return;
    let title = document.querySelector("meta[name='description']")?.getAttribute("content");
    title ??= document.querySelector("title")?.textContent;
    title = title.replace(/(at VOE| - VOE \|.*?| bei VOE ansehen)$/, "");
    chrome.runtime.sendMessage({
        action: "m3u8",
        url,
        title,
    });
    chrome.storage.local.get("useFFmpeg").then(b => b.useFFmpeg && chrome.runtime.sendMessage({
        action: "ffmpeg",
        url,
        title,
    }));
}
document.addEventListener("playifyDownloader", (evt) => evt.detail && chrome.runtime.sendMessage(evt.detail));
//# sourceMappingURL=extractM3u8.js.map