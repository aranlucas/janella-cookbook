/**
 * Haptic feedback utilities for mobile interactions
 * Uses the Vibration API when available
 */

type HapticPattern = "light" | "medium" | "success";

type VibrationPattern = number | readonly number[];

function isVibrationSequence(value: VibrationPattern): value is readonly number[] {
  return Array.isArray(value);
}

const patterns: Record<HapticPattern, VibrationPattern> = {
  light: 10,
  medium: 25,
  success: [50, 50, 50],
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
    const vibrationPattern = patterns[pattern];

    return navigator.vibrate(
      isVibrationSequence(vibrationPattern) ? [...vibrationPattern] : vibrationPattern,
    );
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
 * Success feedback - for completed actions
 */
export function hapticSuccess(): boolean {
  return haptic("success");
}
