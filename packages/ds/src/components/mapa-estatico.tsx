import { MapPin } from "lucide-react";

import { cn } from "../cn";
import { diametroGeocercaPct, zoomParaGeocerca } from "../lib/mapa";
import { MapaImagen } from "./mapa-imagen";

type Fuente = (punto: { lat: number; lng: number; zoom: number }) => string;

type Props = {
  /** Sin coordenadas, muestra "Sin ubicación". */
  lat?: number | null;
  lng?: number | null;
  /** Radio de la geocerca en metros (círculo): el zoom se elige para que quepa. */
  geocercaM?: number | null;
  /**
   * URL de la imagen para un punto y zoom (el proxy del servicio de mapas del núcleo, con caché).
   * Sin ella o si la imagen falla, queda la retícula del DS; mientras carga se muestra un esqueleto.
   */
  fuente?: Fuente;
  /** Texto de la esquina (comuna o "Geocerca 300 m"). */
  pie?: string;
  className?: string;
};

/**
 * Mapa embebido: 16:9, borde 1 px, radio 10; imagen real (con esqueleto mientras carga), marcador
 * y círculo de geocerca. Sin `fuente` es la retícula del DS y no lleva JS.
 */
export function MapaEstatico({ lat, lng, geocercaM, fuente, pie, className }: Props) {
  const base = "relative aspect-video overflow-hidden rounded-md border border-border";
  if (lat == null || lng == null) {
    return (
      <div
        role="img"
        aria-label="Sin ubicación"
        className={cn(base, "flex flex-col items-center justify-center gap-1.5 bg-fill", className)}
      >
        <MapPin className="size-5 text-fg-subtle" aria-hidden />
        <span className="text-sm font-medium text-fg-subtle">Sin ubicación</span>
      </div>
    );
  }
  const zoom = zoomParaGeocerca(lat, geocercaM);
  const etiqueta = `Ubicación ${lat.toFixed(5)}, ${lng.toFixed(5)}${geocercaM ? `, geocerca de ${geocercaM} m` : ""}`;
  const marcas = (
    <>
      {geocercaM ? (
        <span
          aria-hidden
          style={{ width: `${diametroGeocercaPct(lat, zoom, geocercaM)}%` }}
          className="absolute top-1/2 left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-accent bg-accent-muted opacity-90"
        />
      ) : null}
      <MapPin
        aria-hidden
        className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-full text-accent"
      />
      {pie ? (
        <span className="absolute right-2 bottom-1.5 rounded-sm bg-surface/80 px-1 text-[11px] leading-[14px] text-fg-muted">
          {pie}
        </span>
      ) : null}
    </>
  );
  // Con imagen real: esqueleto hasta que carga. Sin ella (demo del DS): la retícula.
  if (fuente) {
    const src = fuente({ lat, lng, zoom });
    return (
      <MapaImagen key={src} src={src} marco={cn(base, className)} etiqueta={etiqueta}>
        {marcas}
      </MapaImagen>
    );
  }
  return (
    <div role="img" aria-label={etiqueta} className={cn(base, "ds-mapa bg-fill", className)}>
      {marcas}
    </div>
  );
}
