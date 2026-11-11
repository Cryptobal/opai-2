import {
  ambienteCafDesdeLectura,
  esCafMarcadoSintetico,
  folioActualInicialCaf,
  foliosRestantes,
  formatearLecturaCaf,
  leerCafXml,
  requiereCafSintetico,
  type CafLectura,
} from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { aFecha, hoy } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import { insertarSecretoConIdTx } from "../integraciones/secretos";
import type { Contexto } from "../types";
import { bytesCafOError } from "./caf-guardado";
import { folioVista } from "./ventas-comun";
import {
  errorDeValidacionCaf,
  errorFolioInicialCaf,
  esViolacionSolapeFolios,
  ultimoFolioOpai1AntesCorte,
  validarCafConRangos,
} from "./folios-caf-validacion";

type AvisosDte = { umbralFoliosPct: number; avisoCafDias: number };

async function slugTenantDe(ctx: Pick<Contexto, "db" | "tenantId">) {
  const t = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { slug: true } });
  return t?.slug ?? "";
}

async function integracionDteId(tx: TenantTx, tenantId: string): Promise<string> {
  const row = await tx.integracion.upsert({
    where: { tenantId_proveedor: { tenantId, proveedor: "dte" } },
    create: { tenantId, proveedor: "dte", modalidad: "propia", estado: "configurada" },
    update: {},
  });
  return row.id;
}

function nombreSecretoCaf(tipoDte: number, idk: string | null, folioDesde: number, folioHasta: number): string {
  const suf = idk?.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) ?? "sin-idk";
  return `caf_${tipoDte}_${folioDesde}_${folioHasta}_${suf}`;
}

export async function validarCafParaTenant(
  ctx: Contexto,
  cafXml: string,
  rutEmisor: string,
  fechaCorte1_0: Date | null | undefined,
) {
  bytesCafOError(cafXml);
  const hoyIso = hoy();
  const pre = leerCafXml(cafXml);
  const rangosCargados = await ctx.db.dteFolio.findMany({
    where: pre ? { tipoDte: pre.tipoDte } : {},
    select: { folioDesde: true, folioHasta: true, tipoDte: true, activo: true, folioActual: true, id: true },
  });
  const lectura = validarCafConRangos(
    cafXml,
    rutEmisor,
    rangosCargados.map((v) => ({ folioDesde: v.folioDesde, folioHasta: v.folioHasta })),
  );
  const slug = await slugTenantDe(ctx);
  if (requiereCafSintetico(slug) && !esCafMarcadoSintetico(lectura)) {
    throw reglaDeNegocio(
      "En el tenant QA solo se aceptan CAF sintéticos de certificación (IDK o RUT de prueba).",
    );
  }
  const ultimoFolioOpai1 = await ultimoFolioOpai1AntesCorte(ctx.db, lectura.tipoDte, fechaCorte1_0);
  const folioInicial = folioActualInicialCaf(lectura.folioDesde, lectura.folioHasta, ultimoFolioOpai1);
  if (!folioInicial.ok) errorFolioInicialCaf(folioInicial.error);
  return { lectura, hoyIso, ultimoFolioOpai1, folioActual: folioInicial.valor };
}

export function vistaPreviaCafCargado(
  lectura: CafLectura,
  avisos: AvisosDte,
  hoyIso: string,
  ultimoFolioOpai1: number | null,
  folioActual: number,
) {
  return {
    ...folioVista(
      {
        id: "",
        tipoDte: lectura.tipoDte,
        folioDesde: lectura.folioDesde,
        folioHasta: lectura.folioHasta,
        folioActual,
        cafVenceEn: lectura.venceEn ? aFecha(lectura.venceEn) : null,
        umbralAviso: avisos.umbralFoliosPct,
        activo: true,
      },
      { ...avisos, hoyIso },
    ),
    lectura: formatearLecturaCaf(lectura),
  };
}

export async function persistirCafCargado(
  ctx: Contexto,
  tx: TenantTx,
  cafXml: string,
  lectura: CafLectura,
  rutEmisor: string,
  avisos: AvisosDte,
  fechaCorte1_0: Date | null | undefined,
) {
  const rangosCargados = await tx.dteFolio.findMany({
    where: { tipoDte: lectura.tipoDte },
    select: { folioDesde: true, folioHasta: true, tipoDte: true, activo: true, folioActual: true, id: true },
  });
  validarCafConRangos(
    cafXml,
    rutEmisor,
    rangosCargados.map((v) => ({ folioDesde: v.folioDesde, folioHasta: v.folioHasta })),
  );
  const ultimoFolioOpai1 = await ultimoFolioOpai1AntesCorte(tx, lectura.tipoDte, fechaCorte1_0);
  const folioInicial = folioActualInicialCaf(lectura.folioDesde, lectura.folioHasta, ultimoFolioOpai1);
  if (!folioInicial.ok) errorFolioInicialCaf(folioInicial.error);
  const folioActual = folioInicial.valor;
  const integracionId = await integracionDteId(tx, ctx.tenantId);
  const nombreSecreto = nombreSecretoCaf(lectura.tipoDte, lectura.idk, lectura.folioDesde, lectura.folioHasta);
  const { id: secretoId } = await insertarSecretoConIdTx(tx, ctx, integracionId, nombreSecreto, cafXml, bytesCafOError(cafXml));
  for (const v of rangosCargados) {
    if (v.tipoDte !== lectura.tipoDte) continue;
    if (!v.activo) continue;
    if (foliosRestantes(v.folioActual, v.folioHasta) > 0) continue;
    await tx.dteFolio.update({ where: { id: v.id }, data: { activo: false } });
  }
  try {
    return await tx.dteFolio.create({
      data: {
        tenantId: ctx.tenantId,
        tipoDte: lectura.tipoDte,
        folioDesde: lectura.folioDesde,
        folioHasta: lectura.folioHasta,
        folioActual,
        cafSecretoId: secretoId,
        cafVenceEn: lectura.venceEn ? aFecha(lectura.venceEn) : null,
        cafAutorizadoEn: aFecha(lectura.autorizadoEn),
        cafIdk: lectura.idk,
        cafAmbiente: ambienteCafDesdeLectura(lectura),
        umbralAviso: avisos.umbralFoliosPct,
        activo: true,
      },
    });
  } catch (error) {
    if (esViolacionSolapeFolios(error)) errorDeValidacionCaf("solape");
    throw error;
  }
}
