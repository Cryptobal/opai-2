import { notFound } from "next/navigation";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { LinkNext } from "@/app/_components/link-next";
import { Badge, Card, type EstadoPantalla } from "@opai/ds";

import { pesos } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

type Detalle = {
  id: string;
  nombre: string;
  activa: boolean;
  cuentaNombre: string;
  instalacionNombre: string | null;
  tipoDte: 33 | 34;
  diaGeneracion: number;
  moneda: string;
  montoTotal: number;
  plazoPagoDias: number;
  proximaEjecucionEn: string | null;
  lineas: { glosa: string; monto: number }[];
  destinatarios: { nombres: string; apellidos: string; email: string | null }[];
};

async function cargar(id: string) {
  await requerirIdentidad(`/finanzas/ventas/programacion/${id}`);
  const r = await ejecutarComoUsuario<Detalle>("erp", "finanzas.ventas_programacion.obtener", {
    programacionId: id,
  });
  return { state: estadoPantalla(r), item: r.ok ? r.data : null };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Programación ${id.slice(0, 8)}…` };
}

export default async function ProgramacionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PaginaPortal
      portal="erp"
      titulo="Ventas (DTE)"
      ruta="/finanzas/ventas/programacion"
      cargar={() => cargar(id)}
    >
      {(d) => {
        if (d.state === "ready" && !d.item) notFound();
        return <Ficha state={d.state} item={d.item} />;
      }}
    </PaginaPortal>
  );
}

function Ficha({ state, item }: { state: EstadoPantalla; item: Detalle | null }) {
  if (state !== "ready" || !item) return null;
  return (
    <div className="flex flex-col gap-4">
      <LinkNext href="/finanzas/ventas/programacion" className="text-sm text-fg-muted">
        ← Programación recurrente
      </LinkNext>
      <Card className="p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">{item.nombre}</h1>
          <Badge tono={item.activa ? "success" : "neutro"}>{item.activa ? "Activa" : "Pausada"}</Badge>
        </div>
        <p className="text-sm text-fg-muted">
          {item.cuentaNombre}
          {item.instalacionNombre ? ` · ${item.instalacionNombre}` : ""} · DTE {item.tipoDte} · día{" "}
          {item.diaGeneracion} · cobro a {item.plazoPagoDias} días
        </p>
        <p className="text-sm">
          Total referencia:{" "}
          {item.moneda === "CLP" ? pesos(item.montoTotal) : `${item.montoTotal} ${item.moneda}`}
        </p>
        {item.proximaEjecucionEn ? (
          <p className="text-sm text-fg-muted">Próximo borrador: {item.proximaEjecucionEn}</p>
        ) : null}
      </Card>
      <Card className="p-4 flex flex-col gap-2">
        <h2 className="font-medium">Líneas</h2>
        <ul className="text-sm divide-y divide-border">
          {item.lineas.map((l, i) => (
            <li key={i} className="flex justify-between py-2">
              <span>{l.glosa}</span>
              <span>{pesos(l.monto)}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-4 flex flex-col gap-2">
        <h2 className="font-medium">Destinatarios (proforma / estado de pago)</h2>
        {item.destinatarios.length === 0 ? (
          <p className="text-sm text-fg-muted">Sin destinatarios en la plantilla.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {item.destinatarios.map((d, i) => (
              <li key={i}>
                {d.nombres} {d.apellidos}
                {d.email ? ` · ${d.email}` : ""}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
