"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Campo, Estado, Input } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { DatosFicha } from "../page";
import { AccionesCotizacion } from "./acciones-cotizacion";
import { LineaCotizacion } from "./linea-cotizacion";
import { ResumenCotizacion } from "./resumen-cotizacion";
import { PropuestaTecnicaFicha } from "./propuesta-tecnica-ficha";

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
  const aprobarEnvios = datos.aprobarEnvios;
  const editable = datos.gestionar && d.version.editable;
  const c = d.calculo as Parameters<typeof ResumenCotizacion>[0]["calculo"];
  const meta = d.meta as Parameters<typeof ResumenCotizacion>[0]["meta"];
  const recargar = () => router.refresh();
  const propsMeta = meta !== undefined ? { meta } : {};

  const resumen = <ResumenCotizacion version={d.version} calculo={c} {...propsMeta} />;

  return (
    <Estado state={datos.state} variante="detalle" textos={{ error: { accion: <BotonReintentar /> } }}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <header className="space-y-2">
            <h1 className="t-h2">
              {d.cotizacion.codigo} · {d.cotizacion.titulo}
            </h1>
            <p className="t-body-sm text-fg-muted">
              {d.negocioTitulo ?? "Negocio"} ·{" "}
              <LinkNext href={`/negocios/${d.cotizacion.negocioId}`} className="text-accent">
                Abrir negocio
              </LinkNext>
            </p>
            <AccionesCotizacion
              cotizacionId={d.cotizacion.id}
              version={d.version}
              calculo={c}
              {...propsMeta}
              gestionar={datos.gestionar}
              aprobar={datos.aprobar}
              onHecho={recargar}
            />
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
                  <Button
                    type="button"
                    disabled={pendiente}
                    onClick={() =>
                      void ejecutar("cpq.lineas.crear", {
                        seccionId: s.id,
                        tipo: "puesto",
                        nombre: nombreNueva.trim() || "Puesto",
                      }).then((r) => r != null && recargar())
                    }
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
                    <LineaCotizacion
                      key={l.id}
                      linea={l}
                      editable={Boolean(editable)}
                      pendiente={pendiente}
                      onRenombrar={(id, nombre) =>
                        void ejecutar("cpq.lineas.actualizar", { id, nombre }).then((r) => r != null && recargar())
                      }
                      onQuitar={(id) => void ejecutar("cpq.lineas.quitar", { id }).then((r) => r != null && recargar())}
                      onTraza={(lineaId) =>
                        void ejecutar("cpq.cotizaciones.explicar", { id: d.cotizacion.id, lineaId }).then((r) => {
                          if (r && typeof r === "object" && "traza" in r) {
                            window.alert(JSON.stringify((r as { traza: unknown[] }).traza.slice(0, 8), null, 2));
                          }
                        })
                      }
                    />
                  ))
                )}
              </ul>
            </details>
          ))}
        </div>
        <aside className="hidden lg:block space-y-4">
          {resumen}
          <PropuestaTecnicaFicha
            cotizacionId={d.cotizacion.id}
            cuentaId={(d as { cuentaId?: string | null }).cuentaId ?? null}
            gestionar={datos.gestionar}
            aprobarEnvios={datos.aprobarEnvios}
            puedeEnviar={Boolean(
              (meta as { puedeEnviar?: boolean } | undefined)?.puedeEnviar ?? d.version.estado === "lista",
            )}
          />
        </aside>
      </div>
    </Estado>
  );
}
