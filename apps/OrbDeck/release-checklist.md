# OrbDeck beta release checklist

## Automated checks

- `npm run typecheck`
- `npm run build`
- `cargo fmt --all -- --check`
- `cargo check --workspace`
- `cargo test --workspace`
- `npm run build:release`

## Clean Windows test

- Install the NSIS setup as the current user.
- Complete first-run setup in every available language.
- Allow private-network access in Windows Firewall.
- Scan the QR code from a phone on the same Wi-Fi network.
- Trigger one harmless log action and one confirmation-required action.
- Verify that an incorrect Web UI password is rejected.
- Close the window and reopen OrbDeck from the system tray.
- Export a backup, change the deck and restore the backup.
- Export diagnostics from Logs and confirm that it contains no action
  parameters or password hash.
- Install a newer build over the existing version and confirm that the deck is
  preserved.
- Publish a newer GitHub release with the signed updater artifact.
- Update the repository-root `latest.json` only after all release assets are
  available.
- Confirm that the GitHub tag and `latest.json` use the exact same version.
- Confirm manual and automatic update checks, release notes, progress display
  and installation.
- Confirm that a modified package or signature is rejected.
- Confirm release startup does not open a command window and Runtime entries
  appear under Logs.
- Uninstall OrbDeck and verify the expected application removal behavior.

## Public download

- Publish the checksum together with the installer.
- Publish the installer, its `.sig` file and its `.sha256` file as assets of
  the matching release in `Nexiii/OrbDeck`.
- Commit the matching `latest.json` to the root of `Nexiii/OrbDeck`.
- Back up the updater private key separately and never publish it.
- State clearly when a build is unsigned.
- Add a code-signing certificate before promoting the download beyond the
  closed alpha.
- Link `PRIVACY.md`, `LICENSE` and `CHANGELOG.md` from the release notes.
