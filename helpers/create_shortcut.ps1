$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Brave Extensions.lnk")
$Shortcut.TargetPath = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe"
$Shortcut.Arguments = "brave://extensions/"
$Shortcut.IconLocation = "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe,0"
$Shortcut.Save()
Write-Host "Brave Extensions shortcut created on your Desktop."
