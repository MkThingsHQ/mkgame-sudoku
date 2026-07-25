const HAPTIC_CONTROL_ID = 'mimodoku-haptic-control';

function triggerSafariSwitchHaptic() {
  if (typeof document === 'undefined' || !document.body) return false;

  let control = document.getElementById(
    HAPTIC_CONTROL_ID
  ) as HTMLInputElement | null;
  let label = document.querySelector<HTMLLabelElement>(
    `[data-haptic-label="${HAPTIC_CONTROL_ID}"]`
  );

  if (!control || !label) {
    control = document.createElement('input');
    control.id = HAPTIC_CONTROL_ID;
    control.type = 'checkbox';
    control.setAttribute('switch', '');
    control.setAttribute('aria-hidden', 'true');
    control.dataset.hapticFallback = 'true';
    control.tabIndex = -1;
    control.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';

    label = document.createElement('label');
    label.htmlFor = HAPTIC_CONTROL_ID;
    label.dataset.hapticLabel = HAPTIC_CONTROL_ID;
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';

    document.body.appendChild(control);
    document.body.appendChild(label);
  }

  label.click();
  return true;
}

/**
 * Requests best-effort haptic feedback from a mobile browser.
 *
 * Android and other supporting browsers use the standard Vibration API. Older
 * iOS Safari releases fall back to the native haptic emitted by a switch input.
 * Unsupported browsers safely do nothing.
 */
export function triggerHapticFeedback(pattern: number | number[]) {
  if (typeof navigator === 'undefined') return false;

  if (typeof navigator.vibrate === 'function') {
    try {
      if (navigator.vibrate(pattern)) return true;
    } catch {
      // Try the Safari fallback when the exposed API cannot be used.
    }
  }

  return triggerSafariSwitchHaptic();
}
