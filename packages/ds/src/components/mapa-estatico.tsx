import { MapPin } from "lucide-react";

import { cn } from "../cn";

type Props = {
  /** Sin coordenadas, muestra "Sin ubicación". */
  lat?: number | null;
  lng?: number | null;
  /** Radio de la geocerca en metros (círculo). */
  geocercaM?: number | null;
  /** Imagen del servicio de mapas del núcleo (proxy con caché); sin ella, la retícula del DS. */
  src?: string | null;
  /** Texto de la esquina (comuna o "Geocerca 300 m"). */
  pie?: string;
  className?: string;
};

/** Mapa embebido sin JS: 16:9, borde 1 px, radio 10; marcador y círculo de geocerca. */
export function MapaEstatico({ lat, lng, geocercaM, src, pie, className }: Props) {
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
  return (
    <div
      role="img"
      aria-label={`Ubicación ${lat.toFixed(5)}, ${lng.toFixed(5)}${geocercaM ? `, geocerca de ${geocercaM} m` : ""}`}
      className={cn(base, "bg-fill", !src && "ds-mapa", className)}
    >
      {src ? <img src={src} alt="" className="absolute inset-0 size-full object-cover" /> : null}
      {geocercaM ? (
        <span
          aria-hidden
          className="absolute top-1/2 left-1/2 aspect-square w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-accent bg-accent-muted opacity-90"
        />
      ) : null}
      <MapPin
        aria-hidden
        className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-full text-accent"
      />
      {pie ? (
        <span className="absolute right-2 bottom-1.5 text-[11px] leading-[14px] text-fg-subtle">
          {pie}
        </span>
      ) : null}
    </div>
  );
}
