console.log("[PlayifyDownloader] init Filmpalast");


(()=>{
	const hosts=[
		"VOE"
	];
	
	
	//Fix favicon
	for(let link of document.querySelectorAll("link"))
		document.head.appendChild(link);

	//Fix setInterval loop
	chrome.runtime.sendMessage({action:"filmpalast"});
	
	//Show iframe if needed, otherwise not on movie page
	if(!document.querySelector("iframe"))return;
	document.querySelector("iframe").style.display=null;
	
	const obj=Object.create(null);
	for(let container of document.querySelectorAll("ul.currentStreamLinks")){
		const host=container.querySelector(".hostName").textContent;
		const button=container.querySelector(".button");
		obj[host]=button;

		if(!button.hasAttribute("href")) continue;
		
		button.addEventListener("click",e=>{
			e.preventDefault();
			e.stopImmediatePropagation();
			document.querySelector("iframe").src=button.getAttribute("href");
		});
	}

	setTimeout(()=>{
		for(let host of hosts)
			for(let key in obj)
				if(key.startsWith(host+" ")){
					obj[key].click();
					console.log("[PlayifyDownloader] Chosen Host: "+key);
					return;
				}
	},1000);
})();