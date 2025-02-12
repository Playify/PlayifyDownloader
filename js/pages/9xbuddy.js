"use strict";
console.log("[PlayifyDownloader] 9xbuddy loaded");
/*
let currInterval=setInterval(function(){
    let element: HTMLElement;
    element=<HTMLElement>document.evaluate("//button/div[text()='Options']",document,
        null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue;
    if(!element) return
    
    element.click();
    clearInterval(currInterval);
    
    const hash=decodeURIComponent(document.location.hash.replace(/^#/,""));
    if(hash=="")return;//No Filename selected

    currInterval=setInterval(changeFileName,10,hash);
},100);

function changeFileName(name:string){
    const input=<HTMLInputElement>document.getElementById("input_name");
    if(!input) return;


    let arr:HTMLAnchorElement[]=[];
    const result=document.evaluate("//span[text()='Download Now']/parent::a",document,
        null,XPathResult.ORDERED_NODE_ITERATOR_TYPE ,null);
    for(let node=result.iterateNext();node;node=result.iterateNext())
        arr.push(<HTMLAnchorElement>node);
    
    if(arr.length==0){
        console.log("No Download button found");
        return;
    }
    
    const last=arr[arr.length-1];
    
    let url=last.href;
    url=url.replace(/&customName=.*$/ig,"");
    url+="customName="+encodeURIComponent(name);


    chrome.runtime.sendMessage({
        action:'download',
        url,
        title:name,
        name
    });
    
    
    setTimeout(()=>{

        input.focus();
        input.value=name;
        input.blur();
    },100)

    
    clearInterval(currInterval);
}
*/
function wait(t) {
    return new Promise(r => setTimeout(r, t, true));
}
(async function handle9xBuddy() {
    console.log("[PlayifyDownloader] filling in name");
    const getText = () => document.getElementById("input_name");
    await wait(100);
    let text = getText();
    let button;
    if (!text) {
        do {
            if (document.querySelector(".fa-triangle-exclamation")) {
                console.log("[PlayifyDownloader] Failed to load, retrying");
                await wait(1000);
                location.reload();
            }
            button = document.querySelector("button.w-full.flex");
        } while (!button && await wait(100));
        button.click();
        await wait(0);
        do
            text = getText();
        while (!text && await wait(100));
    } //else button=getButton();
    text.focus();
    let usesFallback = false;
    let name = decodeURIComponent(document.location.hash.replace(/^#/, ""));
    if (name)
        text.value = name;
    else {
        name = text.value.replace(/_?\[quality]/ig, "");
        usesFallback = true;
    }
    text.blur();
    console.log("[PlayifyDownloader] gettings download links");
    let anchors;
    do
        anchors = document.querySelectorAll("a.w-full");
    while (!anchors.length && await wait(100));
    for (let a of anchors) {
        const url = new URL(a.href);
        if (url.searchParams.has("customName")) {
            url.searchParams.set("customName", name);
            a.href = url.toString();
        }
    }
    const anchor = getBestLink(anchors);
    if (!anchor) {
        console.warn("[PlayifyDownloader] error finding a download link");
        return;
    }
    let url = anchor.href;
    console.log("[PlayifyDownloader] Found download link: ", url);
    chrome.runtime.sendMessage({
        action: "download",
        url,
        title: usesFallback ? null : name,
        name
    });
})().catch(console.error);
function getBestLink(anchors) {
    //Find 9xbuddy link
    for (let anchor of anchors)
        if (new URL(anchor.href).hostname.endsWith("9xbud.com"))
            return anchor;
    //Otherwise find any link
    for (let anchor of anchors)
        if (anchor.href)
            return anchor;
    return null;
}
//# sourceMappingURL=9xbuddy.js.map