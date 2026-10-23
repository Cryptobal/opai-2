import { formatearCLP, formatearRut, formatearTelefono, clp } from "@opai/domain";

const ZONA = "America/Santiago";

/** "hace 3 días", "hace 2 h", "ayer"; "dd-mm-aaaa" pasado un mes. */
export function haceCuanto(valor: string | Date | null | undefined, ahora = new Date()): string {
  if (!valor) return "—";
  const d = new Date(valor);
  const s = Math.round((ahora.getTime() - d.getTime()) / 1000);
  if (s < 60) return "recién";
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  if (dias < 31)
    return `hace ${Math.round(dias / 7)} ${Math.round(dias / 7) === 1 ? "semana" : "semanas"}`;
  return fecha(d);
}

/** dd-mm-aaaa en la zona del tenant. Acepta ISO de fecha (`aaaa-mm-dd`) sin correr el día. */
export function fecha(valor: string | Date | null | undefined, zona = ZONA): string {
  if (!valor) return "—";
  if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [a, mes, d] = valor.split("-");
    return `${d}-${mes}-${a}`;
  }
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: zona,
  })
    .format(new Date(valor))
    .replace(/\//g, "-");
}

/** HH:mm en la zona del tenant. */
export function hora(valor: string | Date, zona = ZONA): string {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: zona,
  }).format(new Date(valor));
}

/** "hace 3 días · 20-10-2026 11:42". */
export function cuandoCompleto(valor: string | Date): string {
  return `${haceCuanto(valor)} · ${fecha(valor)} ${hora(valor)}`;
}

/** "Viernes 23-10-2026". */
export function diaLargo(d = new Date(), zona = ZONA): string {
  const dia = new Intl.DateTimeFormat("es-CL", { weekday: "long", timeZone: zona }).format(d);
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)} ${fecha(d, zona)}`;
}

/** Hoy en la zona del tenant como `aaaa-mm-dd`. */
export function hoyIso(zona = ZONA): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(new Date());
}

export const pesos = (n: number | null | undefined) =>
  n == null ? "—" : formatearCLP(clp(Math.round(n)));
export const rut = (r: string | null | undefined) => (r ? formatearRut(r) : "—");
export const telefono = (t: string | null | undefined) => (t ? formatearTelefono(t) : "—");
