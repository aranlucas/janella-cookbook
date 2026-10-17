export { cn } from "cn";

/** Formats a minute count for display, e.g. 25 -> "25 min", 210 -> "3 hr 30 min". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}
