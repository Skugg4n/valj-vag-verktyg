let enabled = false;

export function setDebug(val) {
  enabled = val;
}

export function isDebug() {
  return enabled;
}

export function debugLog(...args) {
  if (enabled) {
    console.log('[debug]', ...args);
  }
}
