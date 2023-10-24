!include nsDialogs.nsh
!include LogicLib.nsh

Var Dialog
Var Label
Var LibreInstallCheckbox
Var LibreInstallCheckbox_State

; Instfiles page
Page custom nsDialogsPage nsDialogsPageLeave

!macro preInit
  ; This macro is inserted at the beginning of the NSIS .OnInit callback
!macroend

Function nsDialogsPage

	nsDialogs::Create 1018
	Pop $Dialog

	${If} $Dialog == error
		Abort
	${EndIf}

	${NSD_CreateLabel} 0 0 100% 24u "PDF Marker support converting other document types to PDF. For this functionality we need to download and install Libre Office"
	Pop $Label

  ; Create a checkbox to optionally install libre office
	${NSD_CreateCheckbox} 0 25u 100% 8u "Download and Install Libre Office 7.5"
  Pop $LibreInstallCheckbox

  ; Reset the checkbox state incase user went back to this page
  ${NSD_SetState} $LibreInstallCheckbox $LibreInstallCheckbox_State

	nsDialogs::Show

FunctionEnd

Function nsDialogsPageLeave
	${NSD_GetState} $LibreInstallCheckbox $LibreInstallCheckbox_State

FunctionEnd

!macro customInstall

  ${If} $LibreInstallCheckbox_State == ${BST_CHECKED}
    # C:\Users\USERNAME\AppData\Local\Temp
    NScurl::http get "https://download.documentfoundation.org/libreoffice/stable/7.6.2/win/x86_64/LibreOffice_7.6.2_Win_x86-64.msi" "$TEMP\LibreOffice_7.6.2_Win_x86-64.msi" /POPUP /INSIST /Zone.Identifier /END
    Pop $0
    ExecWait '"msiexec" /i "$TEMP\LibreOffice_7.6.2_Win_x86-64.msi" /passive'
  ${EndIf}


!macroend
