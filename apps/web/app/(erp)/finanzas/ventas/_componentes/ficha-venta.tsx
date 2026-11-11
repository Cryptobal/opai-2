import { Badge, Card, type EstadoPantalla } from "@opai/ds";

import { fecha, pesos, rut } from "@/lib/fechas";

import { AccionesVenta } from "./acciones-venta";
import { estadoCesionVenta, estadoCobroVenta, estadoDteVenta, seCobra, tituloVenta } from "./etiquetas-venta";
import type { DetalleVenta } from "./ficha-datos";
import { HistorialEnvios, type EnvioCliente } from "./historial-envios";

/** Contenido de la ficha: datos, acciones (editar, descartar, emitir, enviar…) e historial de envíos. */
export function FichaVenta({ state, venta, envios, editar }: { state: EstadoPantalla; venta: DetalleVenta | null; envios: EnvioCliente[]; editar: boolean }) {
  if (state !== "ready" || !venta) return null;
  const dte = estadoDteVenta(venta.estadoDte, venta.trackIdSii);
  const cobro = estadoCobroVenta(venta.estadoCobro);
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="t-subheading text-fg">{tituloVenta(venta)}</h2>
            <p className="text-sm text-fg-muted">{venta.cuentaNombre}</p>
          </div>
          <Badge tono={dte.tono}>{dte.etiqueta}</Badge>
        </div>
        <dl className="grid gap-2 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-fg-muted">RUT cliente</dt>
            <dd className="font-mono">{venta.cuentaRut ? rut(venta.cuentaRut) : "—"}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Emisión</dt>
            <dd>{fecha(venta.fechaEmision)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Vencimiento</dt>
            <dd>{fecha(venta.fechaVencimiento)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Total</dt>
            <dd className="tabular-nums font-medium">{pesos(venta.montoTotal)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Estado de cobro</dt>
            <dd>{seCobra(venta) ? cobro.etiqueta : "No se cobra (no es una factura vigente)"}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Cesión</dt>
            <dd>
              {venta.cesionEstado && seCobra(venta) ? estadoCesionVenta(venta.cesionEstado).etiqueta : "—"}
              {venta.cesionFactor && seCobra(venta) ? ` · ${venta.cesionFactor}` : ""}
            </dd>
          </div>
          {venta.trackIdSii ? (
            <div className="sm:col-span-2">
              <dt className="text-fg-muted">Código de seguimiento del SII</dt>
              <dd className="font-mono text-xs">{venta.trackIdSii}</dd>
            </div>
          ) : null}
        </dl>
        {venta.lineas.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium mb-2">Detalle</h3>
            <ul className="divide-y divide-border text-sm">
              {venta.lineas.map((l, i) => (
                <li key={i} className="flex justify-between py-2 gap-4">
                  <span>{l.glosa}</span>
                  <span className="tabular-nums shrink-0">{pesos(l.monto)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {venta.glosa ? <p className="text-sm text-fg-muted">{venta.glosa}</p> : null}
      </Card>
      <AccionesVenta venta={venta} abrirEditar={editar} montoPendiente={venta.montoPendiente} enviosPrevios={envios.filter((x) => x.estado === "enviado").length} />
      <HistorialEnvios envios={envios} />
    </div>
  );
}
