"use strict";
console.log("[PlayifyDownloader] init season");
const a = document.createElement("span");
a.textContent = "[Open all]";
Object.assign(a.style, {
    position: "fixed",
    top: "0",
    left: "0",
    zIndex: "99999",
    fontSize: "2rem",
    color: "blue",
    cursor: "pointer",
});
document.body.append(a);
a.onclick = e => {
    e.preventDefault();
    console.log("[PlayifyDownloader] Starting timers");
    const delay = 1000;
    let currDelay = -delay;
    for (let a of document.querySelectorAll("table.seasonEpisodesList td:first-child>a"))
        setTimeout(() => {
            console.log("[PlayifyDownloader] opening: " + a.href);
            window.open(a.href);
        }, currDelay += delay);
};
//# sourceMappingURL=season.js.map