/**
 * Haptic feedback utilities for mobile interactions
 * Uses the Vibration API when available
 */

type HapticPattern =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "selection";

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [50, 50, 50],
  warning: [100, 50, 100],
  error: [200, 100, 200],
  selection: 5,
};

/**
 * Check if haptic feedback is supported
 */
export function isHapticsSupported(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

/**
 * Trigger haptic feedback
 * @param pattern - The type of haptic feedback
 * @returns true if vibration was triggered, false otherwise
 */
export function haptic(pattern: HapticPattern = "medium"): boolean {
  if (!isHapticsSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(patterns[pattern]);
  } catch {
    return false;
  }
}

/**
 * Light tap feedback - for selections and minor interactions
 */
export function hapticLight(): boolean {
  return haptic("light");
}

/**
 * Medium tap feedback - for button presses
 */
export function hapticMedium(): boolean {
  return haptic("medium");
}

/**
 * Heavy tap feedback - for significant actions
 */
export function hapticHeavy(): boolean {
  return haptic("heavy");
}

/**
 * Success feedback - for completed actions
 */
export function hapticSuccess(): boolean {
  return haptic("success");
}

/**
 * Warning feedback - for alerts
 */
export function hapticWarning(): boolean {
  return haptic("warning");
}

/**
 * Error feedback - for errors
 */
export function hapticError(): boolean {
  return haptic("error");
}

/**
 * Selection feedback - for list selections
 */
export function hapticSelection(): boolean {
  return haptic("selection");
}

/**
 * Custom vibration pattern
 * @param pattern - Array of durations (vibrate, pause, vibrate, ...) in milliseconds
 */
export function hapticCustom(pattern: number | number[]): boolean {
  if (!isHapticsSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}

/**
 * Stop any ongoing vibration
 */
export function hapticStop(): boolean {
  if (!isHapticsSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(0);
  } catch {
    return false;
  }
}
