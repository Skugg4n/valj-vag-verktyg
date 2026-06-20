// Pure: the honest save-status label shown in the workshop topbar.
// Anonymous users are guaranteed the device (localStorage) save; the cloud is a
// silent backup, so we only flag it when it fails. Signed-in users are
// guaranteed the account (cloud) save. Never show a plain "saved" when a save
// the user relies on has failed.
export function saveStatusLabel({ isAnonymous, cloudState }) {
  if (cloudState === 'saving') return { text: 'Sparar…', error: false }
  if (cloudState === 'error') {
    return isAnonymous
      ? { text: 'Sparat här, molnbackup misslyckades', error: true }
      : { text: 'Kunde inte spara', error: true }
  }
  return {
    text: isAnonymous ? 'Sparat på den här enheten' : 'Sparat i ditt konto',
    error: false,
  }
}
