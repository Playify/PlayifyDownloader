using System.ComponentModel;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using Microsoft.Win32;
using PlayifyUtility.Jsons;
using PlayifyUtility.Streams.Data;
using PlayifyUtility.Utils;
using PlayifyUtility.Windows.Win;

namespace DownloaderNativeMessaging;

internal static partial class Program{
	private static void Main(string[] args){
		if(args.Length==0) SetupNativeMessaging();
		else if(args.Length>0&&args[0]=="ffmpeg") FfmpegAndCheck(args[1],args[2]);
		else{
			Directory.SetCurrentDirectory(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),"Downloads"));
			HandleMessages();
		}
	}

	private static void SetupNativeMessaging(){
		
		Console.WriteLine("1. Open Chrome and go to chrome://extensions/");
		Console.WriteLine("2. Click on Details on the extension");
		Console.WriteLine("3. URL should be chrome://extensions/?id=XXX, copy that");
		Console.Write("\nEnter Extension ID / Link: ");
		var appId=Console.ReadLine()?.Trim();

		if(appId?.StartsWith("chrome://extensions/?id=")??false) appId=appId.Substring("chrome://extensions/?id=".Length);

		if(appId?.Length!=32){
			Console.ForegroundColor=ConsoleColor.Red;
			Console.WriteLine("Invalid Extension ID / Link. Setup aborted.");
			Console.ReadKey(true);
			return;
		}


		var exePath=Assembly.GetExecutingAssembly().Location;

		var manifestPath=Path.Combine(Path.GetDirectoryName(exePath)??"","at.playify.playifydownloader.json");

		File.WriteAllText(manifestPath,new JsonObject{
			{"name","at.playify.playifydownloader"},
			{"description","Native Messaging Host for Playify Downloader"},
			{"path",exePath.Replace('\\','/')},
			{"type","stdio"},
			{"allowed_origins",new JsonArray($"chrome-extension://{appId}/")},
		}.ToPrettyString());

		using (var key=Registry.CurrentUser.CreateSubKey(@"Software\Google\Chrome\NativeMessagingHosts\at.playify.playifydownloader"))
			key?.SetValue("",manifestPath,RegistryValueKind.String);

		Console.ForegroundColor=ConsoleColor.Green;
		Console.WriteLine("Native Messaging setup complete!");
		
		
		try{
			var check=Process.Start(new ProcessStartInfo{
				FileName="ffmpeg",
				Arguments="-v quiet",
				UseShellExecute=false,
			})!;
			check.WaitForExit();
		} catch(Win32Exception e){
			Console.ForegroundColor=ConsoleColor.Yellow;
			Console.WriteLine("Warning: ffmpeg.exe was not found. This will lead to problems! (Reason: \""+e.Message+"\")");
			Console.WriteLine("Either add it to the global PATH variable, or put it in the current folder.");
		}

		Console.ReadKey(true);
	}

	private static void HandleMessages(){
		var input=new DataInput(Console.OpenStandardInput());
		try{
			while(true)
				if(OnReceive(Json.ParseOrNull(
					             Encoding.UTF8.GetString(
						             input.ReadFully(
							             BitConverter.ToInt32(
								             input.ReadFully(4),0))))
				             ??throw new Exception("Error parsing Json message")) is{} response)
					SendMessage(response);
		} catch(EndOfStreamException){
		} catch(Exception e){
			SendMessage("Error: "+e);
			Environment.Exit(1);
		}
	}

	private static DataOutput? _dataOutput;

	private static void SendMessage(Json response){
		var output=_dataOutput??=new DataOutput(Console.OpenStandardOutput());
		var messageBytes=Encoding.UTF8.GetBytes(response.ToString());
		output.Write(BitConverter.GetBytes(messageBytes.Length));
		output.Write(messageBytes);
		Console.Out.Flush();
	}


	private static Json? OnReceive(Json message){
		var action=message.Get("action")?.AsString()??"";

		switch(action){
			case "args":
				return new JsonArray(Environment.GetCommandLineArgs());
			case "version":
				var version=Assembly.GetExecutingAssembly().GetName().Version;
				return version.ToString(version.Revision<=0?3:4);
			case "count":
				var processes=Process.GetProcessesByName("ffmpeg");
				foreach(var process in processes) process.Dispose();
				return processes.Length;
			case "close":
				return "close";
			case "ffmpeg":
				var url=message.Get("url")?.AsString()??"";
				if(!url.StartsWith("http://")&&!url.StartsWith("https://")) return "Error: URL is not http or https";

				var filename=message.Get("filename")?.AsString()??"";

				if(File.Exists(filename)) return "Error: File exists";
				if(Path.GetInvalidPathChars().Any(filename.Contains)) return "Error: Filename invalid";

				var si = new StartupInfo {
					cb = Marshal.SizeOf<StartupInfo>(),
					dwFlags = 0x00000001,//STARTF_USESHOWWINDOW
					wShowWindow = 7,//SW_SHOWMINNOACTIVE
				};

				CreateProcess(
					null,
					$"\"{Assembly.GetExecutingAssembly().Location}\" ffmpeg \"{url}\" \"{filename}\"",
					IntPtr.Zero,
					IntPtr.Zero,
					false,
					0x00000010,//CREATE_NEW_CONSOLE
					IntPtr.Zero,
					null,
					ref si,
					out _
				);

				return "started";
		}
		return null;
	}


	private static void FfmpegAndCheck(string url,string filename){
		Console.Title=filename+" - PlayifyDownloader";

		Directory.SetCurrentDirectory(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),"Downloads"));
		if(Path.GetDirectoryName(filename) is{Length: >0} dir) Directory.CreateDirectory(dir);
		
		var errorFile=filename.Replace('/','_').Replace('\\','_')+".err";
		if(File.Exists(errorFile))
			try{
				File.Delete(errorFile);
			}catch(IOException){}

		if(!filename.EndsWith(".mp4")) filename+=".mp4";

		// Download
		var dl=Process.Start(new ProcessStartInfo{
			FileName="ffmpeg",
			Arguments=" -reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 10 "+//auto reconnect
			          "-thread_queue_size 2048 "+//download and handle IO at same time
			          $"-i \"{url}\" -c copy \"{filename}\"",
			UseShellExecute=false,
		});
		if(dl==null) throw new Exception("Error starting ffmpeg");
		dl.WaitForExit();

		Console.WriteLine("ExitCode: "+dl.ExitCode);
		// Verify
		if(dl.ExitCode!=0){
			Console.ForegroundColor=ConsoleColor.Red;
			Console.WriteLine("Defective file: "+filename);
			try{
				File.WriteAllText(errorFile,"Defective File:\r\n"+filename+"\r\nExitCode: "+dl.ExitCode);
			} catch(Exception e){
				File.WriteAllText($"err_{DateTime.Now:yyyyMMdd_HHmmss}.err","Defective File:\r\n"+filename+"\r\nExitCode: "+dl.ExitCode+"\r\n"+e);
			}
			return;
		}

		Console.ForegroundColor=ConsoleColor.Green;
		Console.WriteLine("File OK: "+filename);
		if(File.Exists(errorFile)) File.Delete(errorFile);
	}
}