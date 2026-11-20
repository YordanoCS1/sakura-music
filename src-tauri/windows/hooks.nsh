; Hooks propios del instalador de Sakura Music.
; El template de Tauri ya incluye la página para elegir la carpeta de
; instalación, el menú Inicio y el acceso directo del escritorio.

!macro NSIS_HOOK_PREFINISHPAGE
  !define MUI_FINISHPAGE_TITLE "Sakura Music lista para sonar"
  !define MUI_FINISHPAGE_TEXT "Elegiste d$\'onde instalarla. Tu biblioteca y tus listas se guardan en la carpeta de datos de la app, no en la carpeta de instalación."
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Dejamos una nota con la ruta de datos para quien instala.
  FileOpen $9 "$INSTDIR\LEEME.txt" w
  FileWrite $9 "Sakura Music$\r$\n"
  FileWrite $9 "Datos: %LOCALAPPDATA%\com.sakura.music$\r$\n"
  FileWrite $9 "Tu música se indexa ahí; podés cambiar la carpeta desde Ajustes.$\r$\n"
  FileClose $9
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  Delete "$INSTDIR\LEEME.txt"
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
!macroend
