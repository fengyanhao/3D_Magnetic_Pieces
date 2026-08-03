' Magnetic Blocks Website Launcher
' Double-click to start the website service and open browser automatically
Option Explicit

Dim DEV_URL, shell, fso, projectDir
DEV_URL = "http://localhost:5174"

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get script directory (project root)
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Step 1: Check if service is already running
If CheckServer() Then
    OpenBrowser
    WScript.Quit(0)
End If

' Step 2: Check environment
If Not fso.FileExists(projectDir & "\package.json") Then
    MsgBox "package.json not found. Please ensure the launcher is in the project root directory.", vbExclamation, "Startup Failed"
    WScript.Quit(1)
End If

' Step 3: Start npm service via internal bat
Dim batPath
batPath = projectDir & "\_start_internal.bat"
If Not fso.FileExists(batPath) Then
    MsgBox "_start_internal.bat not found.", vbExclamation, "Startup Failed"
    WScript.Quit(1)
End If

' 7 = minimized window, False = do not wait
shell.Run Chr(34) & batPath & Chr(34), 7, False

' Step 4: Poll for server ready (max 60 seconds)
Dim i, maxWait
maxWait = 30
For i = 1 To maxWait
    WScript.Sleep 2000
    If CheckServer() Then
        OpenBrowser
        WScript.Quit(0)
    End If
Next

' Timeout
MsgBox "Service startup timed out (60 seconds). Please try running start-site.bat directly.", vbExclamation, "Startup Timeout"
WScript.Quit(1)


' ========== Functions ==========

' Check if website service is running
' Uses MSXML2.ServerXMLHTTP (supports setTimeouts)
Function CheckServer()
    On Error Resume Next
    Dim http
    Set http = CreateObject("MSXML2.ServerXMLHTTP")
    http.Open "HEAD", DEV_URL, False
    ' ServerXMLHTTP supports setTimeouts: resolve, connect, send, receive (ms)
    http.setTimeouts 2000, 2000, 2000, 2000
    http.Send
    If Err.Number = 0 And http.Status >= 200 And http.Status < 400 Then
        CheckServer = True
    Else
        CheckServer = False
    End If
    Err.Clear
    On Error GoTo 0
End Function

' Open website in default browser
Sub OpenBrowser
    shell.Run "cmd /c start """" """ & DEV_URL & """", 0, False
End Sub
