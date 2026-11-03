import { notFound } from "next/navigation";

import { Badge, Card, type EstadoPantalla } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { fecha, pesos, rut } from "@/lib/fechas";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { estadoCesionVenta, estadoCobroVenta, estadoDteVenta, tituloVenta } from "../_componentes/etiquetas-venta";
import type { Venta } from "../_componentes/tipos";

type Detalle = Venta & {
  montoNeto: number;
  montoExento: number;
  montoIva: number;
  montoCobrado: number;
  cesionProveedor: string | null;
  glosa: string | null;
  lineas: { glosa: string; monto: number }[];
  trackIdSii: string | null;
};

async function cargar(id: string) {
  await requerirIdentidad(`/finanzas/ventas/${id}`);
  const r = await ejecutarComoUsuario<Detalle>("erp", "finanzas.ventas.obtener", { documentoId: id });
  return { state: estadoPantalla(r), venta: r.ok ? r.data : null };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const d = await cargar(id);
    return { title: d.venta ? tituloVenta(d.venta) : "Venta" };
  } catch {
    return { title: "Venta" };
  }
}

/** Ficha de un documento emitido. */
export default async function VentaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PaginaPortal
      portal="erp"
      titulo="Venta"
      ruta="/finanzas/ventas"
      volver={{ href: "/finanzas/ventas", etiqueta: "Ventas" }}
      cargar={() => cargar(id)}
      opciones={(d) => ({ titulo: d.venta ? tituloVenta(d.venta) : "Venta" })}
    >
      {(d) => {
        if (d.state === "ready" && !d.venta) notFound();
        return <Ficha state={d.state} venta={d.venta} />;
      }}
    </PaginaPortal>
  );
}

function Ficha({ state, venta }: { state: EstadoPantalla; venta: Detalle | null }) {
  if (state !== "ready" || !venta) return null;
  const dte = estadoDteVenta(venta.estadoDte);
  const cobro = estadoCobroVenta(venta.estadoCobro);
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="t-subheading text-fg">{venta.cuentaNombre}</p>
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
            <dd>{cobro.etiqueta}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Cesión</dt>
            <dd>
              {venta.cesionEstado ? estadoCesionVenta(venta.cesionEstado).etiqueta : "—"}
              {venta.cesionProveedor ? ` · ${venta.cesionProveedor}` : ""}
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
    </div>
  );
}
