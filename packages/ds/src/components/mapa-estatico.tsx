import { MapPin } from "lucide-react";

import { cn } from "../cn";
import { diametroGeocercaPct, zoomParaGeocerca } from "../lib/mapa";
import { Empty } from "../states";
import { MapaImagen } from "./mapa-imagen";
import { Skeleton } from "./skeleton";

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
  /** Se está resolviendo la ubicación (p. ej. el detalle de la dirección elegida): esqueleto. */
  cargando?: boolean;
  className?: string;
};

/**
 * Mapa embebido: 16:9, borde 1 px, radio 10; imagen real (con esqueleto mientras carga), marcador
 * y círculo de geocerca. Sin `fuente` es la retícula del DS y no lleva JS.
 */
export function MapaEstatico({ lat, lng, geocercaM, fuente, pie, cargando, className }: Props) {
  const base = "relative aspect-video overflow-hidden rounded-md border border-border";
  if (cargando) {
    return (
      <div role="img" aria-label="Cargando ubicación" aria-busy className={cn(base, className)}>
        <Skeleton className="absolute inset-0 rounded-none" />
      </div>
    );
  }
  // Sin coordenadas: el estado vacío del DS (no una caja gris que parezca un mapa sin cargar), con el
  // mismo 16:9 para que la tarjeta no salte cuando llega la ubicación.
  if (lat == null || lng == null) {
    return (
      <Empty
        icono={<MapPin className="size-6" aria-hidden />}
        titulo="Sin ubicación"
        className={cn("aspect-video gap-2 rounded-md px-4 py-4", className)}
      />
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
