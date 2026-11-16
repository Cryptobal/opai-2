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
 * La Bandeja, con cualquier pendiente (avisos, aprobaciones o tareas), se resalta: globo rojo en el
 * riel y la barra inferior, y píldora roja en la barra lateral (decisión de Carlos del 11-nov-2026).
 * En cero queda su número discreto. Las novedades del producto ya no suman aquí (CAR-430): su aviso
 * va en el botón «Yo» y en la fila «Novedades» del menú de cuenta.
 */
export function conContadores<T extends ItemConContador>(
  nav: readonly T[],
  preferencias: Pick<PreferenciasShell, "bandejaContador" | "solicitudesNuevas"> | null | undefined,
): T[] {
  const nuevas = preferencias?.solicitudesNuevas ?? 0;
  const bandeja = preferencias?.bandejaContador ?? 0;
  return nav.map((n) => {
    if (n.href === "/bandeja")
      return bandeja > 0
        ? { ...n, contador: bandeja, alerta: true, resaltado: true }
        : { ...n, contador: 0 };
    if (n.href === "/solicitudes" && nuevas > 0) return { ...n, contador: nuevas, alerta: true };
    return n;
  });
}

/**
 * Punto rojo sobre el avatar y el botón «Yo» con novedades sin leer, en todos los portales (CAR-430).
 * Antes el ERP lo apagaba porque la Bandeja repetía las novedades; desde CAR-430 la Bandeja ya no las
 * muestra, así que el aviso vive aquí y en la fila «Novedades» del menú de cuenta.
 */
export function avisoNovedadesAvatar(novedadesNoLeidas: number): boolean {
  return novedadesNoLeidas > 0;
}
