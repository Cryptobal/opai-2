/** Lo que la persona dejó abierto o cerrado en la planilla, guardado en el navegador (CAR-537). */
type Cambios = Record<string, boolean>;

const oyentes = new Set<() => void>();
const memoria = new Map<string, string>();
const clave = (epoca: string) => `opai_flujo_abiertas_${epoca}`;

export function leerTexto(epoca: string): string {
  try {
    return localStorage.getItem(clave(epoca)) ?? memoria.get(epoca) ?? "";
  } catch {
    return memoria.get(epoca) ?? "";
  }
}

export function escribirCambios(epoca: string, cambios: Cambios) {
  const texto = JSON.stringify(cambios);
  memoria.set(epoca, texto);
  try {
    localStorage.setItem(clave(epoca), texto);
  } catch {
    // Sin almacenamiento (modo privado): el estado vale solo mientras la pestaña siga abierta.
  }
  oyentes.forEach((o) => o());
}

export function suscribir(aviso: () => void) {
  oyentes.add(aviso);
  window.addEventListener("storage", aviso);
  return () => {
    oyentes.delete(aviso);
    window.removeEventListener("storage", aviso);
  };
}

export function leerCambios(texto: string): Cambios {
  try {
    const datos: unknown = texto ? JSON.parse(texto) : {};
    if (datos === null || typeof datos !== "object" || Array.isArray(datos)) return {};
    return Object.fromEntries(Object.entries(datos).filter(([, v]) => typeof v === "boolean"));
  } catch {
    return {};
  }
}
