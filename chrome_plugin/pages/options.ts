for(let button of document.querySelectorAll("button[data-action]")){
	const action=button.getAttribute("data-action");
	button.addEventListener("click",()=>chrome.runtime.sendMessage({action}));
}

for(let input of document.querySelectorAll<HTMLInputElement>("[data-name]")){
	const name=input.getAttribute("data-name");
	if(input.type=="checkbox"){
		chrome.storage.local.get(name).then(b=>input.checked=b[name]??false);
		input.addEventListener("input",()=>chrome.storage.local.set({[name]:input.checked}));
	}else if(input.type=="number"){
		chrome.storage.local.get(name).then(b=>input.value=(b[name]??0));
		input.addEventListener("input",()=>chrome.storage.local.set({[name]:input.value||undefined}));
	}else{
		chrome.storage.local.get(name).then(b=>input.value=(b[name]??""));
		input.addEventListener("input",()=>chrome.storage.local.set({[name]:input.value||undefined}));
	}
}