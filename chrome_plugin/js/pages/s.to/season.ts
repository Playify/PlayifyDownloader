console.log("[PlayifyDownloader] init season");

const openAll=document.createElement("span");
openAll.textContent="[Season]";
Object.assign(openAll.style,{
	position:"fixed",
	top:"0",
	left:"0",
	zIndex:"99999",
	fontSize:"2rem",
	color:"blue",
	cursor:"pointer",
});
document.body.append(openAll);
openAll.onclick=async e=>{
	e.preventDefault();
	console.log("[PlayifyDownloader] Opening all");
	await runOpenAll(!(e.ctrlKey||e.altKey||e.shiftKey),true);
	setEmoji("✔️");
};

// @ts-ignore setEmoji is defined multiple times in different files
function setEmoji(emoji:string){
	if(!document.title.startsWith(`[${emoji}] `))
		document.title=`[${emoji}] ${document.title.replace(/^(\[[✔️❌🖱⏳ \d\/]+] )+/g,"")}`;
}

async function runOpenAll(wait:boolean,close:boolean){
	setEmoji("⏳");

	let i=0;

	let all=document.querySelectorAll<HTMLAnchorElement>(
		"table.seasonEpisodesList td:first-child>a");

	setEmoji(`⏳ ${i++}/${all.length}`);
	for(let a of all){
		if(wait)
			await new Promise(resolve=>chrome.runtime.sendMessage({action:"wait"},resolve));

		let url=a.href;
		if(close) url+=(url.includes("?")?"&":"?")+"autoClose";

		console.log("[PlayifyDownloader] opening: "+url);
		setEmoji(`⏳ ${i++}/${all.length}`);

		chrome.runtime.sendMessage({action:"openTab",url});

		await new Promise(resolve=>setTimeout(resolve,1000));
	}
}


const autoAll=document.createElement("span");
autoAll.textContent="[Series]";
Object.assign(autoAll.style,{
	position:"fixed",
	top:"2rem",
	left:"0",
	zIndex:"99999",
	fontSize:"2rem",
	color:"blue",
	cursor:"pointer",
});
document.body.append(autoAll);

autoAll.onclick=async e=>{
	e.preventDefault();

	const wait=!(e.ctrlKey||e.altKey||e.shiftKey);

	console.log("[PlayifyDownloader] Auto all");
	await runAutoAll(wait,true);
};

async function runAutoAll(wait:boolean,close:boolean){
	await runOpenAll(wait,close);
	let nextSeason=document.querySelector<HTMLAnchorElement>(
		".hosterSiteDirectNav>ul:first-child li:has(a.active)+li a")?.href;
	if(!nextSeason){
		setEmoji("✔️");
		return;
	}
	nextSeason+="#auto="+(wait?"w":"")+(close?"c":"");
	location.href=nextSeason;
}

if(location.hash.startsWith("#auto=")){
	const auto=location.hash.substring(6);
	history.replaceState(null,"",location.pathname+location.search);
	runAutoAll(auto.includes("w"),auto.includes("c")).catch(console.error);
}