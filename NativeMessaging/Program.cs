using System.Diagnostics;
using System.Reflection;
using System.Text;
using Microsoft.Win32;
using PlayifyUtility.Jsons;
using PlayifyUtility.Streams.Data;

namespace DownloaderNativeMessaging;

internal static class Program{
	private static void Main(string[] args){
		if(args.Length==0) SetupNativeMessaging();
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
				if(Path.GetDirectoryName(filename) is{Length:>0} dir) Directory.CreateDirectory(dir);
				
				if(File.Exists(filename)) return "Error: File exists";
				if(Path.GetInvalidPathChars().Any(filename.Contains)) return "Error: Filename invalid";

				Process.Start(new ProcessStartInfo{
					FileName="cmd.exe",
					Arguments=$"/C start \"{filename} - PlayifyDownloader\" /min cmd /c ffmpeg -i \"{url}\" -c copy \"{filename}.mp4\"",
					WindowStyle=ProcessWindowStyle.Hidden,
					CreateNoWindow=true,
					UseShellExecute=false,
				});

				return "started";
		}
		return null;
	}
}