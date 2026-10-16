; The installer's "Banco de dados" page: which database the server on this computer uses, SQLite (the default) or
; PostgreSQL, each with why to pick it. electron-builder includes this file before its own headers, so the page and
; its functions are defined in its macros, which it inserts later: customPageAfterChangeDir after the folder page,
; customInstall while installing. The installer can't edit config.json, so it leaves the choice in
; installer-database.txt in the app's userData folder, which the app moves into config.json on its next start (see
; src/database.ts). An update, an install over the app or a userData whose config.json names a database already keeps
; that choice and skips the page; a silent install shows no page and leaves no choice, which the app takes as SQLite.

!ifndef BUILD_UNINSTALLER
  !include LogicLib.nsh
  !include nsDialogs.nsh
  !include WordFunc.nsh

  ; "sqlite" or "postgresql" once the page was left; empty when it was skipped.
  Var databaseChoice
  Var databasePostgresql
  Var databaseSqlite
!endif

!macro customPageAfterChangeDir
  Page custom databasePageCreate databasePageLeave

  ; Tells whether a database was chosen before: on an update, over an installed app, or in a config.json that names
  ; one. Leaves "1" in $R0 when so, "0" otherwise.
  Function databaseChosenBefore
    StrCpy $R0 0
    ${If} ${isUpdated}
      StrCpy $R0 1
      Return
    ${EndIf}
    ReadRegStr $R1 HKCU "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
    ReadRegStr $R2 HKLM "${UNINSTALL_REGISTRY_KEY}" "UninstallString"
    ${If} "$R1$R2" != ""
      StrCpy $R0 1
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
    ${NSD_CreateLabel} 12u 59u -12u 30u "Um servidor de banco de dados separado, para quem já usa PostgreSQL ou quer mais de um computador acessando o mesmo banco. Precisa instalar e configurar o PostgreSQL antes (veja o guia do servidor)."
    Pop $R0
    ${NSD_CreateLabel} 0 94u 100% 20u "Dá para trocar depois, mas os dados não vão sozinhos: veja ""Trocar de banco de dados"" no guia do servidor."
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
!macroend

!macro customInstall
  ${If} $databaseChoice != ""
    ReadEnvStr $R1 APPDATA
    CreateDirectory "$R1\${PRODUCT_NAME}"
    FileOpen $R2 "$R1\${PRODUCT_NAME}\installer-database.txt" w
    FileWrite $R2 $databaseChoice
    FileClose $R2
  ${EndIf}
!macroend
