import type { PreferenciasShell } from "./preferencias-shell";

type ItemConContador = {
  href: string;
  contador?: number;
  alerta?: boolean;
  resaltado?: boolean;
};

/**
 * Pone los números del menú: el de la Bandeja (siempre, aun en 0) y el de Solicitudes (CAR-211, solo
 * cuando hay nuevas por revisar, con la alerta que lo hace visible también en el riel).
 *
 * La Bandeja suma las novedades del producto sin leer (CAR-316) y, si tiene algo pendiente, se
 * resalta: globo rojo en el riel y la barra inferior, y píldora roja en la barra lateral.
 */
export function conContadores<T extends ItemConContador>(
  nav: readonly T[],
  preferencias: Pick<PreferenciasShell, "bandejaContador" | "solicitudesNuevas"> | null | undefined,
  novedadesNoLeidas = 0,
): T[] {
  const nuevas = preferencias?.solicitudesNuevas ?? 0;
  const bandeja = (preferencias?.bandejaContador ?? 0) + novedadesNoLeidas;
  return nav.map((n) => {
    if (n.href === "/bandeja")
      return bandeja > 0
        ? { ...n, contador: bandeja, alerta: true, resaltado: true }
        : { ...n, contador: 0 };
    if (n.href === "/solicitudes" && nuevas > 0) return { ...n, contador: nuevas, alerta: true };
    return n;
  });
}
