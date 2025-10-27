for(let button of document.querySelectorAll("button[data-action]")){
	const action=button.getAttribute("data-action");
	button.addEventListener("click",()=>chrome.runtime.sendMessage({action}));
}

const useFFmpeg=document.querySelector<HTMLInputElement>("#useFFmpeg");
chrome.storage.local.get("useFFmpeg").then(b=>useFFmpeg.checked=b.useFFmpeg??false);
useFFmpeg.addEventListener("click",()=>chrome.storage.local.set({useFFmpeg:useFFmpeg.checked}));



const useSeriesFolder=document.querySelector<HTMLInputElement>("#useSeriesFolder");
chrome.storage.local.get("useSeriesFolder").then(b=>useSeriesFolder.checked=b.useSeriesFolder??false);
useSeriesFolder.addEventListener("click",()=>chrome.storage.local.set({useSeriesFolder:useSeriesFolder.checked}));



const maxFfmpeg=document.querySelector<HTMLInputElement>("#maxFfmpeg");
chrome.storage.local.get("maxFfmpeg").then(b=>maxFfmpeg.value=b.maxFfmpeg??0);
maxFfmpeg.addEventListener("input",()=>chrome.storage.local.set({maxFfmpeg:maxFfmpeg.value||undefined}));