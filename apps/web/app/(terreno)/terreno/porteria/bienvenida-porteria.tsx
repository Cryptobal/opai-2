"use client";

import { useState } from "react";

export type Bienvenida = {
  mensaje: string | null;
  fondoId: string | null;
  fondoUrl: string | null;
  logoUrl: string | null;
  color: string | null;
};

/**
 * La URL firmada del fondo cambia en cada recarga de la portería (cada 30 s): se conserva la primera mientras el fondo
 * sea el mismo, para que la imagen no parpadee.
 */
function useFondo(b: Bienvenida | null) {
  const [fondo, setFondo] = useState<{ id: string | null; url: string | null }>({
    id: null,
    url: null,
  });
  const id = b?.fondoId ?? null;
  if (fondo.id !== id) setFondo({ id, url: b?.fondoUrl ?? null });
  return fondo.id === id ? fondo.url : (b?.fondoUrl ?? null);
}

/** Cabecera de la portería (CAR-553): fondo y mensaje de la instalación, o la marca de la empresa si no tiene. */
export function BienvenidaPorteria({ b }: { b: Bienvenida | null }) {
  const url = useFondo(b);
  if (!b || (!b.mensaje && !b.logoUrl && !url)) return null;
  const oscuro = Boolean(url || b.color);
  return (
    <section
      aria-label="Bienvenida"
      className={`relative flex min-h-32 flex-col justify-end gap-2 overflow-hidden rounded-xl bg-cover bg-center p-4 ${oscuro ? "" : "bg-accent-muted"}`}
      style={{
        ...(b.color ? { backgroundColor: b.color } : {}),
        ...(url ? { backgroundImage: `url("${url}")` } : {}),
      }}
    >
      {oscuro ? <div aria-hidden className="absolute inset-0 bg-black/40" /> : null}
      {b.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo público de la marca, de tamaño fijo
        <img src={b.logoUrl} alt="" className="relative h-8 w-auto max-w-40 object-contain" />
      ) : null}
      {b.mensaje ? (
        <p className={`t-heading relative ${oscuro ? "text-white" : "text-fg"}`}>{b.mensaje}</p>
      ) : null}
    </section>
  );
}
