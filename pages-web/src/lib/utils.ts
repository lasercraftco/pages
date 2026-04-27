import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds)) return "—";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatPages(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${n.toLocaleString()} pages`;
}

export function timeToFinish(remainingWords: number, wpm = 250): string {
  const minutes = Math.max(1, Math.round(remainingWords / wpm));
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function sortableTitle(title: string): string {
  return title.replace(/^(the |a |an )/i, "").trim().toLowerCase();
}

export function sortableAuthor(name: string): string {
  // "Ursula K. Le Guin" -> "le guin, ursula k."
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.toLowerCase();
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(" ");
  return `${last}, ${rest}`.toLowerCase();
}
