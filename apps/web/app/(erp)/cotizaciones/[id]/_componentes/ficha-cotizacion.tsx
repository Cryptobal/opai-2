"use client";

import { Badge, Estado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { pesos } from "@/lib/fechas";

import type { DatosFicha } from "../page";

const ESTADOS: Record<string, string> = { borrador: "Borrador", enviada: "Enviada", lista: "Lista" };

export function FichaCotizacion({ datos }: { datos: DatosFicha }) {
  const d = datos.ficha;
  if (!d) {
    return (
      <Estado state={datos.state} variante="detalle" textos={{ error: { accion: <BotonReintentar /> } }}>
        {null}
      </Estado>
    );
  }
  const c = d.calculo as {
    ventaMensual?: number | null;
    categorias?: { id: string; costoMensual: number }[];
    semaforo?: string;
    margenEfectivoPct?: number;
    noEnviable?: boolean;
  };
  const venta =
    c.ventaMensual == null ? "Pendiente: motor de sueldos" : pesos(c.ventaMensual);
  const resumen = (
    <div className="space-y-2 rounded-lg border border-border bg-surface p-4">
      <p className="t-label">Resumen</p>
      <p className="t-body-sm">Venta mensual: {venta}</p>
      {"margenEfectivoPct" in c ? (
        <p className="t-caption">Margen {((c.margenEfectivoPct ?? 0) / 10_000).toFixed(1)} %</p>
      ) : null}
      {"semaforo" in c ? (
        <Badge tono={c.semaforo === "verde" ? "success" : "warning"}>{c.semaforo}</Badge>
      ) : null}
      {c.noEnviable ? <Badge tono="warning">No enviable</Badge> : null}
      <p className="t-caption">
        v{d.version.numero} · {ESTADOS[d.version.estado] ?? d.version.estado} · Vence{" "}
        {d.version.validaHasta?.split("-").reverse().join("-") ?? "—"}
      </p>
      {c.categorias?.slice(0, 8).map((cat) => (
        <p key={cat.id} className="t-caption">
          {cat.id}: {pesos(cat.costoMensual)}
        </p>
      ))}
    </div>
  );
  return (
    <Estado state={datos.state} variante="detalle" textos={{ error: { accion: <BotonReintentar /> } }}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <header className="space-y-1">
          <h1 className="t-h2">
            {d.cotizacion.codigo} · {d.cotizacion.titulo}
          </h1>
          <p className="t-body-sm text-fg-muted">
            {d.negocioTitulo ?? "Negocio"} ·{" "}
            <LinkNext href={`/negocios/${d.cotizacion.negocioId}`} className="text-accent">
              Abrir negocio
            </LinkNext>
          </p>
        </header>
        <div className="lg:hidden">{resumen}</div>
        {d.secciones.map((s) => (
          <details key={s.id} className="rounded-lg border border-border bg-surface p-3" open>
            <summary className="t-label cursor-pointer">{s.nombre}</summary>
            <ul className="mt-2 space-y-1">
              {s.lineas.length === 0 ? (
                <li className="t-caption text-fg-muted">Sin líneas</li>
              ) : (
                s.lineas.map((l) => (
                  <li key={l.id} className="t-body-sm">
                    {l.nombre} · {l.tipo}
                  </li>
                ))
              )}
            </ul>
          </details>
        ))}
      </div>
      <aside className="hidden lg:block">{resumen}</aside>
      </div>
    </Estado>
  );
}
