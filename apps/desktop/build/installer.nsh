; The installer's own pages, after the folder page:
; - "Banco de dados": which database the server on this computer uses, SQLite (the default) or PostgreSQL, each with
;   why to pick it. The installer can't edit config.json, so it leaves the choice in installer-database.txt in the
;   app's userData folder, which the app moves into config.json on its next start (see src/server/database.ts).
;   An update, an install over the app or a userData whose config.json names a database already keeps that choice
;   and skips it.
; - "Iniciar com o Windows": whether the app starts at sign-in, hidden in the tray with its server on (yes, the
;   default) or only when opened, each saying what it means. It leaves "yes" or "no" in installer-startup.txt, which
;   the app applies on its next start (see src/startup.ts). An update or an install over the app keeps the setting and
;   skips it.
; A silent install shows neither page and leaves no answers.
; *Reiniciar agora* runs the installer of the new version with its window (see src/update.ts), so its progress bar
; shows. On such an update, electron-builder's own pages ask nothing more: the install mode page keeps the mode found
; (customInstallMode), the progress page says it is updating (instFilesShow), and the finish page starts the new
; version and closes the installer (customFinishPage); a fresh install, or one over the app run by hand, shows them as
; before. The progress bar ends full once the files are in (customInstall).
; The uninstaller's own page, after its welcome page: "Dados do APC", whether to keep the app's userData folder (the
; default) or delete it, each answer saying what it means, with the folder's path and size and a button opening it.
; Deleting asks again, with "Não" as the default, and removes that one folder, %APPDATA%\<product name>, and nothing
; outside it (customUnInstall). A silent uninstall, as every update runs the old version's uninstaller, shows no page
; and keeps the data; so does one with no such folder. Nothing else here removes a file.
; electron-builder includes this file before its own headers, so the pages and their functions are defined in its
; macros, which it inserts later: customInstallMode in the install mode page, customPageAfterChangeDir after the
; folder page, customInstall while installing, customFinishPage as the last page; in the uninstaller,
; customUnWelcomePage as its first pages and customUnInstall while uninstalling.

!ifndef BUILD_UNINSTALLER
  !include LogicLib.nsh
  !include nsDialogs.nsh
  !include WordFunc.nsh

  ; "sqlite" or "postgresql" once the page was left; empty when it was skipped.
  Var databaseChoice
  Var databasePostgresql
  Var databaseSqlite
  ; "yes" or "no" once the page was left; empty when it was skipped.
  Var startupChoice
  Var startupNo
  Var startupYes
!else
  !include FileFunc.nsh
  !include LogicLib.nsh
  !include nsDialogs.nsh
  !include WordFunc.nsh

  ; "delete" once deleting the app's data was picked and confirmed on the page; empty otherwise, which keeps it.
  Var dataChoice
  Var dataDelete
  ; The app's userData folder, %APPDATA%\<product name>, set when the page is drawn.
  Var dataFolder
  Var dataKeep
  ; "1" when config.json names PostgreSQL, whose database stays in its own server; "0" otherwise.
  Var dataOnPostgresql
!endif

!macro customPageAfterChangeDir
  Page custom databasePageCreate databasePageLeave
  Page custom startupPageCreate startupPageLeave

  ; electron-builder's progress page comes next, and takes this function: on an update it says the app is updating, in
  ; its header and in the window's title, instead of installing.
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW instFilesShow
  Function instFilesShow
    ${If} ${isUpdated}
      !insertmacro MUI_HEADER_TEXT "Atualizando o APC" "Espere enquanto a versão nova é instalada. O APC abre sozinho no fim."
      SendMessage $HWNDPARENT ${WM_SETTEXT} 0 "STR:Atualização do ${PRODUCT_NAME}"
    ${EndIf}
  FunctionEnd

  ; Tells whether the app is being updated or installed over itself. Leaves "1" in $R0 when so, "0" otherwise.
  Function appInstalledBefore
    StrCpy $R0 0
    ${If} ${isUpdated}
      StrCpy $R0 1
      Return
    ${EndIf}
    ReadRegStr $R1 HKCU "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
    ReadRegStr $R2 HKLM "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
    ${If} "$R1$R2" != ""
      StrCpy $R0 1
    ${EndIf}
  FunctionEnd

  ; Tells whether a database was chosen before: on an update, over an installed app, or in a config.json that names
  ; one. Leaves "1" in $R0 when so, "0" otherwise.
  Function databaseChosenBefore
    Call appInstalledBefore
    ${If} $R0 == 1
      Return
    ${EndIf}
    ReadEnvStr $R1 APPDATA
    ClearErrors
    FileOpen $R2 "$R1\${PRODUCT_NAME}\config.json" r
    ${IfNot} ${Errors}
      ${Do}
        ClearErrors
        FileRead $R2 $R3
        ${If} ${Errors}
          ${ExitDo}
        ${EndIf}
        ${WordFind} $R3 '"database"' "E+1{" $R4
        ${IfNot} ${Errors}
          StrCpy $R0 1
          ${ExitDo}
        ${EndIf}
      ${Loop}
      FileClose $R2
    ${EndIf}
  FunctionEnd

  ; Draws the page, with SQLite chosen, unless a database was chosen before.
  Function databasePageCreate
    Call databaseChosenBefore
    ${If} $R0 == 1
      Abort
    ${EndIf}
    !insertmacro MUI_HEADER_TEXT "Banco de dados" "Onde o servidor deste computador guarda o estoque."
    nsDialogs::Create 1018
    Pop $R0
    ${If} $R0 == error
      Abort
    ${EndIf}
    ; Everything stays within 114u: the page's area ends a little below 120u, cutting what goes past it.
    ${NSD_CreateRadioButton} 0 0 100% 12u "SQLite (recomendado para um computador só)"
    Pop $databaseSqlite
    ${NSD_CreateLabel} 12u 13u -12u 30u "Os dados ficam num arquivo neste computador. Não há nada para instalar nem senha para criar; o backup é copiar o arquivo; só este computador acessa os dados. Ideal para a oficina com um computador servindo o celular."
    Pop $R0
    ${NSD_CreateRadioButton} 0 46u 100% 12u "PostgreSQL"
    Pop $databasePostgresql
    ${NSD_CreateLabel} 12u 59u -12u 30u "Um servidor de banco de dados separado, para quem já usa PostgreSQL ou quer mais de um computador no mesmo banco. Instale-o antes; o APC pede o endereço dele ao abrir."
    Pop $R0
    ; In single quotes, which take the double ones inside: NSIS ends a double-quoted string at "" instead.
    ${NSD_CreateLabel} 0 94u 100% 20u 'Dá para trocar depois em "Servidor e banco de dados", no ícone do APC perto do relógio; os dados vêm pelo Importar de lá.'
    Pop $R0
    ${If} $databaseChoice == postgresql
      ${NSD_Check} $databasePostgresql
    ${Else}
      ${NSD_Check} $databaseSqlite
    ${EndIf}
    nsDialogs::Show
  FunctionEnd

  ; Keeps the database picked.
  Function databasePageLeave
    ${NSD_GetState} $databasePostgresql $R0
    ${If} $R0 == ${BST_CHECKED}
      StrCpy $databaseChoice postgresql
    ${Else}
      StrCpy $databaseChoice sqlite
    ${EndIf}
  FunctionEnd

  ; Draws the page, with starting with Windows chosen, unless the app is being updated or installed over itself.
  Function startupPageCreate
    Call appInstalledBefore
    ${If} $R0 == 1
      Abort
    ${EndIf}
    !insertmacro MUI_HEADER_TEXT "Iniciar com o Windows" "Se o APC liga sozinho quando você entra no Windows."
    nsDialogs::Create 1018
    Pop $R0
    ${If} $R0 == error
      Abort
    ${EndIf}
    ; Everything stays within 114u, as on the database's page.
    ${NSD_CreateRadioButton} 0 0 100% 12u "Sim, ligar o APC com o Windows (recomendado)"
    Pop $startupYes
    ${NSD_CreateLabel} 12u 13u -12u 30u "O APC liga escondido quando você entra no Windows, com o servidor ligado, para o celular funcionar mesmo sem abrir o app."
    Pop $R0
    ${NSD_CreateRadioButton} 0 46u 100% 12u "Não, só quando eu abrir o APC"
    Pop $startupNo
    ${NSD_CreateLabel} 12u 59u -12u 30u "O servidor só fica ligado enquanto o APC estiver aberto ou na bandeja; o celular não funciona antes disso."
    Pop $R0
    ${NSD_CreateLabel} 0 94u 100% 20u 'Dá para trocar depois em "Iniciar com o Windows", no menu do ícone do APC perto do relógio.'
    Pop $R0
    ${If} $startupChoice == no
      ${NSD_Check} $startupNo
    ${Else}
      ${NSD_Check} $startupYes
    ${EndIf}
    nsDialogs::Show
  FunctionEnd

  ; Keeps the answer picked.
  Function startupPageLeave
    ${NSD_GetState} $startupNo $R0
    ${If} $R0 == ${BST_CHECKED}
      StrCpy $startupChoice no
    ${Else}
      StrCpy $startupChoice yes
    ${EndIf}
  FunctionEnd
!macroend

; On an update, keeps the mode of the installation found, for this user or for all of them, when only one is found:
; the page asking whom to install for then doesn't show. With both or neither found, it shows, as on a fresh install.
!macro customInstallMode
  !ifndef BUILD_UNINSTALLER
    ${If} ${isUpdated}
      ${If} $hasPerUserInstallation == "1"
      ${AndIf} $hasPerMachineInstallation == "0"
        StrCpy $isForceCurrentInstall "1"
      ${ElseIf} $hasPerUserInstallation == "0"
      ${AndIf} $hasPerMachineInstallation == "1"
        StrCpy $isForceMachineInstall "1"
      ${EndIf}
    ${EndIf}
  !endif
!macroend

; electron-builder's finish page, with its run checkbox, but skipped on an update: the new version starts at once, as
; after a silent update, and the installer closes by itself once its progress bar is done.
!macro customFinishPage
  ; Starts the app, as electron-builder's finish page does.
  Function startAppAfterFinish
    ${If} ${isUpdated}
      StrCpy $1 "--updated"
    ${Else}
      StrCpy $1 ""
    ${EndIf}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd

  ; Skips the page on an update, starting the new version.
  Function finishPagePre
    ${If} ${isUpdated}
      Call startAppAfterFinish
      Abort
    ${EndIf}
  FunctionEnd

  !define MUI_PAGE_CUSTOMFUNCTION_PRE finishPagePre
  !ifndef HIDE_RUN_AFTER_FINISH
    !define MUI_FINISHPAGE_RUN
    !define MUI_FINISHPAGE_RUN_FUNCTION startAppAfterFinish
  !endif
  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customInstall
  ; NSIS moves the progress bar by the instructions run, and the unpacking is one of them while an update skips many
  ; others, so the bar stops short of the end. With the files in, its range shrinks to one step: whatever position NSIS
  ; sets after this is past it, and the bar shows full.
  ${IfNot} ${Silent}
    FindWindow $R1 "#32770" "" $HWNDPARENT
    GetDlgItem $R1 $R1 1004
    SendMessage $R1 ${PBM_SETRANGE32} 0 1
    SendMessage $R1 ${PBM_SETPOS} 1 0
  ${EndIf}
  ${If} $databaseChoice != ""
    ReadEnvStr $R1 APPDATA
    CreateDirectory "$R1\${PRODUCT_NAME}"
    FileOpen $R2 "$R1\${PRODUCT_NAME}\installer-database.txt" w
    FileWrite $R2 $databaseChoice
    FileClose $R2
  ${EndIf}
  ${If} $startupChoice != ""
    ReadEnvStr $R1 APPDATA
    CreateDirectory "$R1\${PRODUCT_NAME}"
    FileOpen $R2 "$R1\${PRODUCT_NAME}\installer-startup.txt" w
    FileWrite $R2 $startupChoice
    FileClose $R2
  ${EndIf}
!macroend

; The uninstaller's welcome page, then its page about the app's data.
!macro customUnWelcomePage
  !insertmacro MUI_UNPAGE_WELCOME
  UninstPage custom un.dataPageCreate un.dataPageLeave

  ; Opens the data's folder, so it can be copied elsewhere before deleting it.
  Function un.dataFolderOpen
    Pop $R0
    ExecShell "open" "$dataFolder"
  FunctionEnd

  ; Draws the page, with keeping the data chosen, unless the uninstall is silent or part of an update, or the app has
  ; no data folder.
  Function un.dataPageCreate
    ${If} ${Silent}
    ${OrIf} ${isUpdated}
      Abort
    ${EndIf}
    ReadEnvStr $R1 APPDATA
    ${If} $R1 == ""
      Abort
    ${EndIf}
    StrCpy $dataFolder "$R1\${PRODUCT_NAME}"
    ${IfNot} ${FileExists} "$dataFolder\*.*"
      Abort
    ${EndIf}
    Call un.dataReadDatabase
    ${GetSize} "$dataFolder" "/S=0K" $R1 $R2 $R3
    ${If} $R1 >= 1024
      IntOp $R1 $R1 / 1024
      StrCpy $R1 "$R1 MB"
    ${Else}
      StrCpy $R1 "$R1 KB"
    ${EndIf}
    !insertmacro MUI_HEADER_TEXT "Dados do APC" "Se o estoque, as fotos e as cópias de segurança ficam neste computador."
    nsDialogs::Create 1018
    Pop $R0
    ${If} $R0 == error
      Abort
    ${EndIf}
    ; Everything stays within the page's area, which ends a little below 120u, as on the installer's pages.
    ${NSD_CreateLabel} 0 0 -64u 20u "Os dados do APC ocupam $R1, nesta pasta:$\r$\n$dataFolder"
    Pop $R0
    ${NSD_CreateButton} -60u 2u 60u 14u "Abrir a pasta"
    Pop $R0
    ${NSD_OnClick} $R0 un.dataFolderOpen
    ${NSD_CreateRadioButton} 0 22u 100% 12u "Manter os dados neste computador (recomendado)"
    Pop $dataKeep
    ${If} $dataOnPostgresql == 1
      StrCpy $R1 "Só o programa sai. O estoque e os usuários ficam no PostgreSQL, que a desinstalação não toca; as fotos, o endereço do banco e os registros ficam na pasta, ocupando o espaço dela. Instalar o APC de novo neste computador, no mesmo usuário do Windows, abre tudo como estava."
    ${Else}
      StrCpy $R1 "Só o programa sai. O estoque, as fotos, os usuários e as cópias de segurança ficam na pasta, ocupando o espaço dela. Instalar o APC de novo neste computador, no mesmo usuário do Windows, abre tudo como estava; em outro computador, ou depois de reinstalar o Windows, só com a cópia de recuperação da chave."
    ${EndIf}
    ${NSD_CreateLabel} 12u 34u -12u 34u $R1
    Pop $R0
    ${NSD_CreateRadioButton} 0 70u 100% 12u "Apagar todos os dados do APC"
    Pop $dataDelete
    ${If} $dataOnPostgresql == 1
      StrCpy $R1 "Saem o programa e a pasta: todas as fotos, o endereço do banco e os registros. O estoque e os usuários ficam no PostgreSQL. Não dá para desfazer; se as fotos puderem servir, copie a pasta para outro lugar antes."
    ${Else}
      StrCpy $R1 "Saem o programa e a pasta: o estoque, os usuários, todas as fotos e as cópias de segurança. Não dá para desfazer, e a cópia de recuperação da chave não abre nada sem o arquivo; instalar de novo começa com o estoque vazio. Se os dados puderem servir, copie a pasta para outro lugar antes."
    ${EndIf}
    ${NSD_CreateLabel} 12u 82u -12u 34u $R1
    Pop $R0
    ${If} $dataChoice == delete
      ${NSD_Check} $dataDelete
    ${Else}
      ${NSD_Check} $dataKeep
    ${EndIf}
    nsDialogs::Show
  FunctionEnd

  ; Keeps the answer picked, asking again before deleting: "Não", the default, stays on the page.
  Function un.dataPageLeave
    ${NSD_GetState} $dataDelete $R0
    ${If} $R0 == ${BST_CHECKED}
      ${If} $dataOnPostgresql == 1
        StrCpy $R1 "Isso apaga as fotos e as configurações do APC deste computador, e não pode ser desfeito. Apagar mesmo assim?"
      ${Else}
        StrCpy $R1 "Isso apaga o estoque, as fotos e as cópias de segurança deste computador, e não pode ser desfeito. Apagar mesmo assim?"
      ${EndIf}
      MessageBox MB_YESNO|MB_ICONEXCLAMATION|MB_DEFBUTTON2 $R1 IDYES +2
      Abort
      StrCpy $dataChoice delete
    ${Else}
      StrCpy $dataChoice ""
    ${EndIf}
  FunctionEnd

  ; Tells whether config.json names PostgreSQL as the database. Leaves "1" in $dataOnPostgresql when so, "0" otherwise.
  Function un.dataReadDatabase
    StrCpy $dataOnPostgresql 0
    ClearErrors
    FileOpen $R2 "$dataFolder\config.json" r
    ${IfNot} ${Errors}
      ${Do}
        ClearErrors
        FileRead $R2 $R3
        ${If} ${Errors}
          ${ExitDo}
        ${EndIf}
        ${WordFind} $R3 '"database": "postgresql"' "E+1{" $R4
        ${IfNot} ${Errors}
          StrCpy $dataOnPostgresql 1
          ${ExitDo}
        ${EndIf}
      ${Loop}
      FileClose $R2
    ${EndIf}
  FunctionEnd
!macroend

; Deletes the app's data when that was picked and confirmed on the uninstaller's page: the one folder, %APPDATA%\<product
; name>. A silent uninstall or an update never gets here with it picked, as the page doesn't show then.
!macro customUnInstall
  ${If} $dataChoice == delete
  ${AndIfNot} ${Silent}
  ${AndIfNot} ${isUpdated}
    DetailPrint "Apagando os dados do APC: $dataFolder"
    RMDir /r "$dataFolder"
  ${EndIf}
!macroend
