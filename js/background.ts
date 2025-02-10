import Tab=chrome.tabs.Tab;
import MessageSender=chrome.runtime.MessageSender;


//region runRemote
async function runRemote<T>(tabId:number,func:()=>T):Promise<T>;
async function runRemote<A,T>(tabId:number,func:(arg:A)=>T,arg:A):Promise<T>;
async function runRemote<A,T>(tabId:number,func:(arg?:A)=>T,arg?:A):Promise<T>{
	return (await chrome.scripting.executeScript({
		func,
		args:arg==undefined?[]:[arg],
		target:{
			tabId
		},
		world:"MAIN",
	}))[0].result;
}

async function runRemoteFrame<T>(tabId:number,frameId:number,func:()=>T):Promise<T>;
async function runRemoteFrame<A,T>(tabId:number,frameId:number,func:(arg:A)=>T,arg:A):Promise<T>;
async function runRemoteFrame<A,T>(tabId:number,frameId:number,func:(arg?:A)=>T,arg?:A):Promise<T>{
	return (await chrome.scripting.executeScript({
		func,
		args:arg==undefined?[]:[arg],
		target:{
			tabId,
			frameIds:[frameId]
		},
		world:"MAIN",
	}))[0].result;
}

async function runRemoteAndInFrame<T>(tabId:number,frameId:number,func:()=>T):Promise<[T,T]>;
async function runRemoteAndInFrame<A,T>(tabId:number,frameId:number,func:(arg:A)=>T,arg:A):Promise<[T,T]>;
async function runRemoteAndInFrame<A,T>(tabId:number,frameId:number,func:(arg?:A)=>T,arg?:A):Promise<[T,T]>{
	return Promise.all([
		runRemote(tabId,func,arg),
		runRemoteFrame(tabId,frameId,func,arg),
	]);
}

//endregion

//region file name
async function findFileName(msg:Message,sender:MessageSender){
	let s=msg.name;
	const long=false;

	if(msg.title) s||=getEpisodeNameFromTitle(msg.title,long);
	s||= await getNameFromUrl(sender.tab,long);
	s||=msg.title;
	if(s==null){
		console.log("[PlayifyDownloader] didn't find name for ",msg)
		return null;
	}

	s=s.trim()
		.replace(/^Watch +/ig,"")
		.replace(/(\.(mp4|mkv))+$/ig,"")
		.replace(/ *:+ */ig," - ")
		.trim();

	return s;
}

function getEpisodeNameFromTitle(title:string,long:boolean):string{
	const match=title.match(/S0*([0-9]+)[. ]?E0*([0-9]+)/)??
		title.match(/E0*([0-9]+)/)??
		title.match(/\.0*([0-9]{1-3})\./);
	if(match) return long&&match.length==3?`S${match[1]}E${match[2]}`:match[2];
	return null;
}

async function getNameFromUrl(tab:Tab,long:boolean):Promise<string>{
	const url=new URL(tab.url);
	switch(url.host){
		case "bs.to":{
			const match=url.pathname.match(/^\/serie\/[^/]*\/([0-9]+)\/([0-9]+)-/i);
			if(match) return long?`S${match[1]}E${match[2]}`:match[2];
			throw new Error("Unknown bs.to path: "+url);
		}
		case "aniworld.to":
		case "serien.sx":
		case "s.to":{
			const match=url.pathname.match(/^\/(?:serie|anime)\/stream\/[^/]*\/staffel-([0-9]+)\/episode-([0-9]+)/i);
			if(match) return long?`S${match[1]}E${match[2]}`:match[2];
			const matchFilm=url.pathname.match(/^\/(?:serie|anime)\/stream\/[^/]*\/filme\/film-([0-9]+)/i);
			if(matchFilm) return await runRemote(tab.id,
				()=>document.querySelector(".episodeGermanTitle,.episodeEnglishTitle").textContent);
			throw new Error("Unknown s.to path: "+url);
		}
		case "streamkiste.tv":{
			return await runRemote(tab.id,()=>document.querySelector("div.title>h1").textContent)
		}
		case "megakino.co":{
			return await runRemote(tab.id,()=>document.querySelector("header>h1:first-child")?.textContent)
		}
		case "vidoza.net":{
			return await runRemote(tab.id,()=>document.querySelector(".video_download_header h1").textContent)
		}
	}
	return null;
}

//endregion


chrome.runtime.onInstalled.addListener(()=>chrome.declarativeNetRequest.updateDynamicRules({
	addRules:[
		{
			id:1,
			priority:1,
			action:{type:"modifyHeaders",responseHeaders:[{header:"X-Frame-Options",operation:"remove"}]},
			condition:{
				urlFilter:"*://9xbuddy.com/*",
				resourceTypes:["main_frame","sub_frame"]
			}
		} as any
	],
	removeRuleIds:[1]
}).catch(console.error));


//region Message
interface Message{
	action:"download" | "9xbuddy" | "rightclick" | "m3u8" | "closeDone",
	name:string,
	title:string,
	url:string,
}

chrome.runtime.onMessage.addListener(async(msg:Message,sender)=>await messageReceiver[msg.action](msg,sender));
const messageReceiver:(Record<Message["action"],(msg:Message,sender:MessageSender)=>Promise<void>>)={
	download:async(msg:Message,sender:MessageSender)=>{
		let filename=await findFileName(msg,sender);
		if(filename==null) return;
		filename+=".mp4";


		chrome.downloads.download({
			url:msg.url,
			filename:filename,
		},async downloadId=>{

			chrome.downloads.onChanged.addListener(function onChangeListener(delta){
					if(!(delta.id==downloadId&&delta.state?.current=="complete")) return;
					chrome.downloads.onChanged.removeListener(onChangeListener)
					chrome.downloads.search({id:downloadId},([res])=>
						res?.fileSize==0&&res?.exists&&
						chrome.downloads.removeFile(downloadId,async()=>{

							console.info("deleted 0 byte file",{
								downloadId,
								filename,
								res,
							});

							try{
								await runRemote(sender.tab.id,()=>{
									if(!document.title.startsWith("[❌] "))
										document.title="[❌] "+document.title.replace(/^(\[(✔️|❌)] )+/g,"");
								});
							}catch(e){
								//Don't care if tab is already closed
								if(!e.message.startsWith("No tab with id: "))
									throw e;
							}
						}));
				}
			);


			try{
				await runRemote(sender.tab.id,()=>{
					if(!document.title.startsWith("[✔️] "))
						document.title="[✔️] "+document.title
				});
			}catch(e){
				//Don't care if tab is already closed
				if(!e.message.startsWith("No tab with id: "))
					throw e;
			}
			console.table({
				url:msg.url,
				filename,
				tabUrl:sender.tab.url,
				tabTitle:sender.tab.title,
				downloadId
			});
		});
	},
	"9xbuddy":async(msg:Message,sender:MessageSender)=>{
		const filename=await findFileName(msg,sender);
		if(filename==null) return;

		console.table({
			action:"9xbuddy",
			url:msg.url,
			filename,
			tabUrl:sender.tab.url,
			tabTitle:sender.tab.title,
			msg
		});

		await runRemoteAndInFrame(sender.tab.id,sender.frameId,url=>{
				const a=document.createElement("a");
				a.href=url;
				a.textContent="[9xBuddy]";
				Object.assign(a.style,{
					position:"fixed",
					top:"0",
					left:"0",
					zIndex:"99999",
					fontSize:"2rem",
					color:"blue"
				});
				document.body.append(a);


				if(window.parent!=window) return;//only add the iframe to the main window, and not on the sub window

				document.querySelector("iframe.playifyDownloader")?.remove();
				const iframe=document.createElement("iframe");
				iframe.classList.add("playifyDownloader");
				iframe.src=url;
				Object.assign(iframe.style,{
					height:"80vh",
					width:"100%",
					border:"none",
					borderTop:"4px solid red",
					overflow:"hidden"
				});
				document.body.append(iframe);
			},
			"https://9xbuddy.com/process?url="+encodeURIComponent(sender.url)+
			"#"+encodeURIComponent(filename)
		);
	},
	m3u8:async(msg:Message,sender:MessageSender)=>{
		const filename=await findFileName(msg,sender);
		console.table({
			action:"m3u8",
			url:msg.url,
			filename,
			msg
		});

		await runRemoteAndInFrame(sender.tab.id,sender.frameId,([href,filename])=>{
			const a=document.createElement("a");
			a.href=href;
			a.textContent="[M3U8]";
			Object.assign(a.style,{
				position:"fixed",
				top:"2rem",
				left:"0",
				zIndex:"99999",
				fontSize:"2rem",
				color:"gray"
			});
			document.body.append(a);


			//TODO maybe add config option, if "start" should be used or "ffmpeg" directly
			const command=`start "${filename}   " cmd /c ffmpeg -i "${href}" -c copy "${filename}.mp4"`;

			const span=document.createElement("span");
			span.title=filename;
			span.onclick=()=>{
				const input=document.createElement("textarea");
				document.body.appendChild(input);
				input.value=command+"\n";
				input.select();
				// noinspection JSDeprecatedSymbols
				document.execCommand("copy");
				document.body.removeChild(input);
				span.style.textShadow="2px 2px lime";
				setTimeout(()=>{
					span.style.textShadow=null;
				},500);
			}
			span.textContent="[FFmpeg]";
			Object.assign(span.style,{
				position:"fixed",
				top:"4rem",
				left:"0",
				zIndex:"99999",
				fontSize:"2rem",
				color:"green",
				cursor:"pointer",
				"color-scheme":"light dark"
			});
			document.body.append(span);
		},[msg.url,filename]);
	},
	rightclick:async(_:Message,sender:MessageSender)=>{
		await runRemoteFrame(sender.tab.id,sender.frameId,()=>{
			console.log("Unblocking Mouse");
			// unblock contextmenu and more
			Object.defineProperty(MouseEvent.prototype,"preventDefault",{
				get:()=>():void=>undefined,
				set:c=>console.info('a try to overwrite "preventDefault"',c),
			});
			Object.defineProperty(MouseEvent.prototype,"returnValue",{
				get:()=>true,
				set:c=>console.info('a try to overwrite "returnValue"',c),
			});
		});

		await runRemote(sender.tab.id,()=>{
			if(!document.title.startsWith("[🖱️] "))
				document.title="[🖱️] "+document.title
		});
	},
	closeDone:async(_:Message,__:chrome.runtime.MessageSender)=>{
		for(let tab of await chrome.tabs.query({}))
			if(tab.title.startsWith("[✔️] "))
				await chrome.tabs.remove(tab.id);//TODO check if this will fuck up chrome if its the last tab
	},
};
//endregion