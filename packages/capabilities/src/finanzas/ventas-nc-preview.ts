import { aFecha, hoy } from "../core/maestros/comun";
import type { Contexto } from "../types";
import { consumirFolio } from "./ventas-comun";
import { vistaVenta } from "./vistas-venta";

type CuentaVista = { nombre: string; rut: string | null };

export async function previewNotaCreditoDryRun(
  ctx: Contexto,
  p: {
    ref: {
      id: string;
      cuentaId: string;
      instalacionId: string | null;
      cotizacionId: string | null;
      fechaVencimiento: Date | null;
    };
    montos: { neto: number; exento: number; iva: number; total: number };
    motivo: string;
    monto: number;
    cuenta: CuentaVista;
  },
) {
  const folio = await consumirFolio(ctx, 61, true);
  const emision = hoy();
  return vistaVenta(
    {
      id: "",
      cuentaId: p.ref.cuentaId,
      instalacionId: p.ref.instalacionId,
      cotizacionId: p.ref.cotizacionId,
      tipoDte: 61,
      folio,
      fechaEmision: aFecha(emision),
      fechaVencimiento: p.ref.fechaVencimiento,
      montoNeto: p.montos.neto,
      montoExento: p.montos.exento,
      montoIva: p.montos.iva,
      montoOtros: 0,
      montoTotal: p.montos.total,
      estadoDte: "enviado",
      estadoCobro: "pendiente",
      montoCobrado: 0,
      glosa: p.motivo,
      trackIdSii: null,
      documentoReferenciaId: p.ref.id,
      lineas: [{ id: "dry", orden: 0, glosa: p.motivo, monto: p.monto }],
    },
    p.cuenta,
    [{ id: "dry", orden: 0, glosa: p.motivo, monto: p.monto }],
  );
}
