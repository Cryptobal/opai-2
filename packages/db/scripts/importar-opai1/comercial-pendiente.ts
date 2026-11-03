// Mapeo puro de negocios, etapas, historial y contactos del negocio (CrmPipelineStage, CrmDeal,
// CrmDealStageHistory, CrmDealContact). PENDIENTE de que el CRM PR 1 (schema comercial) esté en main:
// aquí no se importa nada de `comercial.prisma` (no existe en main) y el plan solo cuenta filas.
import { nombreCanonico } from "./normalizar";
import { mapearEtapaLegacy } from "./etapas-equivalencia";
import type {
  EtapaOpai1,
  HistorialEtapaOpai1,
  InstalacionOpai1,
  NegocioOpai1,
} from "./origen";

export * from "./comercial-motivos";
export * from "./comercial-pendientes-importacion";

export type TipoEtapa = "abierta" | "ganada" | "perdida";
export type EtapaMapeada = { nombre: string; orden: number; tipo: TipoEtapa; exige: string[] };

/** @deprecated Usar equivalencia por tenant (`resolverEtapaNegocio`). Conservado para dry-run de etapas. */
export function mapearEtapa(e: EtapaOpai1): EtapaMapeada | { error: "etapa_ambigua" } {
  return mapearEtapaLegacy(e);
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
