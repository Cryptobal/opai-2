import { notFound } from "next/navigation";

import { Card } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { pesos, rut } from "@/lib/fechas";

import { type Centro, diaCL, NOMBRE_DTE } from "../../_componentes/tipos";
import { CentroCelda, EstadoPago, Plazo } from "./celdas-compras";
import type { cargarFichaCompra } from "./ficha-datos";
import { montoCompra } from "./lista-compras-maestro";

const RECEPCION = { pendiente_revision: "Pendiente de revisión", aceptado: "Aceptado", reclamado: "Reclamado" } as const;

/** Panel derecho del libro de compras (CAR-256): espera su documento dentro de su propio Suspense. */
export async function DetalleCompra({ datos, centros, gestiona }: { datos: ReturnType<typeof cargarFichaCompra>; centros: Centro[]; gestiona: boolean }) {
  const { state, compra: c } = await datos;
  if (state === "ready" && !c) notFound();
  if (state !== "ready" || !c) return null;
  const dato = (etiqueta: string, valor: React.ReactNode) => (
    <div>
      <dt className="text-fg-muted">{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="t-subheading text-fg">{`${NOMBRE_DTE[c.tipoDte] ?? c.tipoDte} ${c.folio}`}</h2>
          <p className="text-sm text-fg-muted">{c.proveedorNombre}</p>
        </div>
        <EstadoPago c={c} />
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {dato("RUT proveedor", <span className="t-mono">{rut(c.proveedorRut)}</span>)}
        {dato("Total", <span className="t-numeric font-medium">{montoCompra(c)}</span>)}
        {dato("Emisión", diaCL(c.fechaEmision))}
        {dato("Recepción", diaCL(c.fechaRecepcion))}
        {dato("Neto", <span className="t-numeric">{montoCompra({ ...c, montoTotal: c.montoNeto })}</span>)}
        {dato("IVA", <span className="t-numeric">{montoCompra({ ...c, montoTotal: c.montoIva })}</span>)}
        {dato("Vencimiento de pago", diaCL(c.vencimientoPago))}
        {c.tipoDte === 61 ? null : dato("Pagado (conciliado con el banco)", <span className="t-numeric">{pesos(c.montoPagado)}</span>)}
        {c.tipoDte === 61 ? null : dato("Saldo por pagar", <span className="t-numeric font-medium">{pesos(c.saldoPorPagar)}</span>)}
        {dato("Recepción ante el SII", RECEPCION[c.estadoRecepcion])}
        {dato("Plazo para aceptar o reclamar", <Plazo c={c} />)}
        {dato("Centro de costo", <CentroCelda c={c} centros={centros} />)}
        {c.glosa ? dato("Glosa", c.glosa) : null}
      </dl>
      {gestiona && !c.centroCostoId ? (
        <div className="flex justify-end">
          <EnlaceBotonHoja href="?lote=1" variante="secondary">Asignar centro de costo</EnlaceBotonHoja>
        </div>
      ) : null}
    </Card>
  );
}
