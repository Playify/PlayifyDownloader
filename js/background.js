"use strict";
async function runRemote(tabId, func, arg) {
    return (await chrome.scripting.executeScript({
        func,
        args: arg == undefined ? [] : [arg],
        target: {
            tabId
        },
        world: "MAIN",
    }))[0].result;
}
async function runRemoteFrame(tabId, frameId, func) {
    return (await chrome.scripting.executeScript({
        func,
        target: {
            tabId,
            frameIds: [frameId]
        },
        world: "MAIN",
    }))[0].result;
}
//endregion
//region file name
async function findFileName(msg, sender) {
    let s = msg.name;
    const long = false;
    if (msg.title)
        s ||= getEpisodeNameFromTitle(msg.title, long);
    s ||= await getNameFromUrl(sender.tab, long);
    s ||= msg.title;
    if (s == null) {
        console.log("[PlayifyDownloader] didn't find name for ", msg);
        return null;
    }
    s = s.trim()
        .replace(/^Watch +/ig, "")
        .replace(/(\.(mp4|mkv))+$/ig, "")
        .replace(/ *:+ */ig, " - ")
        .trim();
    return s;
}
function getEpisodeNameFromTitle(title, long) {
    const match = title.match(/S0*([0-9]+)[. ]?E0*([0-9]+)/) ??
        title.match(/E0*([0-9]+)/) ??
        title.match(/\.0*([0-9]{1-3})\./);
    if (match)
        return long && match.length == 3 ? `S${match[1]}E${match[2]}` : match[2];
    return null;
}
async function getNameFromUrl(tab, long) {
    const url = new URL(tab.url);
    switch (url.host) {
        case "bs.to": {
            const match = url.pathname.match(/^\/serie\/[^/]*\/([0-9]+)\/([0-9]+)-/i);
            if (match)
                return long ? `S${match[1]}E${match[2]}` : match[2];
            throw new Error("Unknown bs.to path: " + url);
        }
        case "aniworld.to":
        case "serien.sx":
        case "s.to": {
            const match = url.pathname.match(/^\/(?:serie|anime)\/stream\/[^/]*\/staffel-([0-9]+)\/episode-([0-9]+)/i);
            if (match)
                return long ? `S${match[1]}E${match[2]}` : match[2];
            const matchFilm = url.pathname.match(/^\/(?:serie|anime)\/stream\/[^/]*\/filme\/film-([0-9]+)/i);
            if (matchFilm)
                return await runRemote(tab.id, () => {
                    return document.querySelector(".episodeGermanTitle,.episodeEnglishTitle").textContent;
                });
            throw new Error("Unknown s.to path: " + url);
        }
        case "streamkiste.tv": {
            return await runRemote(tab.id, () => {
                return document.querySelector("div.title>h1").textContent;
            });
        }
        case "megakino.co": {
            return await runRemote(tab.id, () => {
                return document.querySelector("header>h1:first-child")?.textContent;
            });
        }
        case "vidoza.net": {
            return await runRemote(tab.id, () => {
                return document.querySelector(".video_download_header h1").textContent;
            });
        }
    }
    return null;
}
//endregion
chrome.webRequest?.onCompleted.addListener(async (details) => {
    if (details.initiator == "https://voe.sx") {
        if (details.url.endsWith("/master.m3u8")) {
            await runRemote(details.tabId, url => {
                const a = document.createElement("a");
                a.href = url;
                a.textContent = "[M3U8]";
                Object.assign(a.style, {
                    position: "fixed",
                    top: "2rem",
                    left: "0",
                    zIndex: "99999",
                    fontSize: "2rem",
                    color: "gray"
                });
                document.body.append(a);
            }, details.url);
        }
    }
    console.log("[PlayifyDownloader] ", details);
}, { urls: ["*://*/*.m3u8"] });
chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [
            {
                id: 1,
                priority: 1,
                action: { type: "modifyHeaders", responseHeaders: [{ header: "X-Frame-Options", operation: "remove" }] },
                condition: {
                    urlFilter: "*://9xbuddy.com/*",
                    resourceTypes: ["main_frame", "sub_frame"]
                }
            }
        ],
        removeRuleIds: [1]
    }).catch(console.error);
});
chrome.runtime.onMessage.addListener(async (msg, sender) => await messageReceiver[msg.action](msg, sender));
const messageReceiver = {
    download: async (msg, sender) => {
        let filename = await findFileName(msg, sender);
        if (filename == null)
            return;
        filename += ".mp4";
        chrome.downloads.download({
            url: msg.url,
            filename: filename,
        }, async function (e) {
            try {
                await runRemote(sender.tab.id, () => {
                    if (!document.title.startsWith("[✔️] "))
                        document.title = "[✔️] " + document.title;
                });
            }
            catch (e) {
                //Don't care if tab is already closed
                if (!e.message.startsWith("No tab with id: "))
                    throw e;
            }
            console.table({
                url: msg.url,
                filename,
                tabUrl: sender.tab.url,
                tabTitle: sender.tab.title,
                downloadId: e
            });
        });
    },
    "9xbuddy": async (msg, sender) => {
        const filename = await findFileName(msg, sender);
        if (filename == null)
            return;
        console.table({
            action: "9xbuddy",
            url: msg.url,
            filename,
            tabUrl: sender.tab.url,
            tabTitle: sender.tab.title,
            msg
        });
        await runRemote(sender.tab.id, url => {
            const a = document.createElement("a");
            a.href = url;
            a.textContent = "[9xBuddy]";
            Object.assign(a.style, {
                position: "fixed",
                top: "0",
                left: "0",
                zIndex: "99999",
                fontSize: "2rem",
                color: "blue"
            });
            document.body.append(a);
            const iframe = document.createElement("iframe");
            iframe.src = url;
            Object.assign(iframe.style, {
                height: "80vh",
                width: "100%",
                border: "none",
                borderTop: "4px solid red",
                overflow: "hidden"
            });
            document.body.append(iframe);
        }, "https://9xbuddy.com/process?url=" + encodeURIComponent(sender.url) +
            "#" + encodeURIComponent(filename));
    },
    m3u8: async (msg, sender) => {
        console.table({
            action: "m3u8",
            url: msg.url,
            msg
        });
        await runRemote(sender.tab.id, (href) => {
            const a = document.createElement('a');
            a.href = href;
            a.textContent = '[M3U8]';
            Object.assign(a.style, {
                position: 'fixed',
                top: '2rem',
                left: '0',
                zIndex: '99999',
                fontSize: '2rem',
                color: 'gray'
            });
            document.body.append(a);
        }, msg.url);
    },
    rightclick: async (_, sender) => {
        await runRemoteFrame(sender.tab.id, sender.frameId, () => {
            console.log("Unblocking Mouse");
            // unblock contextmenu and more
            Object.defineProperty(MouseEvent.prototype, 'preventDefault', {
                get() {
                    return () => {
                    };
                },
                set(c) {
                    console.info('a try to overwrite "preventDefault"', c);
                }
            });
            Object.defineProperty(MouseEvent.prototype, 'returnValue', {
                get() {
                    return true;
                },
                set(c) {
                    console.info('a try to overwrite "returnValue"', c);
                    this.v = c;
                }
            });
        });
        await runRemote(sender.tab.id, () => {
            if (!document.title.startsWith("[🖱️] "))
                document.title = "[🖱️] " + document.title;
        });
    },
    closeDone: async (_, __) => {
        for (let tab of await chrome.tabs.query({})) {
            if (tab.title.startsWith("[✔️] ")) {
                await chrome.tabs.remove(tab.id); //TODO check if this will fuck up chrome if its the last tab
            }
        }
    },
};
//# sourceMappingURL=background.js.map