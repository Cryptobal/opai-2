import { Alerta, cn, GRILLA_KPI_HILO, KpiTile, SeccionTarjeta } from "@opai/ds";

import { fecha, pesos } from "@/lib/fechas";

import type { BorradorF29 } from "./tipos";

function Fila({ etiqueta, valor, fuerte }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
      <dt className="t-body-sm text-fg-muted">{etiqueta}</dt>
      <dd className={cn("t-numeric text-right text-fg", fuerte && "font-semibold")}>{valor}</dd>
    </div>
  );
}

const tasa = (bps: number) => `${(bps / 100).toLocaleString("es-CL", { maximumFractionDigits: 2 })} %`;
const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);

/** Borrador del F29: totales arriba, libros de ventas y compras abajo, y los avisos que cambian el número. */
export function VistaF29({ f }: { f: BorradorF29 }) {
  const pend = f.compras.pendientesRevision;
  return (
    <div className="flex flex-col gap-4">
      <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", GRILLA_KPI_HILO)}>
        <KpiTile etiqueta="IVA a pagar" valor={pesos(f.ivaAPagar)} />
        <KpiTile etiqueta="PPM" valor={pesos(f.ppm)} />
        <KpiTile etiqueta="Total a pagar" valor={pesos(f.totalAPagar)} />
        <KpiTile etiqueta="Se paga el" valor={fecha(f.fechaPago)} />
      </div>
      {f.remanenteMes > 0 ? (
        <Alerta tono="info" titulo="Este mes queda IVA a favor">
          {`El crédito supera al débito en ${pesos(f.remanenteMes)}. Ese remanente se usa en los meses siguientes; este borrador todavía no lo arrastra.`}
        </Alerta>
      ) : null}
      {f.ivaPostergado ? (
        <Alerta tono="info" titulo="IVA postergado">
          El IVA de este mes está marcado para pagarse en dos meses. El PPM se paga igual el mes siguiente.
        </Alerta>
      ) : null}
      {pend > 0 ? (
        <Alerta tono="warning" titulo="Hay compras sin aceptar">
          {`${pend} ${plural(pend, "documento recibido suma", "documentos recibidos suman")} crédito, pero aún se ${plural(pend, "puede", "pueden")} reclamar. Revísalos en Compras antes de declarar.`}
        </Alerta>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <SeccionTarjeta titulo="Ventas (IVA débito)">
          <dl className="px-4 py-1">
            <Fila etiqueta="Documentos emitidos" valor={String(f.ventas.documentos)} />
            <Fila etiqueta="Neto" valor={pesos(f.ventas.neto)} />
            <Fila etiqueta="Exento" valor={pesos(f.ventas.exento)} />
            <Fila etiqueta="IVA débito" valor={pesos(f.debito)} fuerte />
          </dl>
        </SeccionTarjeta>
        <SeccionTarjeta titulo="Compras (IVA crédito)">
          <dl className="px-4 py-1">
            <Fila etiqueta="Documentos recibidos" valor={String(f.compras.documentos)} />
            <Fila etiqueta="Neto" valor={pesos(f.compras.neto)} />
            <Fila etiqueta="Exento" valor={pesos(f.compras.exento)} />
            <Fila etiqueta="Reclamados (no suman)" valor={String(f.compras.reclamados)} />
            <Fila etiqueta="IVA crédito" valor={pesos(f.credito)} fuerte />
          </dl>
        </SeccionTarjeta>
      </div>
      <p className="t-caption">
        {`Borrador para revisar: no declara nada al SII. PPM al ${tasa(f.tasaPpmBps)} de las ventas netas y exentas (se cambia en Configuración › Finanzas). Las notas de crédito restan.`}
      </p>
    </div>
  );
}
