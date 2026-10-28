// Mapeo puro de negocios, etapas, historial y contactos del negocio (CrmPipelineStage, CrmDeal,
// CrmDealStageHistory, CrmDealContact). PENDIENTE de que el CRM PR 1 (schema comercial) esté en main:
// aquí no se importa nada de `comercial.prisma` (no existe en main) y el plan solo cuenta filas.
import { nombreCanonico } from "./normalizar";
import type {
  DatosOpai1,
  EtapaOpai1,
  HistorialEtapaOpai1,
  InstalacionOpai1,
  NegocioOpai1,
} from "./origen";

/** Se pasa a `true` en el PR que agregue la carga comercial, cuando el CRM PR 1 esté en main. */
export const COMERCIAL_EN_MAIN: boolean = false;

export const MOTIVO_PENDIENTE_CRM = "pendiente_crm_pr1";

export type TipoEtapa = "abierta" | "ganada" | "perdida";
export type EtapaMapeada = { nombre: string; orden: number; tipo: TipoEtapa; exige: string[] };

/** Mapeo 1:1 (§6): `isClosedWon`/`isClosedLost` → `tipo`; `isAccepted` → exige inicio de servicio. */
export function mapearEtapa(e: EtapaOpai1): EtapaMapeada | { error: "etapa_ambigua" } {
  if (e.isClosedWon && e.isClosedLost) return { error: "etapa_ambigua" };
  const tipo: TipoEtapa = e.isClosedWon ? "ganada" : e.isClosedLost ? "perdida" : "abierta";
  return {
    nombre: e.name.trim(),
    orden: e.order,
    tipo,
    exige: e.isAccepted ? ["inicio_servicio"] : [],
  };
}

export const MOTIVOS_PERDIDA = [
  "precio",
  "cobertura",
  "plazo",
  "sin_respuesta",
  "competencia",
  "no_califica",
  "otro",
] as const;
export type MotivoPerdida = (typeof MOTIVOS_PERDIDA)[number];

const esMotivo = (v: string): v is MotivoPerdida =>
  (MOTIVOS_PERDIDA as readonly string[]).includes(v);

/** Las pérdidas sin categoría quedan nulas; una categoría desconocida también, con aviso. */
export function mapearMotivoPerdida(categoria: string | null | undefined): {
  motivo: MotivoPerdida | null;
  desconocido: boolean;
} {
  const v = (categoria ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (v === "") return { motivo: null, desconocido: false };
  return esMotivo(v) ? { motivo: v, desconocido: false } : { motivo: null, desconocido: true };
}

export type RolNegocioContacto = { rol: "decisor" | "usuario" | null; esPrincipal: boolean };

/** `decision_maker` → decisor; `primary` → es_principal; `participant` → usuario (a revisar). */
export function mapearRolNegocioContacto(role: string): RolNegocioContacto {
  const r = role.trim().toLowerCase();
  if (r === "decision_maker") return { rol: "decisor", esPrincipal: false };
  if (r === "primary") return { rol: null, esPrincipal: true };
  if (r === "participant") return { rol: "usuario", esPrincipal: false };
  return { rol: null, esPrincipal: false };
}

export type TramoEtapa = {
  idOpai1: string;
  desde: string | null;
  hasta: string;
  en: string;
  /** Milisegundos en la etapa anterior; null en el primer cambio. */
  duracionAnteriorMs: number | null;
};

/** Historial de etapas de un negocio, tal cual, en orden y con la duración en la etapa anterior. */
export function historialNegocio(
  filas: readonly HistorialEtapaOpai1[],
  dealId: string,
): TramoEtapa[] {
  const propias = filas
    .filter((h) => h.dealId === dealId)
    .sort((a, b) => Date.parse(a.changedAt) - Date.parse(b.changedAt) || a.id.localeCompare(b.id));
  return propias.map((h, i) => {
    const previo = propias[i - 1];
    return {
      idOpai1: h.id,
      desde: h.fromStageId ?? null,
      hasta: h.toStageId,
      en: h.changedAt,
      duracionAnteriorMs: previo ? Date.parse(h.changedAt) - Date.parse(previo.changedAt) : null,
    };
  });
}

/**
 * Instalaciones del negocio (§6): primero las activadas por el negocio (`activatedByDealId`), luego
 * coincidencia por nombre dentro de la cuenta. Nunca se crea una instalación desde el texto (R28).
 * La vía de `CpqQuote.installationId` queda fuera: cotizaciones no se importan en este bloque.
 */
export type InstalacionesNegocio = {
  ids: string[];
  via: "activada" | "nombre" | "ambigua" | "sin_coincidencia";
};

export function instalacionesDeNegocio(
  negocio: NegocioOpai1,
  instalaciones: readonly InstalacionOpai1[],
): InstalacionesNegocio {
  const activadas = instalaciones
    .filter((i) => i.activatedByDealId === negocio.id)
    .map((i) => i.id);
  if (activadas.length > 0) return { ids: activadas.sort(), via: "activada" };
  const nombre = negocio.installationName ? nombreCanonico(negocio.installationName) : "";
  const porNombre = nombre
    ? instalaciones.filter(
        (i) => i.accountId === negocio.accountId && nombreCanonico(i.name) === nombre,
      )
    : [];
  if (porNombre.length === 1) return { ids: porNombre.map((i) => i.id), via: "nombre" };
  // Varias con el mismo nombre: no se adivina, va al reporte.
  return { ids: [], via: porNombre.length > 1 ? "ambigua" : "sin_coincidencia" };
}

export type Pendiente = { entidad: string; filas: number; motivo: string };

/** Mientras el schema comercial no esté en main, el plan solo cuenta las filas pendientes. */
export function pendientesComerciales(datos: DatosOpai1): Pendiente[] {
  if (COMERCIAL_EN_MAIN) return [];
  const conteos: [string, number][] = [
    ["etapa", datos.pipelineStages.length],
    ["negocio", datos.deals.length],
    ["negocio_etapa", datos.dealStageHistory.length],
    ["negocio_contacto", datos.dealContacts.length],
  ];
  return conteos
    .filter(([, n]) => n > 0)
    .map(([entidad, filas]) => ({ entidad, filas, motivo: MOTIVO_PENDIENTE_CRM }));
}
