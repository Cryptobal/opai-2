"use client";

import type { Dispatch, SetStateAction } from "react";

import { Campo, type Direccion, Input, InputFechaRango, Textarea } from "@opai/ds";

import { DireccionOpai } from "@/app/_components/maestros/direccion";
import type { Instalacion } from "@/lib/tipos-maestros";

export type DatosInstalacion = {
  nombre: string;
  direccion: Direccion | null;
  geocercaM: string;
  vigencia: { desde: string; hasta: string };
  notas: string;
};

export const inicialInstalacion = (i?: Instalacion | null): DatosInstalacion => ({
  nombre: i?.nombre ?? "",
  direccion: i?.calle
    ? {
        calle: i.calle,
        comuna: i.comuna,
        region: i.region,
        direccionFormateada: i.direccionFormateada,
        lat: i.lat,
        lng: i.lng,
      }
    : null,
  geocercaM: String(i?.geocercaM ?? 300),
  vigencia: { desde: i?.vigenteDesde ?? "", hasta: i?.vigenteHasta ?? "" },
  notas: i?.notas ?? "",
});

/** Input de las capacidades de instalación a partir del formulario. */
export const camposAInput = (d: DatosInstalacion) => ({
  nombre: d.nombre.trim(),
  calle: d.direccion?.calle ?? null,
  comuna: d.direccion?.comuna ?? null,
  region: d.direccion?.region ?? null,
  placeId: d.direccion?.placeId ?? null,
  lat: d.direccion?.lat ?? null,
  lng: d.direccion?.lng ?? null,
  geocercaM: Math.max(50, Number(d.geocercaM) || 300),
  vigenteDesde: d.vigencia.desde || null,
  vigenteHasta: d.vigencia.hasta || null,
  notas: d.notas.trim() || null,
});

export const invalidaInstalacion = (d: DatosInstalacion) =>
  d.nombre.trim().length < 2 ||
  Boolean(d.vigencia.desde && d.vigencia.hasta && d.vigencia.hasta < d.vigencia.desde);

/** Nombre, dirección con mapa y geocerca, vigencia y notas. */
export function CamposInstalacion({
  d,
  setD,
}: {
  d: DatosInstalacion;
  setD: Dispatch<SetStateAction<DatosInstalacion>>;
}) {
  const set = <K extends keyof DatosInstalacion>(k: K, v: DatosInstalacion[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Nombre" htmlFor="i-nombre">
        <Input
          id="i-nombre"
          value={d.nombre}
          placeholder="Planta Quilicura"
          onChange={(e) => set("nombre", e.target.value)}
        />
      </Campo>
      <Campo
        etiqueta="Dirección"
        htmlFor="i-dir"
        ayuda="Si la dirección no se ubica, se guarda sin coordenadas y puedes reintentar después."
      >
        <DireccionOpai
          id="i-dir"
          valor={d.direccion}
          onCambiar={(v) => set("direccion", v)}
          geocercaM={Number(d.geocercaM) || null}
        />
      </Campo>
      <Campo
        etiqueta="Geocerca (metros)"
        htmlFor="i-geo"
        ayuda="Tolerancia de ubicación para marcas y rondas. Es evidencia, no bloquea."
      >
        <Input
          id="i-geo"
          type="number"
          inputMode="numeric"
          min={50}
          value={d.geocercaM}
          onChange={(e) => set("geocercaM", e.target.value)}
          className="md:w-40"
        />
      </Campo>
      <div className="flex flex-col gap-1.5">
        <span className="t-label text-fg">Vigencia</span>
        <InputFechaRango
          desde={d.vigencia.desde}
          hasta={d.vigencia.hasta}
          onCambiar={(v) => set("vigencia", v)}
        />
      </div>
      <Campo etiqueta="Notas" htmlFor="i-notas">
        <Textarea id="i-notas" value={d.notas} onChange={(e) => set("notas", e.target.value)} />
      </Campo>
    </div>
  );
}
