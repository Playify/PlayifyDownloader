using System.Runtime.InteropServices;

namespace DownloaderNativeMessaging;

internal static partial class Program{

	[StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]
	private struct StartupInfo{
		public int cb;
		public string lpReserved;
		public string lpDesktop;
		public string lpTitle;
		public int dwX,dwY,dwXSize,dwYSize;
		public int dwXCountChars,dwYCountChars;
		public int dwFillAttribute;
		public int dwFlags;
		public short wShowWindow;
		public short cbReserved2;
		public IntPtr lpReserved2;
		public IntPtr hStdInput,hStdOutput,hStdError;
	}

	[StructLayout(LayoutKind.Sequential)]
	private struct ProcessInformation{
		public IntPtr hProcess;
		public IntPtr hThread;
		public int dwProcessId;
		public int dwThreadId;
	}

	[DllImport("kernel32.dll",SetLastError=true,CharSet=CharSet.Unicode)]
	private static extern bool CreateProcess(
		string? lpApplicationName,
		string lpCommandLine,
		IntPtr lpProcessAttributes,
		IntPtr lpThreadAttributes,
		bool bInheritHandles,
		int dwCreationFlags,
		IntPtr lpEnvironment,
		string? lpCurrentDirectory,
		ref StartupInfo lpStartupInfo,
		out ProcessInformation lpProcessInformation);
}