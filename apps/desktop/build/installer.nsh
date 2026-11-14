# Install for everyone on the computer (in Program Files) when Windows gives permission;
# if the person says No, or can't give it, install just for them instead (no admin needed).
# electron-builder's one-click installer only does one or the other, so these hooks add the switch.

!ifndef BUILD_UNINSTALLER
  # Runs first in .onInit, before the one-installer-at-a-time lock, so the elevated copy can take the lock.
  !macro preInit
    ${IfNot} ${UAC_IsInnerInstance}
    ${AndIfNot} ${UAC_IsAdmin}
      !insertmacro UAC_RunElevated
      ${If} $0 == 0
      ${AndIf} $1 == 1
        # The elevated copy did the install (or showed its own error). Nothing left to do here.
        SetErrorLevel $2
        Quit
      ${EndIf}
      # Refused (1223), not possible, or failed: carry on as a per-user install.
    ${EndIf}
  !macroend

  # Runs after the per-user setup; switches to "everyone" when we have admin rights.
  !macro customInit
    ${If} ${UAC_IsAdmin}
      StrCpy $installMode all
      SetShellVarContext all
      ReadRegStr $0 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
      ${If} $0 != ""
        StrCpy $INSTDIR $0
      ${Else}
        StrCpy $INSTDIR "$PROGRAMFILES64\${PRODUCT_FILENAME}"
      ${EndIf}

      # An older "just for me" copy would leave a second Encelium behind: remove it quietly
      # (its settings and chats are kept: they live in the user's AppData, not next to the app).
      ReadRegStr $0 HKCU "${UNINSTALL_REGISTRY_KEY}" QuietUninstallString
      ReadRegStr $1 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
      ${If} $0 != ""
      ${AndIf} $1 != ""
      ${AndIf} ${FileExists} "$1\${APP_EXECUTABLE_FILENAME}"
        ExecWait '$0 _?=$1'
        RMDir /r "$1"
        DeleteRegKey HKCU "${UNINSTALL_REGISTRY_KEY}"
        DeleteRegKey HKCU "${INSTALL_REGISTRY_KEY}"
      ${EndIf}
    ${Else}
      # Just for this user: a folder named "Encelium", not the package name "@enceliumdesktop"
      # (an existing install keeps its folder).
      ReadRegStr $0 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
      ${If} $0 == ""
        StrCpy $INSTDIR "$LOCALAPPDATA\Programs\${PRODUCT_FILENAME}"
      ${EndIf}
    ${EndIf}
  !macroend
!endif

# The uninstaller: a copy installed for everyone needs admin rights to remove.
!macro customUnInit
  ${GetParameters} $R0
  ClearErrors
  ${GetOptions} $R0 "/allusers" $R1
  ${IfNot} ${Errors}
    ${IfNot} ${UAC_IsAdmin}
      # Ask once for permission, then run the real uninstall quietly (the "Are you sure?" was already shown).
      ClearErrors
      ExecShellWait "runas" "$EXEPATH" '/allusers /S _?=$INSTDIR'
      Quit
    ${EndIf}
    StrCpy $installMode all
    SetShellVarContext all
  ${EndIf}
!macroend
