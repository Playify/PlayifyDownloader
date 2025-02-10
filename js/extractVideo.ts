console.log("[PlayifyDownloader] init extractVideo");


function startEnableRightClick(){
	console.log("[PlayifyDownloader] Enabling RightClick");
	const skip=(e: MouseEvent)=>e.stopPropagation();
	document.addEventListener("contextmenu",skip,true);
	document.addEventListener("mousedown",skip,true);


	chrome.runtime.sendMessage({
		action:"rightclick",
	});
}
function start9xBuddy(title:string){
	console.log("[PlayifyDownloader] Redirecting to 9xBuddy");
	chrome.runtime.sendMessage({
		action:"9xbuddy",
		url:new URL(document.URL),
		title,
	});
}

function startVideoFinder(clickInitialize: number,getTitle:()=>string){
	console.log("[PlayifyDownloader] startVideoFinder");
	const videoFinder=setInterval(function(){
		let v: HTMLElement & {src: string}=document.querySelector("video");
		if(!v?.src&&v?.firstElementChild) v=<HTMLSourceElement>v.firstElementChild;
		if(!v?.src) return;

		clearInterval(clickInitialize);
		clearInterval(videoFinder);

		let url=v.src;
		let title=getTitle();

		console.log("[PlayifyDownloader] Download Link Found: ",{
			v,
			url,
			title
		});
		chrome.runtime.sendMessage({
			action:"download",
			url,
			title
		});
	},10);
}


let titleTextContent=document.querySelector("title")?.textContent;

if(titleTextContent=="Streamtape.com"||document.querySelector('meta[name="og:sitename"][content="Streamtape.com"]')){
	let clickInitialize=setInterval(function clickInit(){
			(document.querySelector("[data-name='stitialer']+div") as HTMLElement)?.click();

			const element:HTMLElement=document.querySelector(".plyr-overlay")||document.querySelector(".play-overlay");
			if(element){
				element.click();
				clearInterval(clickInitialize);
				setInterval(clickInit,4000);//don't stop yet, maybe the listener was not attached yet, but only refresh not so often
			}
		},100);
	startVideoFinder(clickInitialize,()=>{
		return document.querySelector("meta[name='og:title']")?.getAttribute("content")
	});
}else if(titleTextContent=="Vidoza"){
	startVideoFinder(null,()=>{
		const scriptWithFilename=document.querySelector(".body-container>script[type]:not([src])");
		let match=scriptWithFilename?.textContent.match(/src: (".*?")/);
		match||=scriptWithFilename?.textContent.match(/curFileName ?= ?(".*");/);//Old one
		if(!match){
			console.warn("[PlayifyDownloader] Error finding link for vidoza page");
			return null;
		}
		return JSON.parse(match[1]);//must be parsed, because text could contain escaped characters
	});
}else if(document.querySelector("a[href='https://vidoza.net']")||document.location.host=="vidoza.net"){
	startVideoFinder(null,()=>document.querySelector("h1").textContent);
}
else if(titleTextContent?.endsWith(" - DoodStream")){//can only use right click, save as. No alternative found yet
	startEnableRightClick();
}
else if(document.location.host=="www.3donlinefilms.com"){//Auto download would work, but not if multiple tabs of this domain are opened at once, also, it would interfere with browsing
	startEnableRightClick();
}
else if(document.querySelector("video#voe-player")){//VOE
	let title=document.querySelector("meta[name='description']")?.getAttribute("content");
	title??=titleTextContent;
	title=title.replace(/(at VOE| - VOE \|.*?)$/,"")
	
	start9xBuddy(title);
	//startM3U8(title); //will be handled by extractM3u8 file, as the listener needs to be attached in document_start and the logic in here needs the body to be already loaded
}
else if(titleTextContent?.startsWith("StreamZZ.to ")){//StreamZ.ws
	startVideoFinder(null,()=>titleTextContent.substring("StreamZZ.to ".length));
}
else if(document.location.host=="upstream.to"){
	start9xBuddy(null);
}
else if(document.location.host=="mixdrop.co"){
	let clickInitialize=setInterval(function clickInit(){
		const element:HTMLElement=document.querySelector("button.vjs-big-play-button");
		if(element){
			element.click();
			clearInterval(clickInitialize);
			setInterval(clickInit,4000);//don't yet stop, maybe the listener was not attached yet, but only refresh not so often
			return;
		}
	},100);
	startVideoFinder(clickInitialize,()=>document.querySelector(".title>a")?.textContent);
}