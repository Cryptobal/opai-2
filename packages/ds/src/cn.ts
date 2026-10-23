import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind resolviendo conflictos. */
export function cn(...entradas: ClassValue[]): string {
  return twMerge(clsx(entradas));
}
