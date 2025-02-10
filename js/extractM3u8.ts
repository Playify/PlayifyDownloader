new PerformanceObserver((list)=>{
	for(const entry of list.getEntries()){
		if(new URL(entry.name).pathname.endsWith("/master.m3u8")){
			if(document.readyState=="complete") onDocumentReady(entry.name);
			document.addEventListener("readystatechange",()=>{
				if(document.readyState=="complete") onDocumentReady(entry.name);
			});
		}
	}
}).observe({ entryTypes: ["resource"] });


function onDocumentReady(url:string){
	if(!document.querySelector<HTMLMetaElement>("meta[name='og:url']")?.content?.startsWith("https://voe.sx/"))return;
	
	let title=document.querySelector("meta[name='description']")?.getAttribute("content");
	title??=document.querySelector("title")?.textContent;
	title=title.replace(/(at VOE| - VOE \|.*?)$/,"")
	
	chrome.runtime.sendMessage({
		action:"m3u8",
		url,
		title,
	});
}
