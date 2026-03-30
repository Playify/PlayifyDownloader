"use strict";
console.log("[PlayifyDownloader] init episode");
let blockIframes = true;
window.addEventListener("load", () => blockIframes = false);
new MutationObserver(list => {
    for (const mutation of list)
        for (const node of mutation.addedNodes)
            if (node.tagName === "IFRAME" && node.hasAttribute("allowfullscreen")) {
                node.src = "about:blank"; //Default to blank
                new MutationObserver((iframeMutations, observer) => {
                    if (iframeMutations.every(m => m.attributeName != "src"))
                        return;
                    if (!blockIframes)
                        return observer.disconnect();
                    if (!loadBestHost(node))
                        return; //need to look at it again
                    observer.disconnect();
                }).observe(node, { attributes: true });
            }
}).observe(document, { childList: true, subtree: true });
function loadBestHost(iframe) {
    const isNew = document.querySelector("#episode-nav.mb-3 a") != null;
    if (isNew) {
        const language = "german" /* Language.German */;
        const hosts = [
            ["VOE", language],
            ["Vidoza", language],
        ];
        for (let [host, lang] of hosts) {
            const element = document.querySelector(`button:has(img[alt='${host}']):has(use[href='#icon-flag-${lang}'])`);
            if (element) {
                console.log("[PlayifyDownloader] Found host:", host, " lang:", lang);
                //iframe.src=element.getAttribute("data-play-url");
                element.click();
                return true;
            }
        }
        const elementFallback = document.querySelector(`button:has(use[href='#icon-flag-${language}'])`);
        if (elementFallback) {
            console.log("[PlayifyDownloader] Found fallback lang:", language);
            //iframe.src=elementFallback.getAttribute("data-play-url");
            elementFallback.click();
            return true;
        }
        if (iframe.src != "about:blank") {
            iframe.src = "about:blank";
            document.querySelector(`button.link-box.active`)?.classList.remove("active");
            console.warn("[PlayifyDownloader] No host found lang:", language);
        }
        return false;
    }
    else {
        const hosts = [
            //"Streamtape","Vidoza","VOE"
            "VOE"
        ];
        for (let host of hosts) {
            const element = document.querySelector("a:has(.icon." + host + ")");
            if (!element)
                continue;
            console.log("[PlayifyDownloader] Found host: ", host);
            iframe.src = element.href;
            return true;
        }
        //if host found, but no good one, then just give up and use the first one
        if (document.querySelector("i.icon[title^='Hoster ']"))
            console.warn("[PlayifyDownloader] No good host found");
        else
            console.warn("[PlayifyDownloader] No host found at all");
        return false;
    }
}
//# sourceMappingURL=episode.js.map