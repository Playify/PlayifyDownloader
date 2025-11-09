console.log("[PlayifyDownloader] init Cine.to");

document.addEventListener("DOMContentLoaded", () => {
	const q=new URLSearchParams(document.location.search).get("q");
	if(!q) return;
	
	const search=document.querySelector<HTMLInputElement>("input[name=search]");
	
	console.log("[PlayifyDownloader] Searching for "+q);
	
	search.value=q;
	search.dispatchEvent(new KeyboardEvent("keyup"));
});