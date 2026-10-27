"use client";

import { Pencil } from "lucide-react";
import { type ComponentProps, useId, useRef, useState } from "react";

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
  /** URL de la imagen del mapa (el proxy del núcleo); sin ella, la retícula del DS. */
  fuenteMapa?: ComponentProps<typeof MapaEstatico>["fuente"];
  sinMapa?: boolean;
  /** Falla del servicio de mapas (o de la búsqueda): se muestra en el campo, nunca se oculta. */
  error?: string | null;
  /** Solo lectura: el control no se puede editar (sin autocompletar ni escritura a mano). */
  disabled?: boolean;
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
  fuenteMapa,
  sinMapa,
  error,
  disabled = false,
}: Props) {
  const [manual, setManual] = useState(false);
  // Elegida la sugerencia y hasta que llega su detalle (2–4 s), el campo conserva su texto y el
  // mapa muestra un esqueleto, en vez de volver a «Busca la dirección» / «Sin ubicación».
  const [pendiente, setPendiente] = useState<{ placeId: string; texto: string } | null>(null);
  const textos = useRef(new Map<string, string>());
  const ultima = useRef(0);
  const buscarConTextos = async (q: string) => {
    const r = await buscar(q);
    for (const o of r) textos.current.set(o.valor, o.etiqueta);
    return r;
  };
  const auto = useId();
  const base = id ?? auto;
  const idError = `${base}-error`;
  if (manual) {
    const cambiar = (k: keyof Direccion, v: string) =>
      onCambiar({ ...(valor ?? { calle: "" }), [k]: v, placeId: null, lat: null, lng: null });
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <Input
          id={base}
          value={valor?.calle ?? ""}
          onChange={(e) => cambiar("calle", e.target.value)}
          placeholder="Calle y número"
          aria-label="Calle y número"
          disabled={disabled}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            id={`${base}-comuna`}
            value={valor?.comuna ?? ""}
            onChange={(e) => cambiar("comuna", e.target.value)}
            placeholder="Comuna"
            aria-label="Comuna"
            disabled={disabled}
          />
          <Input
            id={`${base}-region`}
            value={valor?.region ?? ""}
            onChange={(e) => cambiar("region", e.target.value)}
            placeholder="Región"
            aria-label="Región"
            disabled={disabled}
          />
        </div>
        {disabled ? null : (
          <Button variant="ghost" className="self-start" onClick={() => setManual(false)}>
            Buscar la dirección
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Combobox
        {...(id ? { id } : {})}
        opciones={
          pendiente
            ? [{ valor: pendiente.placeId, etiqueta: pendiente.texto }]
            : valor?.placeId
              ? [{ valor: valor.placeId, etiqueta: valor.direccionFormateada ?? valor.calle }]
              : []
        }
        valor={pendiente?.placeId ?? valor?.placeId ?? null}
        disabled={disabled}
        placeholder={valor?.calle || "Busca la dirección"}
        buscarPlaceholder="Calle y número"
        textoInicial="Escribe calle y número"
        aria-label="Dirección"
        invalido={Boolean(error)}
        aria-describedby={error ? idError : undefined}
        onBuscar={buscarConTextos}
        onCambiar={async ([placeId]) => {
          if (!placeId) return;
          const n = ++ultima.current; // solo la última elección aplica su detalle
          setPendiente({ placeId, texto: textos.current.get(placeId) ?? placeId });
          const d = await resolver(placeId).catch(() => null);
          if (n !== ultima.current) return;
          setPendiente(null);
          onCambiar(d);
        }}
      />
      {error ? (
        <p id={idError} role="alert" className="t-caption text-danger-fg">
          {error}
        </p>
      ) : null}
      {valor && !pendiente ? (
        <p className="t-caption min-w-0 break-words">
          {[valor.comuna, valor.region].filter(Boolean).join(", ") || "Sin comuna"}
        </p>
      ) : null}
      {sinMapa ? null : (
        <MapaEstatico
          lat={valor?.lat ?? null}
          lng={valor?.lng ?? null}
          geocercaM={geocercaM ?? null}
          cargando={pendiente !== null}
          {...(fuenteMapa ? { fuente: fuenteMapa } : {})}
          {...(valor?.comuna ? { pie: valor.comuna } : {})}
        />
      )}
      {disabled ? null : (
        <Button variant="ghost" className="self-start" onClick={() => setManual(true)}>
          <Pencil className="size-4" aria-hidden /> Escribir a mano
        </Button>
      )}
    </div>
  );
}
