"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { cn } from "../cn";
import { Skeleton } from "./skeleton";

type Props = {
  src: string;
  /** Marco del mapa (tamaño, borde, radio). */
  marco: string;
  etiqueta: string;
  /** Marcador, geocerca y pie: aparecen cuando la imagen terminó de cargar (o falló). */
  children: ReactNode;
};

/**
 * Imagen real del mapa con esqueleto mientras carga: sin él se vería la retícula con el marcador
 * unos segundos antes de las calles. Si la imagen falla, queda la retícula del DS con el marcador.
 * Se monta con `key={src}` para que un punto nuevo vuelva a empezar en «cargando».
 */
export function MapaImagen({ src, marco, etiqueta, children }: Props) {
  const [estado, setEstado] = useState<"cargando" | "lista" | "error">("cargando");
  const imagen = useRef<HTMLImageElement>(null);
  // La imagen pudo terminar antes de hidratar: no habría `onLoad` que avise.
  useEffect(() => {
    const i = imagen.current;
    if (i?.complete) setEstado(i.naturalWidth > 0 ? "lista" : "error");
  }, []);
  const cargando = estado === "cargando";
  return (
    <div
      role="img"
      aria-label={etiqueta}
      aria-busy={cargando}
      className={cn(marco, "bg-fill", estado === "error" && "ds-mapa")}
    >
      {estado === "error" ? null : (
        <img
          ref={imagen}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setEstado("lista")}
          onError={() => setEstado("error")}
          className={cn("absolute inset-0 size-full object-cover", cargando && "opacity-0")}
        />
      )}
      {cargando ? <Skeleton className="absolute inset-0 rounded-none" /> : children}
    </div>
  );
}
