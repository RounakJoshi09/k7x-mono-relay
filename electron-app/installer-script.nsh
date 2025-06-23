!macro customInstall
  ; Create application data directory
  CreateDirectory "$LOCALAPPDATA\Tally Database Loader"
  
  ; Copy configuration files to user data directory
  CopyFiles "$INSTDIR\resources\config.json" "$LOCALAPPDATA\Tally Database Loader\"
  CopyFiles "$INSTDIR\resources\tally-export-config.yaml" "$LOCALAPPDATA\Tally Database Loader\"
  CopyFiles "$INSTDIR\resources\tally-export-config-incremental.yaml" "$LOCALAPPDATA\Tally Database Loader\"
  
  ; Create logs directory
  CreateDirectory "$LOCALAPPDATA\Tally Database Loader\logs"
  
  ; Note: File permissions are handled automatically by Windows for user directories
  ; No need for explicit AccessControl plugin usage
  
  ; Create registry entries for uninstall information
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Tally Database Loader" "DisplayName" "Tally Database Loader"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Tally Database Loader" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Tally Database Loader" "DisplayIcon" "$INSTDIR\Tally Database Loader.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Tally Database Loader" "Publisher" "Tally Database Loader Team"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Tally Database Loader" "DisplayVersion" "1.0.0"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Tally Database Loader" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Tally Database Loader" "NoRepair" 1
!macroend

!macro customUnInstall
  ; Remove application data directory
  RMDir /r "$LOCALAPPDATA\Tally Database Loader"
  
  ; Remove registry entries
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Tally Database Loader"
!macroend 