"use client";

import dynamic from "next/dynamic";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import type { EstadoPantalla } from "@opai/ds";

import type { CentroMapa } from "@/lib/mapa-osm/coords";

import { ListaPuntos } from "../lista-puntos";
import type { DefectosRondas, Punto } from "../tipos";

const MapaPanelPuntos = dynamic(
  () => import("./mapa-panel-puntos").then((m) => m.MapaPanelPuntos),
  { ssr: false, loading: () => <div className="aspect-video animate-pulse rounded-md border border-border bg-fill" /> },
);

type Props = {
  state: EstadoPantalla;
  puntos: readonly Punto[];
  centro: CentroMapa;
  defectos: DefectosRondas;
  accionVacio?: ReactNode;
  cabecera?: ReactNode;
};

/** Pestaña Puntos con mapa y lista enlazados (resalte bidireccional). */
export function VistaPuntos({ state, puntos, centro, defectos, accionVacio, cabecera }: Props) {
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const marcar = useCallback((id: string) => {
    setSeleccionadoId(id);
    listaRef.current?.querySelector(`[data-punto-id="${id}"]`)?.scrollIntoView({ block: "nearest" });
  }, []);
  useEffect(() => {
    if (!seleccionadoId) return;
    const nodo = listaRef.current?.querySelector(`[data-punto-id="${seleccionadoId}"]`);
    nodo?.scrollIntoView({ block: "nearest" });
  }, [seleccionadoId]);
  const vacioGps = !puntos.some((p) => (p.modo === "gps" || p.modo === "qr_gps") && p.latitud != null);
  return (
    <div className="flex flex-col gap-4">
      {cabecera}
      <MapaPanelPuntos
        centro={centro}
        puntos={puntos}
        defectosRadioM={defectos.radioM}
        seleccionadoId={seleccionadoId}
        onSeleccionar={marcar}
        vacio={puntos.length === 0 || vacioGps}
      />
      <div ref={listaRef}>
        <ListaPuntos
          state={state}
          puntos={puntos}
          accionVacio={accionVacio}
          seleccionadoId={seleccionadoId}
          onHover={setSeleccionadoId}
          onFoco={marcar}
        />
      </div>
    </div>
  );
}