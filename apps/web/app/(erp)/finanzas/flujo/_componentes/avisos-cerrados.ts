/** Avisos de cobro que la persona ya cerró, por usuario y empresa. Vuelven solo si llega uno nuevo. */

const oyentes = new Set<() => void>();
const clave = (epoca: string) => `opai_flujo_avisos_${epoca}`;

export function suscribirAvisos(aviso: () => void) {
  oyentes.add(aviso);
  return () => oyentes.delete(aviso);
}

export function leerCerrados(epoca: string): string[] {
  try {
    const texto = localStorage.getItem(clave(epoca)) ?? "";
    const valor: unknown = texto ? JSON.parse(texto) : [];
    return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function cerrarAvisos(epoca: string, ids: string[]) {
  const siguientes = [...new Set([...leerCerrados(epoca), ...ids])];
  try {
    localStorage.setItem(clave(epoca), JSON.stringify(siguientes));
  } catch {
    /* sin almacenamiento: el aviso sigue visible en esta carga */
  }
  oyentes.forEach((aviso) => aviso());
}

export function avisosPendientes<T extends { abonoId: string }>(avisos: readonly T[], cerrados: readonly string[]): T[] {
  const ya = new Set(cerrados);
  return avisos.filter((a) => !ya.has(a.abonoId));
}
