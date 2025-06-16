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


const Emoji={
	Checked:"✔️",
	Cross:"❌",
	Mouse:"🖱️",
} as const;

async function setEmoji(tabId:number,emoji:string){
	try{
		await runRemote(tabId,emoji=>{
			if(!document.title.startsWith(`[${emoji}] `))// noinspection RegExpDuplicateCharacterInClass
				document.title=`[${emoji}] ${document.title.replace(/^(\[[✔️❌🖱️⌛]+] )+/g,"")}`;
		},emoji);
	}catch(e){
		//Don't care if tab is already closed
		if(!e.message.startsWith("No tab with id: "))
			throw e;
	}
}

//endregion

//region file name
enum NameVariant{
	NamedSeriesWithFolders=2,
	SeriesEpisode=1,
	JustName=0,
}

async function findFileName(msg:Message,sender:MessageSender,variant:NameVariant=NameVariant.JustName){
	let s:string=null;
	if(sender.origin=="https://9xbuddy.com")
		s=decodeURIComponent(new URL(sender.url).hash.substring(1))||null;


	s||= await getNameFromUrl(sender.tab,variant);
	if(msg.title) s||=getEpisodeNameFromTitle(msg.title,variant);
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

function getEpisodeNameFromTitle(title:string,variant:NameVariant):string{
	const match=title.match(/S0*([0-9]+)[. ]?E0*([0-9]+)/)??
		title.match(/E0*([0-9]+)/)??
		title.match(/\.0*([0-9]{1-3})\./);
	if(!match) return null;

	switch(variant){
		case NameVariant.NamedSeriesWithFolders:
			return match.length==3?`S${match[1]}/${match[2]}`:match[2];
		case NameVariant.SeriesEpisode:
			return match.length==3?`S${match[1]}E${match[2]}`:match[2];
		case NameVariant.JustName:
		default:
			return match[2];
	}
}

async function getNameFromUrl(tab:Tab,variant:NameVariant):Promise<string>{
	const url=new URL(tab.url);
	switch(url.host){
		case "bs.to":{
			const match=url.pathname.match(/^\/serie\/([^/]*)\/([0-9]+)\/([0-9]+)-/i);
			if(!match) throw new Error("Unknown bs.to path: "+url);
			switch(variant){
				case NameVariant.NamedSeriesWithFolders:
					return `${match[1]}/S${match[2]}/${match[3]}`;
				case NameVariant.SeriesEpisode:
					return `S${match[2]}E${match[3]}`
				case NameVariant.JustName:
				default:
					return match[3];
			}
		}
		case "aniworld.to":
		case "serien.sx":
		case "s.to":{
			const match=url.pathname.match(/^\/(?:serie|anime)\/stream\/([^/]*)\/staffel-([0-9]+)\/episode-([0-9]+)/i);
			if(match){
				switch(variant){
					case NameVariant.NamedSeriesWithFolders:
						return `${match[1]}/S${match[2]}/${match[3]}`;
					case NameVariant.SeriesEpisode:
						return `S${match[2]}E${match[3]}`
					case NameVariant.JustName:
					default:
						return match[3];
				}
			}
			const matchFilm=url.pathname.match(/^\/(?:serie|anime)\/stream\/[^/]*\/filme\/film-([0-9]+)/i);
			if(matchFilm) return await runRemote(tab.id,
				()=>document.querySelector(".episodeGermanTitle,.episodeEnglishTitle").textContent);
			throw new Error("Unknown s.to path: "+url);
		}
		case "streamkiste.tv":{
			return await runRemote(tab.id,()=>document.querySelector("div.title>h1").textContent)
		}
		case "filmpalast.to":{
			return await runRemote(tab.id,()=>document.querySelector("h2").textContent)
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
	action:"download" | "9xbuddy" | "rightclick" | "m3u8" | "closeDone" | "ffmpeg" | "3donlinefilms" | "filmpalast" | "wait",
	title:string,
	url:string,
}

chrome.runtime.onMessage.addListener((msg:Message,sender,sendResponse)=>{
	if(msg.action in messageReceiver)
		messageReceiver[msg.action](msg,sender,sendResponse).catch(console.error);
	else
		console.error("Received invalid message: ",msg,sender);
	return msg.action=="wait";//return true if response is used
});

const messageReceiver:(Record<Message["action"],(msg:Message,sender:MessageSender,sendResponse:(response?:any)=>void)=>Promise<void>>)={
	download:async(msg:Message,sender:MessageSender,sendResponse)=>{
		let filename=await findFileName(msg,sender);
		if(filename==null) return;
		filename+=".mp4";


		chrome.downloads.download({
			url:msg.url,
			filename:filename,
		},async downloadId=>{

			chrome.downloads.onChanged.addListener(function onChangeListener(delta){
					if(delta.id!=downloadId) return;

					if(delta.error?.current||delta.state?.current=="interrupted"){
						console.warn("Download failed: ",delta.error?.current,{
							downloadId,
							filename,
						});

						setEmoji(sender.tab.id,Emoji.Cross);
					}

					if(delta.state?.current!="in_progress"){
						chrome.downloads.onChanged.removeListener(onChangeListener)
						chrome.downloads.search({id:downloadId},([res])=>
							res?.fileSize==0&&res?.exists&&
							chrome.downloads.removeFile(downloadId,async()=>{
								console.info("deleted 0 byte file",{
									downloadId,
									filename,
									res,
								});

								await setEmoji(sender.tab.id,Emoji.Cross);

								await messageReceiver.ffmpeg(msg,sender,sendResponse);
							}));
					}
				}
			);


			await setEmoji(sender.tab.id,Emoji.Checked);

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


		const url="https://9xbuddy.com/process?url="+encodeURIComponent(sender.url)+
			"#"+encodeURIComponent(filename);

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
		},url);

		if(msg.title==null||//It is null, when not coming from voe
			!(await chrome.storage.local.get("useFFmpeg")).useFFmpeg)
			await runRemote(sender.tab.id,url=>{
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
			},url);
	},
	m3u8:async(msg:Message,sender:MessageSender)=>{
		const isNativeSupported=sendNative({action:"close"}).then(r=>r=="close").catch(()=>false);
		const filename=await findFileName(msg,sender);
		console.table({
			action:"m3u8",
			url:msg.url,
			filename,
			msg
		});

		await runRemoteAndInFrame(sender.tab.id,sender.frameId,({
																	url,
																	filename,
																	nativeSupported,
																})=>{


			function copy(s:string){
				const input=document.createElement("textarea");
				document.body.appendChild(input);
				input.value=s;
				input.select();
				// noinspection JSDeprecatedSymbols
				(document as any).execCommand("copy");
				document.body.removeChild(input);
			}

			const a=document.createElement("a");
			a.href=url;
			a.title="Shift = Copy command to run directly\n"+
				"Ctrl = Copy command to run in new window\n"+
				"Right Click, copy link = Copy m3u8 link";
			a.onclick=e=>{
				e.preventDefault();

				if(e.shiftKey)
					copy(`ffmpeg -i "${url}" -c copy "${filename}.mp4"\n`);
				else if(nativeSupported&& !e.ctrlKey){
					document.dispatchEvent(new CustomEvent("playifyDownloader",{
						detail:{
							action:"ffmpeg",
							url:url,
							title:filename,
						}
					}));
				}else copy(`start "${filename} - PlayifyDownloader" cmd /c ffmpeg -i "${url}" -c copy "${filename}.mp4"\n`);

				a.style.textShadow="2px 2px lime";
				setTimeout(():void=>a.style.textShadow=null,500);
			}
			a.textContent="[FFmpeg]";
			Object.assign(a.style,{
				position:"fixed",
				top:"2rem",
				left:"0",
				zIndex:"99999",
				fontSize:"2rem",
				color:"green",
				cursor:"pointer",
				"color-scheme":"light dark"
			});
			document.body.append(a);
		},{
			url:msg.url,
			filename,
			nativeSupported:await isNativeSupported
		} as const);
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
		await setEmoji(sender.tab.id,Emoji.Mouse);
	},
	closeDone:async(_:Message,__:chrome.runtime.MessageSender)=>{
		for(let tab of await chrome.tabs.query({}))
			if(tab.title.startsWith("[✔️] "))
				await chrome.tabs.remove(tab.id);
	},
	ffmpeg:async(msg:Message,sender:MessageSender)=>{
		const useSeriesFolder:boolean=(await chrome.storage.local.get("useSeriesFolder")).useSeriesFolder;//TODO use radiobuttons
		const filename=await findFileName(msg,sender,useSeriesFolder?NameVariant.NamedSeriesWithFolders:NameVariant.JustName);
		console.table({
			action:"ffmpeg",
			url:msg.url,
			filename,
			msg
		});

		let s:string;
		try{
			s=await sendNative({
				action:"ffmpeg",
				url:msg.url,
				filename,
			}) as any;
			if(s!="started"){
				console.error("error calling native ffmpeg. Got response: ",s);
				return;
			}
		}catch(e){
			console.error("error calling native ffmpeg",e);
		}

		await setEmoji(sender.tab.id,Emoji.Checked);
	},
	"3donlinefilms":async(_:Message,sender:MessageSender)=>{
		await runRemoteAndInFrame(sender.tab.id,sender.frameId,()=>{
			const a=document.createElement("a");
			a.href="https://www.3donlinefilms.com/videoTV.php";
			a.textContent="[Video]";
			Object.assign(a.style,{
				position:"fixed",
				top:"0",
				left:"0",
				zIndex:"99999",
				fontSize:"2rem",
				color:"blue"
			});
			document.body.append(a);
		});
	},
	"filmpalast":async(_:Message,sender:MessageSender)=>{
		await runRemoteAndInFrame(sender.tab.id,sender.frameId,()=>{
			/*const oldJquery=(globalThis as any).jQuery;
			(globalThis as any).jQuery=(...args:any[])=>{
				if(args.length==1&&args[0]==".verystream"){
					throw "[PlayifyDownloader] Interval";
				}
				
				oldJquery(...args);
			};*/
			const oldJquery=(globalThis as any).jQuery;
			(globalThis as any).jQuery=new Proxy(oldJquery,{
				apply(target:any,thisArg:any,argArray:any[]):any{
					if(argArray[0]=='.verystream') throw "[PlayifyDownloader] Interval";
					target.apply(thisArg,argArray);
				}
			});
		});
	},
	"wait":async(_:Message,sender:MessageSender,sendResponse)=>{
		await waitNative();
		sendResponse();
	}
};
//endregion

//region Native
interface NativeMessage{
	action:"close" | "args" | "ffmpeg" | "version" | "count",
	url?:string
	filename?:string
}

const sendNative=<T>(msg:NativeMessage)=>new Promise<T>((res,rej)=>
	chrome.runtime.sendNativeMessage("at.playify.playifydownloader",msg,
		r=>r==undefined?rej(chrome.runtime.lastError):res(r)));

let waitingNative:VoidFunction[] | null=null;
const waitNative=async()=>{
	const maxFfmpeg:number=+(await chrome.storage.local.get("maxFfmpeg")).maxFfmpeg;
	if(!maxFfmpeg) return;
	if(waitingNative) return new Promise<void>(res=>waitingNative.push(res));

	waitingNative=[];
	const promise=new Promise<void>(res=>waitingNative.push(res));

	(async()=>{
		while(true){
			for(let count=await sendNative<number>({action:"count"}); count<maxFfmpeg&&waitingNative.length; count++)
				waitingNative.pop()();
			if(waitingNative.length==0){
				waitingNative=null;
				return;
			}
			await new Promise(resolve=>setTimeout(resolve,5000));
		}
	})().catch(e=>{
		console.error(e);
		waitingNative=null;
	});

	return promise;
}

//endregion