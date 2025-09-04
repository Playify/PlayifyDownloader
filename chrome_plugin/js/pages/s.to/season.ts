console.log("[PlayifyDownloader] init season");

// javascript:navigator.clipboard.writeText([...document.querySelectorAll("a:has(strong)")].map(x=>"start \"\" \""+x.href+"\"\n").join("")).catch(alert)
const openAll=document.createElement("span");
openAll.textContent="[Open all]";
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
	await runOpenAll(!(e.ctrlKey||e.altKey||e.shiftKey),false);
	markDone();
};
function markDone(){
	if(!document.title.startsWith(`[✔️] `))// noinspection RegExpDuplicateCharacterInClass
		document.title=`[✔️] ${document.title.replace(/^(\[[✔️❌🖱⏳]+] )+/g,"")}`;
}
async function runOpenAll(wait:boolean,close:boolean){
	if(!document.title.startsWith(`[⏳] `))// noinspection RegExpDuplicateCharacterInClass
		document.title=`[⏳] ${document.title.replace(/^(\[[✔️❌🖱⏳]+] )+/g,"")}`;
	
	for(let a of document.querySelectorAll<HTMLAnchorElement>("table.seasonEpisodesList td:first-child>a")){
		if(wait)
			await new Promise(resolve=>chrome.runtime.sendMessage({action:"wait"},resolve));
		if(close) chrome.runtime.sendMessage({action:"closeDone"});

		console.log("[PlayifyDownloader] opening: "+a.href);
		window.open(a.href);

		await new Promise(resolve=>setTimeout(resolve,1000));
	}
}



const autoAll=document.createElement("span");
autoAll.textContent="[Auto All]";
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
	let nextSeason=document.querySelector<HTMLAnchorElement>(".hosterSiteDirectNav>ul:first-child li:has(a.active)+li a")?.href;
	if(!nextSeason){
		if(close){
			await new Promise(resolve=>setTimeout(resolve,2000));
			chrome.runtime.sendMessage({action:"closeDone"});
		}
		markDone();
		return;
	}
	nextSeason+="#auto="+(wait?"w":"")+(close?"c":"");
	location.href=nextSeason;
}
if(location.hash.startsWith("#auto=")){
	const auto=location.hash.substring(6);
	history.replaceState(null,"",location.pathname+location.search);
	runAutoAll(auto.includes("w"),auto.includes("c"));
}