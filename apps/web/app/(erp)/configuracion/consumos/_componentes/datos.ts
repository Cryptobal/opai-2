import { ejecutarComoUsuario } from "@/lib/servidor";

type Fila = { clave: string; cantidad: number; costoUsd: number };
export type Resumen = {
  mes: string;
  totalUsd: number;
  porRecurso: Fila[];
  porRecursoModulo: (Fila & { recurso: string; modulo: string })[];
};
export type PorAgente = {
  apiKeyId: string;
  nombre: string;
  ejecuciones: number;
  costoUsd: number;
}[];

/** "aaaa-mm" del mes anterior. */
export function mesAnterior(mes: string) {
  const [a, m] = mes.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(a, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

/** Últimos 12 meses como opciones ("Octubre 2026"). */
export function mesesHasta(ahora = new Date()) {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - i, 1));
    const nombre = new Intl.DateTimeFormat("es-CL", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
    return {
      valor: d.toISOString().slice(0, 7),
      etiqueta: nombre.charAt(0).toUpperCase() + nombre.slice(1).replace(" de ", " "),
    };
  });
}

/** Resumen del mes, del anterior (para la variación) y consumo por agente. */
export async function cargarConsumos(mes: string | undefined) {
  const actual = await ejecutarComoUsuario<Resumen>(
    "erp",
    "core.consumos.resumen",
    mes ? { mes } : {},
  );
  const elegido = actual.ok ? actual.data.mes : (mes ?? new Date().toISOString().slice(0, 7));
  const [previo, agentes] = await Promise.all([
    ejecutarComoUsuario<Resumen>("erp", "core.consumos.resumen", { mes: mesAnterior(elegido) }),
    ejecutarComoUsuario<PorAgente>("erp", "core.consumos.por_agente", { mes: elegido }),
  ]);
  return {
    actual,
    previo: previo.ok ? previo.data : null,
    agentes: agentes.ok ? agentes.data : [],
    mes: elegido,
  };
}

/** Totales por familia de recurso (IA, correo, geo, llamadas) de un resumen. */
export function kpis(r: Resumen | null) {
  const de = (prefijo: string) => (r?.porRecurso ?? []).filter((f) => f.clave.startsWith(prefijo));
  const suma = (fs: Fila[], k: "cantidad" | "costoUsd") => fs.reduce((t, f) => t + f[k], 0);
  return {
    iaUsd: suma(de("ia."), "costoUsd"),
    iaTokens: suma(de("ia."), "cantidad"),
    correos: suma(de("correo."), "cantidad"),
    geo: suma(de("geo."), "cantidad"),
    llamadas: suma(de("capacidad.ejecucion"), "cantidad"),
  };
}

const CLASE: Record<string, string> = {
  economica: "Económica",
  estandar: "Estándar",
  potente: "Potente",
};
const FAMILIA: Record<string, string> = {
  correo: "Correos",
  geo: "Geolocalización",
  almacenamiento: "Almacenamiento",
  capacidad: "Llamadas API y MCP",
};

/** Nombre legible de un recurso medido; la IA se agrupa por clase (entrada y salida juntas). */
export function nombreRecurso(recurso: string) {
  const [familia = "", clase = ""] = recurso.split(".");
  if (familia === "ia") return `IA · ${CLASE[clase] ?? clase}`;
  return FAMILIA[familia] ?? recurso;
}

export const nombreModulo = (m: string) =>
  m === "core" ? "Núcleo" : m.charAt(0).toUpperCase() + m.slice(1);
