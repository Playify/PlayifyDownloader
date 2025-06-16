console.log("[PlayifyDownloader] 9xbuddy loaded");

function wait(t: number): Promise<true>{
	return new Promise(r=>setTimeout(r,t,true));
}

(async function handle9xBuddy(){


	console.log("[PlayifyDownloader] filling in name")

	const getText=()=>document.getElementById("input_name") as HTMLInputElement;

	await wait(100);
	let text=getText();
	let button: HTMLElement;
	if(!text){
		do{
			if(document.querySelector(".fa-triangle-exclamation")){
				console.log("[PlayifyDownloader] Failed to load, retrying")
				await wait(1000);
				location.reload();
			}
			button=document.querySelector<HTMLElement>("button.w-full.flex");
		}while(!button&& await wait(100));
		button.click();
		await wait(0);

		do text=getText();
		while(!text&& await wait(100));
	}//else button=getButton();

	text.focus();
	let usesFallback=false;
	let name=decodeURIComponent(document.location.hash.replace(/^#/,""));
	if(name) text.value=name;
	else{
		name=text.value.replace(/_?\[quality]/ig,"");
		usesFallback=true;
	}
	text.blur();

	console.log("[PlayifyDownloader] gettings download links")

	let anchors: NodeListOf<HTMLAnchorElement>;
	do anchors=document.querySelectorAll<HTMLAnchorElement>("a.w-full");
	while(!anchors.length&&await wait(100));

	for(let a of anchors){
		const url=new URL(a.href);
		if(url.searchParams.has("customName")){
			url.searchParams.set("customName",name);
			a.href=url.toString();
		}
	}

	const anchor=getBestLink(anchors);

	if(!anchor){
		console.warn("[PlayifyDownloader] error finding a download link");
		return;
	}

	let url=anchor.href;
	console.log("[PlayifyDownloader] Found download link: ",url)

	chrome.runtime.sendMessage({
		action:"download",
		url,
		title:usesFallback?null:name
	});


})().catch(console.error);

function getBestLink(anchors: NodeListOf<HTMLAnchorElement>){
	//Find 9xbuddy link
	for(let anchor of anchors)
		if(new URL(anchor.href).hostname.endsWith("9xbud.com"))
			return anchor;
	//Otherwise find any link
	for(let anchor of anchors)
		if(anchor.href)
			return anchor;
	return null;
}
