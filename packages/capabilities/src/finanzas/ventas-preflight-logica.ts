import { produccionTributariaHabilitada } from "@opai/integrations";

import type { Contexto } from "../types";
import { chequeosCredencialesEmision } from "./ventas-preflight-credenciales";

export type ItemPreflightEmision = {
  codigo: string;
  ok: boolean;
  mensaje: string;
  bloqueante: boolean;
};

type Push = (codigo: string, ok: boolean, mensaje: string, bloqueante: boolean) => void;

/** Chequeos previos a emitir un DTE real (SimpleAPI) o simulado. */
export async function itemsPreflightEmision(
  ctx: Contexto,
  input: {
    documentoId?: string | undefined;
    cuentaId?: string | undefined;
    tipoDte?: 33 | 34 | 61 | undefined;
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

  let tipo = input.tipoDte ?? 33;
  if (input.documentoId) {
    const doc = await ctx.db.documentoEmitido.findFirst({
      where: { id: input.documentoId },
      select: { tipoDte: true },
    });
    if (doc) tipo = doc.tipoDte as 33 | 34 | 61;
  }

  const folioRango = await ctx.db.dteFolio.findFirst({
    where: { tipoDte: tipo, activo: true },
    orderBy: { folioDesde: "asc" },
  });
  if (folioRango && folioRango.folioActual <= folioRango.folioHasta) {
    const vence = folioRango.cafVenceEn?.toISOString().slice(0, 10);
    const hoy = new Date().toISOString().slice(0, 10);
    const cafOk = !vence || vence >= hoy;
    push(
      "caf",
      cafOk,
      cafOk
        ? `Hay folios ${tipo} desde ${folioRango.folioActual} (CAF ${folioRango.folioDesde}–${folioRango.folioHasta}).`
        : `El CAF del tipo ${tipo} está vencido; cargue uno nuevo.`,
      !cafOk,
    );
  } else {
    push("caf", false, `No hay folios disponibles para el DTE ${tipo}; cargue un CAF.`, true);
  }

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
      const tributarioOk = Boolean(cuenta.giro?.trim() && cuenta.calle?.trim() && cuenta.comuna?.trim());
      push(
        "receptor_tributario",
        tributarioOk,
        tributarioOk
          ? "Datos tributarios del receptor completos."
          : "Complete giro, dirección y comuna del cliente antes de emitir al SII.",
        proveedor !== "simulado" && !tributarioOk,
      );
    }
  }

  return items;
}
