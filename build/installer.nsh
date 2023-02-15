!macro customInstall
  File /oname=$PLUGINSDIR\LibreOffice_7.4.0_Win_x64.msi "${BUILD_RESOURCES_DIR}\LibreOffice_7.4.0_Win_x64.msi"
  ExecWait '"msiexec" /i "$PLUGINSDIR\LibreOffice_7.4.0_Win_x64.msi" /passive'
!macroend
