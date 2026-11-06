import type { PreferenciasShell } from "./preferencias-shell";

type ItemConContador = { href: string; contador?: number; alerta?: boolean };

/**
 * Pone los números del menú: el de la Bandeja (siempre, aun en 0) y el de Solicitudes (CAR-211, solo
 * cuando hay nuevas por revisar, con la alerta que lo hace visible también en el riel).
 */
export function conContadores<T extends ItemConContador>(
  nav: readonly T[],
  preferencias: Pick<PreferenciasShell, "bandejaContador" | "solicitudesNuevas"> | null | undefined,
): T[] {
  const nuevas = preferencias?.solicitudesNuevas ?? 0;
  return nav.map((n) => {
    if (n.href === "/bandeja") return { ...n, contador: preferencias?.bandejaContador ?? 0 };
    if (n.href === "/solicitudes" && nuevas > 0) return { ...n, contador: nuevas, alerta: true };
    return n;
  });
}
