import type { Integracion } from "./tipos";

/** Orden en la grilla: DTE de emisión, cesión Octava al lado, resto estable. */
function pesoOrden(grupo: Integracion[]): number {
  const i = grupo[0];
  if (!i) return 999;
  if (i.categoria === "ia") return 0;
  if (i.categoria === "dte") return 10;
  if (i.proveedor === "dte_cesion") return 11;
  if (i.estado === "proximamente") return 200;
  return 100;
}

/**
 * Una tarjeta por integración, salvo IA (una tarjeta con los tres proveedores).
 * Evita mezclar «próximamente» con integraciones disponibles en la misma tarjeta (CAR-149).
 */
export function gruposTarjetasIntegraciones(lista: Integracion[]): Integracion[][] {
  const ia = lista.filter((i) => i.categoria === "ia");
  const resto = lista.filter((i) => i.categoria !== "ia");
  const grupos: Integracion[][] = [];
  if (ia.length) grupos.push(ia);
  for (const i of resto) grupos.push([i]);
  grupos.sort((a, b) => {
    const pa = pesoOrden(a);
    const pb = pesoOrden(b);
    if (pa !== pb) return pa - pb;
    return (a[0]?.nombre ?? "").localeCompare(b[0]?.nombre ?? "", "es");
  });
  return grupos;
}

/** Integración que define estado, enlace y pie de la tarjeta (nunca un placeholder si hay otra). */
export function representanteTarjetaIntegracion(items: Integracion[]): Integracion | null {
  if (!items.length) return null;
  if (items.length === 1) return items[0] ?? null;
  return (
    items.find((x) => x.estado === "error") ??
    items.find((x) => x.estado === "configurada") ??
    items.find((x) => x.estado !== "proximamente") ??
    items[0] ??
    null
  );
}
