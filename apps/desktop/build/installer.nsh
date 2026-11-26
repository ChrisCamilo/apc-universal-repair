; The installer's own pages, after the folder page:
; - "Banco de dados": which database the server on this computer uses, SQLite (the default) or PostgreSQL, each with
;   why to pick it. The installer can't edit config.json, so it leaves the choice in installer-database.txt in the
;   app's userData folder, which the app moves into config.json on its next start (see src/server/database.ts).
;   An update, an install over the app or a userData whose config.json names a database already keeps that choice
;   and skips it.
; - "Iniciar com o Windows": whether the app starts at sign-in, hidden in the tray with its server on (yes, the
;   default) or only when opened, each saying what it means. It leaves "yes" or "no" in installer-startup.txt, which
;   the app applies on its next start (see src/system/startup.ts). An update or an install over the app keeps the
;   setting and skips it.
; A silent install shows neither page and leaves no answers.
; The installer starts by asking its language, Portuguese or English (electron-builder's displayLanguageSelector),
; with Portuguese chosen; its pages, electron-builder's and these, follow it. The choice is kept in the registry, under
; the app's own key, so an update or an install over the app asks nothing, and the uninstaller speaks it
; (customUnInit). A fresh install also leaves it in installer-language.txt, which the app takes as its language the
; first time, until the user picks another (see src/texts.ts). Every text here is a LangString in both languages.
; *Reiniciar agora* runs the installer of the new version with its window (see src/system/update.ts), so its progress
; bar shows. On such an update, electron-builder's own pages ask nothing more: the install mode page keeps the mode
; found (customInstallMode), the progress page says it is updating (instFilesShow), and the finish page starts the new
; version and closes the installer (customFinishPage); a fresh install, or one over the app run by hand, shows them as
; before. The progress bar ends full once the files are in (customInstall).
; The uninstaller's own page, after its welcome page: "Dados do APC", whether to keep the app's userData folder (the
; default) or delete it, each answer saying what it means, with the folder's path and size and a button opening it.
; Deleting asks again, with "Não" as the default, and removes that one folder, %APPDATA%\<product name>, and nothing
; outside it (customUnInstall). A silent uninstall, as every update runs the old version's uninstaller, shows no page
; and keeps the data; so does one with no such folder. Nothing else here removes a file.
; electron-builder includes this file before its own headers, so the pages and their functions are defined in its
; macros, which it inserts later: preInit before the language is asked, customInstallMode in the install mode page,
; customPageAfterChangeDir after the folder page, customInstall while installing, customFinishPage as the last page;
; in the uninstaller, customUnInit as it starts, customUnWelcomePage as its first pages and customUnInstall while
; uninstalling. The LangStrings name their languages by number, as electron-builder's own messages do, since the
; languages load after this file.

; The languages, by their Windows ids: Portuguese (Brazil) and English (United States).
!define LANG_APC_PT 1046
!define LANG_APC_EN 1033
; Where the language chosen is kept: this user's key of the app, which the app id names, so a test installer built
; under another id keeps its own.
!define LANGUAGE_KEY "Software\${APP_GUID}"
!define MUI_LANGDLL_REGISTRY_ROOT HKCU
!define MUI_LANGDLL_REGISTRY_KEY "${LANGUAGE_KEY}"
!define MUI_LANGDLL_REGISTRY_VALUENAME "Language"
; The language dialog shows before a language is chosen, so it speaks both.
!define MUI_LANGDLL_WINDOWTITLE "Idioma do instalador / Installer language"
!define MUI_LANGDLL_INFO "Escolha o idioma da instalação. / Choose the installer's language."

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

  LangString apcUpdatingTitle ${LANG_APC_PT} "Atualizando o APC"
  LangString apcUpdatingTitle ${LANG_APC_EN} "Updating APC"
  LangString apcUpdatingText ${LANG_APC_PT} "Espere enquanto a versão nova é instalada. O APC abre sozinho no fim."
  LangString apcUpdatingText ${LANG_APC_EN} "Wait while the new version is installed. APC opens by itself at the end."
  LangString apcUpdatingWindow ${LANG_APC_PT} "Atualização do ${PRODUCT_NAME}"
  LangString apcUpdatingWindow ${LANG_APC_EN} "${PRODUCT_NAME} update"
  LangString apcDatabaseTitle ${LANG_APC_PT} "Banco de dados"
  LangString apcDatabaseTitle ${LANG_APC_EN} "Database"
  LangString apcDatabaseText ${LANG_APC_PT} "Onde o servidor deste computador guarda o estoque."
  LangString apcDatabaseText ${LANG_APC_EN} "Where this computer's server keeps the inventory."
  LangString apcDatabaseSqlite ${LANG_APC_PT} "SQLite (recomendado para um computador só)"
  LangString apcDatabaseSqlite ${LANG_APC_EN} "SQLite (recommended for a single computer)"
  LangString apcDatabaseSqliteText ${LANG_APC_PT} "Os dados ficam num arquivo neste computador. Não há nada para instalar nem senha para criar; o backup é copiar o arquivo; só este computador acessa os dados. Ideal para a oficina com um computador servindo o celular."
  LangString apcDatabaseSqliteText ${LANG_APC_EN} "The data stays in a file on this computer. There's nothing to install and no password to create; a backup is copying the file; only this computer reaches the data. Ideal for a workshop with one computer serving the phone."
  LangString apcDatabasePostgresql ${LANG_APC_PT} "PostgreSQL"
  LangString apcDatabasePostgresql ${LANG_APC_EN} "PostgreSQL"
  LangString apcDatabasePostgresqlText ${LANG_APC_PT} "Um servidor de banco de dados separado, para quem já usa PostgreSQL ou quer mais de um computador no mesmo banco. Instale-o antes; o APC pede o endereço dele ao abrir."
  LangString apcDatabasePostgresqlText ${LANG_APC_EN} "A separate database server, for those who already use PostgreSQL or want more than one computer on the same database. Install it first; APC asks for its address when it opens."
  ; In single quotes, which take the double ones inside: NSIS ends a double-quoted string at "" instead.
  LangString apcDatabaseLater ${LANG_APC_PT} 'Dá para trocar depois em "Servidor e banco de dados", no ícone do APC perto do relógio; os dados vêm pelo Importar de lá.'
  LangString apcDatabaseLater ${LANG_APC_EN} 'You can change it later in "Server and database", on the APC icon by the clock; the data comes over through Import there.'
  LangString apcStartupTitle ${LANG_APC_PT} "Iniciar com o Windows"
  LangString apcStartupTitle ${LANG_APC_EN} "Start with Windows"
  LangString apcStartupText ${LANG_APC_PT} "Se o APC liga sozinho quando você entra no Windows."
  LangString apcStartupText ${LANG_APC_EN} "Whether APC starts by itself when you sign in to Windows."
  LangString apcStartupYes ${LANG_APC_PT} "Sim, ligar o APC com o Windows (recomendado)"
  LangString apcStartupYes ${LANG_APC_EN} "Yes, start APC with Windows (recommended)"
  LangString apcStartupYesText ${LANG_APC_PT} "O APC liga escondido quando você entra no Windows, com o servidor ligado, para o celular funcionar mesmo sem abrir o app."
  LangString apcStartupYesText ${LANG_APC_EN} "APC starts hidden when you sign in to Windows, with the server on, so the phone works even without opening the app."
  LangString apcStartupNo ${LANG_APC_PT} "Não, só quando eu abrir o APC"
  LangString apcStartupNo ${LANG_APC_EN} "No, only when I open APC"
  LangString apcStartupNoText ${LANG_APC_PT} "O servidor só fica ligado enquanto o APC estiver aberto ou na bandeja; o celular não funciona antes disso."
  LangString apcStartupNoText ${LANG_APC_EN} "The server is only on while APC is open or in the tray; the phone doesn't work before that."
  LangString apcStartupLater ${LANG_APC_PT} 'Dá para trocar depois em "Iniciar com o Windows", no menu do ícone do APC perto do relógio.'
  LangString apcStartupLater ${LANG_APC_EN} 'You can change it later in "Start with Windows", in the menu of the APC icon by the clock.'
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

  LangString apcDataTitle ${LANG_APC_PT} "Dados do APC"
  LangString apcDataTitle ${LANG_APC_EN} "APC data"
  LangString apcDataText ${LANG_APC_PT} "Se o estoque, as fotos e as cópias de segurança ficam neste computador."
  LangString apcDataText ${LANG_APC_EN} "Whether the inventory, the photos and the backups stay on this computer."
  ; $R1 is the folder's size, e.g. "12 MB".
  LangString apcDataSize ${LANG_APC_PT} "Os dados do APC ocupam $R1, nesta pasta:$\r$\n$dataFolder"
  LangString apcDataSize ${LANG_APC_EN} "APC's data takes up $R1, in this folder:$\r$\n$dataFolder"
  LangString apcDataOpen ${LANG_APC_PT} "Abrir a pasta"
  LangString apcDataOpen ${LANG_APC_EN} "Open the folder"
  LangString apcDataKeep ${LANG_APC_PT} "Manter os dados neste computador (recomendado)"
  LangString apcDataKeep ${LANG_APC_EN} "Keep the data on this computer (recommended)"
  LangString apcDataKeepPostgresql ${LANG_APC_PT} "Só o programa sai. O estoque e os usuários ficam no PostgreSQL, que a desinstalação não toca; as fotos, o endereço do banco e os registros ficam na pasta, ocupando o espaço dela. Instalar o APC de novo neste computador, no mesmo usuário do Windows, abre tudo como estava."
  LangString apcDataKeepPostgresql ${LANG_APC_EN} "Only the program leaves. The inventory and the users stay in PostgreSQL, which uninstalling doesn't touch; the photos, the database's address and the logs stay in the folder, taking up its space. Installing APC again on this computer, under the same Windows user, opens everything as it was."
  LangString apcDataKeepSqlite ${LANG_APC_PT} "Só o programa sai. O estoque, as fotos, os usuários e as cópias de segurança ficam na pasta, ocupando o espaço dela. Instalar o APC de novo neste computador, no mesmo usuário do Windows, abre tudo como estava; em outro computador, ou depois de reinstalar o Windows, só com a cópia de recuperação da chave."
  LangString apcDataKeepSqlite ${LANG_APC_EN} "Only the program leaves. The inventory, the photos, the users and the backups stay in the folder, taking up its space. Installing APC again on this computer, under the same Windows user, opens everything as it was; on another computer, or after reinstalling Windows, only with the key's recovery copy."
  LangString apcDataDelete ${LANG_APC_PT} "Apagar todos os dados do APC"
  LangString apcDataDelete ${LANG_APC_EN} "Delete all of APC's data"
  LangString apcDataDeletePostgresql ${LANG_APC_PT} "Saem o programa e a pasta: todas as fotos, o endereço do banco e os registros. O estoque e os usuários ficam no PostgreSQL. Não dá para desfazer; se as fotos puderem servir, copie a pasta para outro lugar antes."
  LangString apcDataDeletePostgresql ${LANG_APC_EN} "The program and the folder leave: all the photos, the database's address and the logs. The inventory and the users stay in PostgreSQL. This can't be undone; if the photos may be of use, copy the folder elsewhere first."
  LangString apcDataDeleteSqlite ${LANG_APC_PT} "Saem o programa e a pasta: o estoque, os usuários, todas as fotos e as cópias de segurança. Não dá para desfazer, e a cópia de recuperação da chave não abre nada sem o arquivo; instalar de novo começa com o estoque vazio. Se os dados puderem servir, copie a pasta para outro lugar antes."
  LangString apcDataDeleteSqlite ${LANG_APC_EN} "The program and the folder leave: the inventory, the users, all the photos and the backups. This can't be undone, and the key's recovery copy opens nothing without the file; installing again starts with an empty inventory. If the data may be of use, copy the folder elsewhere first."
  LangString apcDataConfirmPostgresql ${LANG_APC_PT} "Isso apaga as fotos e as configurações do APC deste computador, e não pode ser desfeito. Apagar mesmo assim?"
  LangString apcDataConfirmPostgresql ${LANG_APC_EN} "This deletes APC's photos and settings from this computer, and can't be undone. Delete anyway?"
  LangString apcDataConfirmSqlite ${LANG_APC_PT} "Isso apaga o estoque, as fotos e as cópias de segurança deste computador, e não pode ser desfeito. Apagar mesmo assim?"
  LangString apcDataConfirmSqlite ${LANG_APC_EN} "This deletes the inventory, the photos and the backups from this computer, and can't be undone. Delete anyway?"
  LangString apcDataDeleting ${LANG_APC_PT} "Apagando os dados do APC: $dataFolder"
  LangString apcDataDeleting ${LANG_APC_EN} "Deleting APC's data: $dataFolder"
!endif

; Starts the language dialog on Portuguese; a language kept from an earlier install replaces it.
!macro preInit
  StrCpy $LANGUAGE ${LANG_APC_PT}
!macroend

!macro customPageAfterChangeDir
  Page custom databasePageCreate databasePageLeave
  Page custom startupPageCreate startupPageLeave

  ; electron-builder's progress page comes next, and takes this function: on an update it says the app is updating, in
  ; its header and in the window's title, instead of installing.
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW instFilesShow
  Function instFilesShow
    ${If} ${isUpdated}
      !insertmacro MUI_HEADER_TEXT "$(apcUpdatingTitle)" "$(apcUpdatingText)"
      SendMessage $HWNDPARENT ${WM_SETTEXT} 0 "STR:$(apcUpdatingWindow)"
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
    !insertmacro MUI_HEADER_TEXT "$(apcDatabaseTitle)" "$(apcDatabaseText)"
    nsDialogs::Create 1018
    Pop $R0
    ${If} $R0 == error
      Abort
    ${EndIf}
    ; Everything stays within 114u: the page's area ends a little below 120u, cutting what goes past it.
    ${NSD_CreateRadioButton} 0 0 100% 12u "$(apcDatabaseSqlite)"
    Pop $databaseSqlite
    ${NSD_CreateLabel} 12u 13u -12u 30u "$(apcDatabaseSqliteText)"
    Pop $R0
    ${NSD_CreateRadioButton} 0 46u 100% 12u "$(apcDatabasePostgresql)"
    Pop $databasePostgresql
    ${NSD_CreateLabel} 12u 59u -12u 30u "$(apcDatabasePostgresqlText)"
    Pop $R0
    ${NSD_CreateLabel} 0 94u 100% 20u "$(apcDatabaseLater)"
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
    !insertmacro MUI_HEADER_TEXT "$(apcStartupTitle)" "$(apcStartupText)"
    nsDialogs::Create 1018
    Pop $R0
    ${If} $R0 == error
      Abort
    ${EndIf}
    ; Everything stays within 114u, as on the database's page.
    ${NSD_CreateRadioButton} 0 0 100% 12u "$(apcStartupYes)"
    Pop $startupYes
    ${NSD_CreateLabel} 12u 13u -12u 30u "$(apcStartupYesText)"
    Pop $R0
    ${NSD_CreateRadioButton} 0 46u 100% 12u "$(apcStartupNo)"
    Pop $startupNo
    ${NSD_CreateLabel} 12u 59u -12u 30u "$(apcStartupNoText)"
    Pop $R0
    ${NSD_CreateLabel} 0 94u 100% 20u "$(apcStartupLater)"
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
  ; The language, kept for the next install and the uninstaller.
  WriteRegStr HKCU "${LANGUAGE_KEY}" "${MUI_LANGDLL_REGISTRY_VALUENAME}" $LANGUAGE
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
  ; The language the app starts in the first time, on a fresh install, as the app's own language tags.
  ${IfNot} ${Silent}
  ${AndIfNot} ${isUpdated}
    ${If} $LANGUAGE == ${LANG_APC_EN}
      StrCpy $R3 "en-US"
    ${Else}
      StrCpy $R3 "pt-BR"
    ${EndIf}
    ReadEnvStr $R1 APPDATA
    CreateDirectory "$R1\${PRODUCT_NAME}"
    FileOpen $R2 "$R1\${PRODUCT_NAME}\installer-language.txt" w
    FileWrite $R2 $R3
    FileClose $R2
  ${EndIf}
!macroend

; The uninstaller speaks the language chosen at install, or Portuguese when none was kept.
!macro customUnInit
  StrCpy $LANGUAGE ${LANG_APC_PT}
  ReadRegStr $R0 HKCU "${LANGUAGE_KEY}" "${MUI_LANGDLL_REGISTRY_VALUENAME}"
  ${If} $R0 != ""
    StrCpy $LANGUAGE $R0
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
    !insertmacro MUI_HEADER_TEXT "$(apcDataTitle)" "$(apcDataText)"
    nsDialogs::Create 1018
    Pop $R0
    ${If} $R0 == error
      Abort
    ${EndIf}
    ; Everything stays within the page's area, which ends a little below 120u, as on the installer's pages.
    ${NSD_CreateLabel} 0 0 -64u 20u "$(apcDataSize)"
    Pop $R0
    ${NSD_CreateButton} -60u 2u 60u 14u "$(apcDataOpen)"
    Pop $R0
    ${NSD_OnClick} $R0 un.dataFolderOpen
    ${NSD_CreateRadioButton} 0 22u 100% 12u "$(apcDataKeep)"
    Pop $dataKeep
    ${If} $dataOnPostgresql == 1
      StrCpy $R1 "$(apcDataKeepPostgresql)"
    ${Else}
      StrCpy $R1 "$(apcDataKeepSqlite)"
    ${EndIf}
    ${NSD_CreateLabel} 12u 34u -12u 34u $R1
    Pop $R0
    ${NSD_CreateRadioButton} 0 70u 100% 12u "$(apcDataDelete)"
    Pop $dataDelete
    ${If} $dataOnPostgresql == 1
      StrCpy $R1 "$(apcDataDeletePostgresql)"
    ${Else}
      StrCpy $R1 "$(apcDataDeleteSqlite)"
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
        StrCpy $R1 "$(apcDataConfirmPostgresql)"
      ${Else}
        StrCpy $R1 "$(apcDataConfirmSqlite)"
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
    DetailPrint "$(apcDataDeleting)"
    RMDir /r "$dataFolder"
  ${EndIf}
!macroend
