"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "./button";
import { Combobox } from "./combobox";
import type { OpcionCombobox } from "./resaltado";
import { Input } from "./input";
import { MapaEstatico } from "./mapa-estatico";

export type Direccion = {
  calle: string;
  comuna?: string | null;
  region?: string | null;
  direccionFormateada?: string | null;
  placeId?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type Props = {
  id?: string;
  valor: Direccion | null;
  onCambiar: (d: Direccion | null) => void;
  /** Sugerencias del servicio de geolocalización del núcleo (`core.geo.autocompletar`). */
  buscar: (q: string) => Promise<readonly OpcionCombobox[]>;
  /** Detalle de la sugerencia elegida (`core.geo.detalle`). */
  resolver: (placeId: string) => Promise<Direccion | null>;
  /** Geocerca a dibujar en el mapa. */
  geocercaM?: number | null;
  sinMapa?: boolean;
  /** Falla del servicio de mapas (o de la búsqueda): se muestra en el campo, nunca se oculta. */
  error?: string | null;
};

/**
 * Dirección con autocompletado: sugiere direcciones; al elegir muestra comuna, región y el mapa.
 * Siempre se puede escribir a mano (sin servicio de mapas o si la sugerencia no es exacta).
 */
export function CampoDireccion({
  id,
  valor,
  onCambiar,
  buscar,
  resolver,
  geocercaM,
  sinMapa,
  error,
}: Props) {
  const [manual, setManual] = useState(false);
  if (manual) {
    const cambiar = (k: keyof Direccion, v: string) =>
      onCambiar({ ...(valor ?? { calle: "" }), [k]: v, placeId: null, lat: null, lng: null });
    return (
      <div className="flex flex-col gap-2">
        <Input
          id={id}
          value={valor?.calle ?? ""}
          onChange={(e) => cambiar("calle", e.target.value)}
          placeholder="Calle y número"
          aria-label="Calle y número"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={valor?.comuna ?? ""}
            onChange={(e) => cambiar("comuna", e.target.value)}
            placeholder="Comuna"
            aria-label="Comuna"
          />
          <Input
            value={valor?.region ?? ""}
            onChange={(e) => cambiar("region", e.target.value)}
            placeholder="Región"
            aria-label="Región"
          />
        </div>
        <Button variant="ghost" className="self-start" onClick={() => setManual(false)}>
          Buscar la dirección
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Combobox
        {...(id ? { id } : {})}
        opciones={
          valor?.placeId
            ? [{ valor: valor.placeId, etiqueta: valor.direccionFormateada ?? valor.calle }]
            : []
        }
        valor={valor?.placeId ?? null}
        placeholder={valor?.calle || "Busca la dirección"}
        buscarPlaceholder="Calle y número"
        aria-label="Dirección"
        invalido={Boolean(error)}
        onBuscar={buscar}
        onCambiar={async ([placeId]) => {
          if (!placeId) return;
          onCambiar(await resolver(placeId));
        }}
      />
      {error ? (
        <p role="alert" className="text-xs font-medium text-danger-fg">
          {error}
        </p>
      ) : null}
      {valor ? (
        <p className="t-caption">
          {[valor.comuna, valor.region].filter(Boolean).join(", ") || "Sin comuna"}
        </p>
      ) : null}
      {sinMapa ? null : (
        <MapaEstatico
          lat={valor?.lat ?? null}
          lng={valor?.lng ?? null}
          geocercaM={geocercaM ?? null}
          {...(valor?.comuna ? { pie: valor.comuna } : {})}
        />
      )}
      <Button variant="ghost" className="self-start" onClick={() => setManual(true)}>
        <Pencil className="size-4" aria-hidden /> Escribir a mano
      </Button>
    </div>
  );
}
