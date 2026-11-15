// Textos de la tarjeta Previsión (CAR-276), agrupados como el export aprobado: sistema previsional, salud,
// cotiza y APV / cargas / discapacidad. Sin React: se prueba aparte.
import {
  AFPS,
  DISCAPACIDAD_INVALIDEZ,
  etiquetaDe,
  MONEDAS_APV,
  normalizarAfp,
  normalizarRegimen,
  normalizarSalud,
  REGIMENES_APV,
  REGIMENES_PREVISIONALES,
  SISTEMAS_SALUD,
  TIPOS_PENSION,
  TRAMOS_ASIGNACION,
} from "@opai/domain";

import type { Prevision } from "./lecturas-ficha";

export type Par = { etiqueta: string; valor: string | null };
export type Grupo = { titulo: string; pares: Par[] };

const siNo = (b: boolean) => (b ? "Sí" : "No");
const pct = (v: string | null) => (v ? `${v.replace(".", ",")} %` : null);

function apv(d: Prevision): string | null {
  if (!d.apvInstitucion && !d.apvMonto) return d.sensiblesOcultos ? null : "Sin APV";
  const monto = d.apvMonto
    ? d.apvMoneda === "pct"
      ? pct(d.apvMonto)
      : `${d.apvMonto.replace(".", ",")} ${etiquetaDe(MONEDAS_APV, d.apvMoneda) ?? ""}`.trim()
    : null;
  return [d.apvInstitucion, etiquetaDe(REGIMENES_APV, d.apvRegimen), monto].filter(Boolean).join(" · ");
}

function cargas(d: Prevision): string | null {
  if (d.cargasSimples === null) return null;
  const partes = [
    d.cargasSimples ? `${d.cargasSimples} simple${d.cargasSimples === 1 ? "" : "s"}` : null,
    d.cargasMaternales ? `${d.cargasMaternales} maternal${d.cargasMaternales === 1 ? "" : "es"}` : null,
    d.cargasInvalidez ? `${d.cargasInvalidez} de invalidez` : null,
  ].filter(Boolean);
  const tramo = etiquetaDe(TRAMOS_ASIGNACION, d.tramoAsignacion);
  if (!partes.length) return tramo ? `Sin cargas · ${tramo}` : "Sin cargas";
  return [partes.join(", "), tramo].filter(Boolean).join(" · ");
}

/** Valores del catálogo, o el texto escrito a mano si es anterior al selector (queda por verificar). */
export const porVerificar = (d: Prevision): boolean =>
  Boolean(
    (d.afp && !normalizarAfp(d.afp)) ||
      (d.regimen && !normalizarRegimen(d.regimen)) ||
      (d.sistemaSalud && !normalizarSalud(d.sistemaSalud)),
  );

export function gruposPrevision(d: Prevision): Grupo[] {
  const isapre = [d.isapreNombre, d.planIsapre].filter(Boolean).join(" · ") || null;
  return [
    {
      titulo: "Sistema previsional",
      pares: [
        { etiqueta: "AFP", valor: etiquetaDe(AFPS, normalizarAfp(d.afp) ?? d.afp) },
        { etiqueta: "Régimen", valor: etiquetaDe(REGIMENES_PREVISIONALES, normalizarRegimen(d.regimen) ?? d.regimen) },
        { etiqueta: "Tipo de pensión", valor: etiquetaDe(TIPOS_PENSION, d.tipoPension) },
        { etiqueta: "Jubilado", valor: siNo(d.jubilado) },
      ],
    },
    {
      titulo: "Salud",
      pares: [
        { etiqueta: "Sistema de salud", valor: etiquetaDe(SISTEMAS_SALUD, normalizarSalud(d.sistemaSalud) ?? d.sistemaSalud) },
        { etiqueta: "Isapre y plan", valor: isapre },
        { etiqueta: "Plan (UF)", valor: d.planUf },
        { etiqueta: "% adicional", valor: pct(d.saludAdicionalPct) },
      ],
    },
    {
      titulo: "Cotiza",
      pares: [
        { etiqueta: "AFP", valor: siNo(d.cotizaAfp) },
        { etiqueta: "AFC", valor: siNo(d.cotizaAfc) },
        { etiqueta: "Salud", valor: siNo(d.cotizaSalud) },
      ],
    },
    {
      titulo: "APV, cargas y discapacidad",
      pares: [
        { etiqueta: "APV", valor: apv(d) },
        { etiqueta: "Cargas familiares", valor: cargas(d) },
        { etiqueta: "Discapacidad o pensión de invalidez", valor: etiquetaDe(DISCAPACIDAD_INVALIDEZ, d.discapacidadInvalidez) },
      ],
    },
  ];
}

/** Valores iniciales de la hoja: códigos del catálogo (vacío si el texto anterior no calza) y `si`/`no`. */
export function inicialPrevision(d: Prevision): Record<string, string | null> {
  const sn = (b: boolean) => (b ? "si" : "no");
  const n = (v: number | null) => (v === null ? null : String(v));
  return {
    afp: normalizarAfp(d.afp),
    regimen: normalizarRegimen(d.regimen),
    tipoPension: d.tipoPension,
    jubilado: sn(d.jubilado),
    sistemaSalud: normalizarSalud(d.sistemaSalud),
    isapreNombre: d.isapreNombre,
    planIsapre: d.planIsapre,
    planUf: d.planUf,
    cotizacionUfPct: d.cotizacionUfPct,
    saludAdicionalPct: d.saludAdicionalPct,
    cotizaAfp: sn(d.cotizaAfp),
    cotizaAfc: sn(d.cotizaAfc),
    cotizaSalud: sn(d.cotizaSalud),
    apvInstitucion: d.apvInstitucion,
    apvRegimen: d.apvRegimen,
    apvMonto: d.apvMonto,
    apvMoneda: d.apvMoneda,
    tramoAsignacion: d.tramoAsignacion,
    cargasSimples: n(d.cargasSimples),
    cargasMaternales: n(d.cargasMaternales),
    cargasInvalidez: n(d.cargasInvalidez),
    discapacidadInvalidez: d.discapacidadInvalidez,
  };
}
