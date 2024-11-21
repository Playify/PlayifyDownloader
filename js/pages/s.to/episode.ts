console.log("[PlayifyDownloader] init episode");

new MutationObserver(list=>{
	for (const mutation of list)
		for(const node of mutation.addedNodes as any as HTMLIFrameElement[])
			if(node.tagName==='IFRAME'&&node.hasAttribute("allowfullscreen")){
				node.src='about:blank';//Default to blank

				new MutationObserver((iframeMutations,observer)=>{
					if(iframeMutations.every(m=>m.attributeName!="src")) return;
					observer.disconnect();
					loadBestHost(node);
				}).observe(node,{attributes:true});
			}
}).observe(document,{childList:true,subtree:true});

function loadBestHost(iframe:HTMLIFrameElement){
	const hosts=[
		"Streamtape","Vidoza","VOE"
	];

	for(let host of hosts){
		const element=document.querySelector<HTMLAnchorElement>("a:has(.icon."+host+")");
		if(!element) continue;
		console.log("[PlayifyDownloader] Found host: ",host);
		iframe.src=element.href;
		return;
	}

	//if host found, but no good one, then just give up and use the first one
	if(document.querySelector("i.icon[title^='Hoster ']"))
		console.warn("[PlayifyDownloader] No good host found");
	else console.warn("[PlayifyDownloader] No host found at all");
}