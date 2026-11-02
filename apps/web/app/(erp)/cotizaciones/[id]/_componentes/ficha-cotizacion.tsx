"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Estado, Input, Label } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { pesos } from "@/lib/fechas";

import type { DatosFicha } from "../page";

const ESTADOS: Record<string, string> = { borrador: "Borrador", enviada: "Enviada", lista: "Lista" };

export function FichaCotizacion({ datos }: { datos: DatosFicha }) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombreNueva, setNombreNueva] = useState("Guardia");
  const [seccionActiva, setSeccionActiva] = useState<string | null>(null);
  const d = datos.ficha;
  if (!d) {
    return (
      <Estado state={datos.state} variante="detalle" textos={{ error: { accion: <BotonReintentar /> } }}>
        {null}
      </Estado>
    );
  }
  const editable = datos.gestionar && d.version.editable;
  const c = d.calculo as {
    ventaMensual?: number | null;
    categorias?: { id: string; costoMensual: number }[];
    semaforo?: string;
    margenEfectivoPct?: number;
    noEnviable?: boolean;
    advertencias?: string[];
    uf?: { valorClpEscalado: number; fecha: string } | null;
  };
  const venta =
    c.ventaMensual == null ? "Costo pendiente" : pesos(c.ventaMensual);
  const recargar = () => router.refresh();

  async function agregarLinea(seccionId: string) {
    const r = await ejecutar("cpq.lineas.crear", {
      seccionId,
      tipo: "puesto",
      nombre: nombreNueva.trim() || "Puesto",
    });
    if (r.ok) recargar();
  }

  async function quitarLinea(id: string) {
    const r = await ejecutar("cpq.lineas.quitar", { id });
    if (r.ok) recargar();
  }

  async function renombrarLinea(id: string, nombre: string) {
    const r = await ejecutar("cpq.lineas.actualizar", { id, nombre: nombre.trim() });
    if (r.ok) recargar();
  }

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
      {c.advertencias?.map((a) => (
        <p key={a} className="t-caption text-fg-muted">
          {a}
        </p>
      ))}
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
        {error ? (
          <p className="t-caption text-danger">{error.message}</p>
        ) : null}
        <div className="lg:hidden">{resumen}</div>
        {d.secciones.map((s) => (
          <details key={s.id} className="rounded-lg border border-border bg-surface p-3" open>
            <summary className="t-label cursor-pointer">{s.nombre}</summary>
            {editable ? (
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`linea-${s.id}`}>Nueva línea</Label>
                  <Input
                    id={`linea-${s.id}`}
                    value={seccionActiva === s.id ? nombreNueva : nombreNueva}
                    onChange={(e) => {
                      setSeccionActiva(s.id);
                      setNombreNueva(e.target.value);
                    }}
                    className="max-w-xs"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={pendiente}
                  onClick={() => agregarLinea(s.id)}
                >
                  Agregar puesto
                </Button>
              </div>
            ) : null}
            <ul className="mt-2 space-y-2">
              {s.lineas.length === 0 ? (
                <li className="t-caption text-fg-muted">Sin líneas</li>
              ) : (
                s.lineas.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-2 t-body-sm">
                    <span>
                      {l.nombre} · {l.tipo}
                    </span>
                    {editable ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pendiente}
                          onClick={() => {
                            const n = window.prompt("Nombre de la línea", l.nombre);
                            if (n) void renombrarLinea(l.id, n);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pendiente}
                          onClick={() => quitarLinea(l.id)}
                        >
                          Quitar
                        </Button>
                      </>
                    ) : null}
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
