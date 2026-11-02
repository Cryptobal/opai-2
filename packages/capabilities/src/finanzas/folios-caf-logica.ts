import {
  esCafMarcadoSintetico,
  folioActualInicialCaf,
  foliosRestantes,
  formatearLecturaCaf,
  leerCafXml,
  requiereCafSintetico,
  validarCaf,
  type CafLectura,
} from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { aFecha, hoy } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import { guardarSecretoConIdTx } from "../integraciones/secretos";
import type { Contexto } from "../types";
import { folioVista } from "./ventas-comun";

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

function errorDeValidacionCaf(codigo: "xml_invalido" | "rut_distinto" | "tipo_no_habilitado" | "solape" | "vencido" | "no_sintetico"): never {
  switch (codigo) {
    case "xml_invalido":
      throw reglaDeNegocio("El XML del CAF no es válido o está corrupto.");
    case "rut_distinto":
      throw reglaDeNegocio("El RUT del CAF no coincide con el RUT emisor configurado.");
    case "tipo_no_habilitado":
      throw reglaDeNegocio("El tipo de DTE del CAF no está habilitado para este tenant.");
    case "solape":
      throw reglaDeNegocio("El rango del CAF se solapa con un rango activo del tenant.");
    case "vencido":
      throw reglaDeNegocio("El CAF está vencido; solicite uno nuevo al SII.");
    default:
      throw reglaDeNegocio("No se pudo validar el CAF.");
  }
}

export async function validarCafParaTenant(ctx: Contexto, cafXml: string, rutEmisor: string) {
  const hoyIso = hoy();
  const pre = leerCafXml(cafXml);
  const vigentes = await ctx.db.dteFolio.findMany({ where: { activo: true } });
  const validacion = validarCaf({
    xml: cafXml,
    rutEmisorEsperado: rutEmisor,
    hoyIso,
    rangosActivos: vigentes
      .filter((v) => (pre ? v.tipoDte === pre.tipoDte : true))
      .map((v) => ({ folioDesde: v.folioDesde, folioHasta: v.folioHasta })),
  });
  if (!validacion.ok) errorDeValidacionCaf(validacion.error);
  const slug = await slugTenantDe(ctx);
  if (requiereCafSintetico(slug) && !esCafMarcadoSintetico(validacion.lectura)) {
    throw reglaDeNegocio(
      "En el tenant QA solo se aceptan CAF sintéticos de certificación (IDK o RUT de prueba).",
    );
  }
  return { lectura: validacion.lectura, hoyIso, vigentes };
}

export function vistaPreviaCafCargado(
  lectura: CafLectura,
  avisos: AvisosDte,
  hoyIso: string,
) {
  const folioActual = folioActualInicialCaf(lectura.folioDesde, null);
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
  vigentes: Awaited<ReturnType<typeof ctx.db.dteFolio.findMany>>,
  avisos: AvisosDte,
) {
  const integracionId = await integracionDteId(tx, ctx.tenantId);
  const nombreSecreto = nombreSecretoCaf(lectura.tipoDte, lectura.idk, lectura.folioDesde, lectura.folioHasta);
  const { id: secretoId } = await guardarSecretoConIdTx(tx, ctx, integracionId, nombreSecreto, cafXml);
  const folioActual = folioActualInicialCaf(lectura.folioDesde, null);
  for (const v of vigentes) {
    if (v.tipoDte !== lectura.tipoDte) continue;
    if (foliosRestantes(v.folioActual, v.folioHasta) > 0) continue;
    await tx.dteFolio.update({ where: { id: v.id }, data: { activo: false } });
  }
  return tx.dteFolio.create({
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
      umbralAviso: avisos.umbralFoliosPct,
      activo: true,
    },
  });
}
