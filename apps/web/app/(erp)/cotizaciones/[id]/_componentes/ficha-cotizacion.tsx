"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Campo, Estado, Input } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { DatosFicha } from "../page";
import { ResumenCotizacion } from "./resumen-cotizacion";

export function FichaCotizacion({ datos }: { datos: DatosFicha }) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombreNueva, setNombreNueva] = useState("Guardia");
  const d = datos.ficha;
  if (!d) {
    return (
      <Estado state={datos.state} variante="detalle" textos={{ error: { accion: <BotonReintentar /> } }}>
        {null}
      </Estado>
    );
  }
  const editable = datos.gestionar && d.version.editable;
  const c = d.calculo as Parameters<typeof ResumenCotizacion>[0]["calculo"];
  const recargar = () => router.refresh();

  async function agregarLinea(seccionId: string) {
    const r = await ejecutar("cpq.lineas.crear", {
      seccionId,
      tipo: "puesto",
      nombre: nombreNueva.trim() || "Puesto",
    });
    if (r != null) recargar();
  }

  async function quitarLinea(id: string) {
    const r = await ejecutar("cpq.lineas.quitar", { id });
    if (r != null) recargar();
  }

  async function renombrarLinea(id: string, nombre: string) {
    const r = await ejecutar("cpq.lineas.actualizar", { id, nombre: nombre.trim() });
    if (r != null) recargar();
  }

  const resumen = <ResumenCotizacion version={d.version} calculo={c} />;

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
          {error ? <p className="t-caption text-danger">{error}</p> : null}
          <div className="lg:hidden">{resumen}</div>
          {d.secciones.map((s) => (
            <details key={s.id} className="rounded-lg border border-border bg-surface p-3" open>
              <summary className="t-label cursor-pointer">{s.nombre}</summary>
              {editable ? (
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <Campo etiqueta="Nueva línea" htmlFor={`linea-${s.id}`}>
                    <Input
                      id={`linea-${s.id}`}
                      value={nombreNueva}
                      onChange={(e) => setNombreNueva(e.target.value)}
                      className="max-w-xs"
                    />
                  </Campo>
                  <Button type="button" disabled={pendiente} onClick={() => agregarLinea(s.id)}>
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
