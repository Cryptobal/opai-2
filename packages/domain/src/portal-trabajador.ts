// Dominio puro del Portal Trabajador: sin Next, React ni base de datos. Todo cálculo tiene test.

/** Categorías de aviso que el trabajador puede configurar (Notificaciones, diseño 12). */
export const CATEGORIAS_AVISO = ["pauta", "documentos", "solicitudes", "central"] as const;
export type CategoriaAviso = (typeof CATEGORIAS_AVISO)[number];

/** Canales externos. El aviso dentro de la app (campana) siempre llega: no se configura. */
export const CANALES_AVISO = ["push", "correo"] as const;
export type CanalAviso = (typeof CANALES_AVISO)[number];

export type PreferenciaCategoria = Record<CanalAviso, boolean>;
export type Preferencias = Record<CategoriaAviso, PreferenciaCategoria>;

/** Silencio por defecto (ADR-020): sin elección de la persona, ningún canal externo. */
export function preferenciasPorDefecto(): Preferencias {
  return Object.fromEntries(
    CATEGORIAS_AVISO.map((c) => [c, { push: false, correo: false }]),
  ) as Preferencias;
}

function esRegistro(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Lo guardado puede venir incompleto o con categorías que ya no existen: se completa y se descarta. */
export function normalizarPreferencias(guardado: unknown): Preferencias {
  const base = preferenciasPorDefecto();
  if (!esRegistro(guardado)) return base;
  for (const categoria of CATEGORIAS_AVISO) {
    const fila = guardado[categoria];
    if (!esRegistro(fila)) continue;
    for (const canal of CANALES_AVISO) base[categoria][canal] = fila[canal] === true;
  }
  return base;
}

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const esHoraValida = (hora: string): boolean => HORA.test(hora);

function minutos(hora: string): number {
  const [h, m] = hora.split(":");
  return Number(h) * 60 + Number(m);
}

/**
 * Si `hora` ("HH:mm", hora de Chile) cae dentro del horario de silencio `[desde, hasta)`. La ventana
 * puede cruzar la medianoche (22:00–07:00). Sin ventana, o con desde = hasta, nunca hay silencio.
 */
export function enSilencio(hora: string, desde: string | null, hasta: string | null): boolean {
  if (!desde || !hasta || !esHoraValida(hora) || !esHoraValida(desde) || !esHoraValida(hasta))
    return false;
  const ahora = minutos(hora);
  const a = minutos(desde);
  const b = minutos(hasta);
  if (a === b) return false;
  return a < b ? ahora >= a && ahora < b : ahora >= a || ahora < b;
}

/** Datos de contacto y dirección que el propio trabajador completa (Mis datos, diseño 10). */
export type DatosContacto = {
  telefono: string | null;
  emailPersonal: string | null;
  direccionFormateada: string | null;
};

export type CampoFaltante = "telefono" | "emailPersonal" | "direccion";

/** Qué le falta completar al trabajador, para la tarjeta de Inicio. Orden estable. */
export function camposFaltantes(d: DatosContacto): CampoFaltante[] {
  const faltan: CampoFaltante[] = [];
  if (!d.telefono?.trim()) faltan.push("telefono");
  if (!d.emailPersonal?.trim()) faltan.push("emailPersonal");
  if (!d.direccionFormateada?.trim()) faltan.push("direccion");
  return faltan;
}

/** Coordenadas válidas de una dirección (latitud −90…90, longitud −180…180). */
export function coordenadasValidas(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** Primer nombre para el saludo de Inicio ("María José" → "María"). */
export function primerNombre(nombres: string): string {
  return nombres.trim().split(/\s+/)[0] ?? "";
}
