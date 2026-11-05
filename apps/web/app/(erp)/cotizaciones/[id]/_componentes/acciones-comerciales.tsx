"use client";

import { Archive, ArchiveRestore, Share2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Alerta, avisar, Badge, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { HojaCrearPuestos } from "../../_componentes/hoja-crear-puestos";
import { HojaCompartir } from "./hoja-compartir";

/** Lo que devuelve `cpq.cotizaciones.estado_comercial`. */
export type EstadoComercial = {
  archivada: boolean;
  aceptada: boolean;
  enlacePermitido: boolean;
  enlace: { venceEn: Date | string; vistas: number; ultimaVistaEn: Date | string | null; vencido: boolean } | null;
  puestosPendientes: number;
};

/**
 * Acciones de cierre de la ficha (CPQ v4): Compartir (enlace, WhatsApp, correo; solo empresas sin Portal Cliente con el ajuste encendido), Crear puestos
 * (tras ganar; RRHH confirma) y Archivar o Restaurar. Se alimenta de una sola lectura y se vuelve a
 * leer tras cada cambio. Sin permiso de gestionar, solo se ve el estado.
 */
export function AccionesComerciales(p: {
  cotizacionId: string;
  titulo: string;
  estado: string;
  gestionar: boolean;
  puedeConfirmarPuestos: boolean;
  costos: boolean;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [e, setE] = useState<EstadoComercial | null>(null);
  const [hoja, setHoja] = useState<"compartir" | "puestos" | null>(null);
  const cargar = useCallback(
    () =>
      ejecutar<EstadoComercial>("cpq.cotizaciones.estado_comercial", { id: p.cotizacionId }, false, "ninguna").then(
        (r) => {
          if (r) setE(r);
        },
      ),
    [ejecutar, p.cotizacionId],
  );
  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function archivar(restaurar: boolean) {
    const r = await ejecutar(restaurar ? "cpq.cotizaciones.restaurar" : "cpq.cotizaciones.archivar", {
      id: p.cotizacionId,
    });
    if (r) {
      avisar.exito(restaurar ? "Cotización restaurada" : "Cotización archivada");
      await cargar();
    }
  }
  const compartible = ["enviada", "aceptada"].includes(p.estado);
  if (!e && !error) return null;
  return (
    <section aria-label="Compartir y cierre" className="flex flex-col gap-3 border-t border-border pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="t-label">Compartir y cierre</h3>
        {e?.archivada ? <Badge tono="neutro">Archivada</Badge> : null}
        {e?.enlace && !e.enlace.vencido ? <Badge tono="success" punto>Enlace activo</Badge> : null}
      </div>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {e?.archivada ? (
        <p className="t-caption">No aparece en la lista ni en los reportes de pipeline. Restáurala para volver a trabajarla.</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {p.gestionar && compartible && e?.enlacePermitido && !e.archivada ? (
          <Button variant="secondary" onClick={() => setHoja("compartir")}>
            <Share2 className="size-4" aria-hidden /> Compartir
          </Button>
        ) : null}
        {e?.aceptada && e.puestosPendientes > 0 && p.puedeConfirmarPuestos ? (
          <Button onClick={() => setHoja("puestos")}>
            <Users className="size-4" aria-hidden /> Crear puestos ({e.puestosPendientes})
          </Button>
        ) : null}
        {p.gestionar && e ? (
          <Button variant="ghost" disabled={pendiente} onClick={() => void archivar(e.archivada)}>
            {e.archivada ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
            {e.archivada ? "Restaurar" : "Archivar"}
          </Button>
        ) : null}
      </div>
      {hoja === "compartir" ? (
        <HojaCompartir
          abierta
          onCerrar={() => setHoja(null)}
          cotizacionId={p.cotizacionId}
          titulo={p.titulo}
          enlace={e?.enlace ?? null}
          onCambio={() => void cargar()}
        />
      ) : null}
      {hoja === "puestos" ? (
        <HojaCrearPuestos
          abierta
          onCerrar={() => setHoja(null)}
          cotizacionId={p.cotizacionId}
          costos={p.costos}
          onHecho={() => void cargar()}
        />
      ) : null}
    </section>
  );
}
