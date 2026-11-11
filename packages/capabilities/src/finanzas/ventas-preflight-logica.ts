import { produccionTributariaHabilitada } from "@opai/integrations";

import type { Contexto } from "../types";
import { cafGuardadoParaEmitir, MENSAJE_FALLO_CAF } from "./caf-guardado";
import { NOMBRE_AMBIENTE_CAF, ambienteCafRequerido } from "./caf-ambiente";
import { emisorTributarioDe, mensajeFaltantesEmisor } from "./emisor-tributario";
import { rangosParaEmitir } from "./folios-previstos";
import { mensajeFaltantesReceptor } from "./receptor-tributario";
import { chequeosCredencialesEmision } from "./ventas-preflight-credenciales";

export type ItemPreflightEmision = {
  codigo: string;
  ok: boolean;
  mensaje: string;
  bloqueante: boolean;
};

type Push = (codigo: string, ok: boolean, mensaje: string, bloqueante: boolean) => void;

/**
 * El CAF del próximo folio, descifrado y leído en sus bytes ISO-8859-1 (CAR-240): íntegro, del RUT emisor y del tipo y
 * folio. Un CAF que no sirve para timbrar se ve aquí, antes de llamar a SimpleAPI, sin mostrar nada del CAF.
 */
async function chequeoCafGuardado(
  ctx: Contexto,
  r: { cafSecretoId: string | null; folioActual: number },
  rutEmisor: string | null,
  tipo: number,
  push: Push,
) {
  if (!rutEmisor) return; // «rut_emisor» ya bloquea
  const caf = r.cafSecretoId
    ? await cafGuardadoParaEmitir(ctx, { cafSecretoId: r.cafSecretoId, rutEmisor, tipoDte: tipo, folio: r.folioActual })
    : ({ ok: false, fallo: "no_encontrado" } as const);
  push(
    "caf_integro",
    caf.ok,
    caf.ok ? "El CAF está íntegro y es del RUT emisor." : MENSAJE_FALLO_CAF[caf.fallo],
    !caf.ok,
  );
}

/** Chequeos previos a emitir un DTE real (SimpleAPI) o simulado. */
export async function itemsPreflightEmision(
  ctx: Contexto,
  input: {
    documentoId?: string | undefined;
    cuentaId?: string | undefined;
    tipoDte?: 33 | 34 | 56 | 61 | undefined;
  },
): Promise<ItemPreflightEmision[]> {
  const items: ItemPreflightEmision[] = [];
  const push: Push = (codigo, ok, mensaje, bloqueante) => {
    items.push({ codigo, ok, mensaje, bloqueante });
  };

  const cfg = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
  const proveedor = cfg?.emisionProveedor ?? "simulado";
  push(
    "conector_emision",
    proveedor !== "simulado",
    proveedor === "simulado"
      ? "La emisión sigue en modo simulado; el owner puede activar SimpleAPI en Configuración DTE."
      : `Conector de emisión: ${proveedor}.`,
    proveedor === "simulado",
  );

  if (cfg?.ambiente === "produccion" && !produccionTributariaHabilitada()) {
    push(
      "ambiente_acotado",
      true,
      "La empresa quedó en «producción», pero la producción del SII solo está disponible en app.opai.cl: aquí se usa certificación.",
      false,
    );
  }

  await chequeosCredencialesEmision(ctx, proveedor, cfg, push);

  // Sin ACTECO (u otro dato del emisor) el DTE no cumple el XSD del SII (CAR-240); bloquea solo con el real.
  const faltaEmisor = mensajeFaltantesEmisor(await emisorTributarioDe(ctx));
  push("emisor_tributario", !faltaEmisor, faltaEmisor ?? "Datos tributarios del emisor completos.", proveedor !== "simulado" && Boolean(faltaEmisor));

  let tipo = input.tipoDte ?? 33;
  if (input.documentoId) {
    const doc = await ctx.db.documentoEmitido.findFirst({
      where: { id: input.documentoId },
      select: { tipoDte: true },
    });
    if (doc) tipo = doc.tipoDte as 33 | 34 | 56 | 61;
  }

  // Misma regla que la emisión (CAR-240): CAF activos, vigentes, con folios y del ambiente requerido.
  const rangos = await ctx.db.dteFolio.findMany({
    where: { tipoDte: tipo, activo: true },
    orderBy: [{ folioDesde: "asc" }, { id: "asc" }],
  });
  let rango: (typeof rangos)[number] | null = null;
  try {
    const r = rangosParaEmitir(rangos, cfg, new Date().toISOString().slice(0, 10), tipo)[0]!;
    push("caf", true, `Hay folios ${tipo} desde ${r.folioActual} (CAF ${r.folioDesde}–${r.folioHasta}).`, false);
    const nombre = NOMBRE_AMBIENTE_CAF[ambienteCafRequerido(cfg)];
    push("caf_ambiente", true, `El CAF es del ambiente de emisión (${nombre}).`, false);
    rango = r;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "No hay folios disponibles; cargue un CAF.";
    const deAmbiente = msg.startsWith("No hay un CAF activo de");
    push(deAmbiente ? "caf_ambiente" : "caf", false, msg, true);
  }
  // Fuera del try: una caída al descifrar (KEK, base) no se disfraza de «no hay folios».
  if (rango && proveedor !== "simulado") await chequeoCafGuardado(ctx, rango, cfg?.rutEmisor ?? null, tipo, push);

  const cuentaId =
    input.cuentaId
    ?? (input.documentoId
      ? (await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoId }, select: { cuentaId: true } }))
          ?.cuentaId
      : undefined);
  if (cuentaId) {
    const cuenta = await ctx.db.cuenta.findFirst({
      where: { id: cuentaId },
      select: { rut: true, giro: true, calle: true, comuna: true },
    });
    if (!cuenta?.rut) {
      push("receptor_rut", false, "El cliente no tiene RUT; no se puede emitir.", true);
    } else {
      push("receptor_rut", true, "El cliente tiene RUT.", false);
      const falta = mensajeFaltantesReceptor(cuenta);
      push(
        "receptor_tributario",
        !falta,
        falta ?? "Datos tributarios del receptor completos.",
        proveedor !== "simulado" && Boolean(falta),
      );
    }
  }

  return items;
}
