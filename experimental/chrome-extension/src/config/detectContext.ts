import type { ExtensionContext } from './types';

export function detectExtensionContext(): ExtensionContext {
  if (typeof window === 'undefined') {
    return 'background';
  }

  if (
    typeof chrome !== 'undefined' &&
    chrome.runtime != null &&
    typeof document !== 'undefined' &&
    document.location.protocol === 'chrome-extension:'
  ) {
    return 'popup';
  }

  return 'content-script';
}
