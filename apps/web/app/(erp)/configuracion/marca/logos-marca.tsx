import { Upload } from "lucide-react";

import { cn, SeccionTarjeta } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";

import { type Marca, SLOTS } from "./tipos";

/** Logo servido por `/api/marca/<slug>/<asset>` (otro origen posible): next/image no aplica. */
const imagen = (src: string, alt: string) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt={alt} className="max-h-10 max-w-[80%] object-contain" />
);

/** Logos de la marca (22): cada ranura con su muestra en fondo claro u oscuro y "Reemplazar". */
export function LogosMarca({ marca, puede }: { marca: Marca; puede: boolean }) {
  return (
    <SeccionTarjeta
      titulo="Logos"
      accion={<span className="t-caption">SVG o PNG transparente · hasta 2 MB</span>}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {SLOTS.map((s) => {
          const url = marca.urls[s.id];
          const fondos =
            s.fondo === "ambos" ? (["claro", "oscuro"] as const) : ([s.fondo] as const);
          return (
            <div key={s.id} className="flex flex-col gap-2">
              <span className="text-sm font-medium text-fg">{s.etiqueta}</span>
              <div className="flex h-16 overflow-hidden rounded-md border border-border">
                {url ? (
                  fondos.map((f) => (
                    <span
                      key={f}
                      className={cn(
                        "flex flex-1 items-center justify-center",
                        f === "oscuro" ? "bg-inverse-bg" : "bg-surface",
                      )}
                    >
                      {imagen(url, `${s.etiqueta} sobre fondo ${f}`)}
                    </span>
                  ))
                ) : (
                  <span className="flex flex-1 items-center justify-center gap-1.5 border-dashed bg-fill text-sm text-fg-muted">
                    <Upload className="size-4" aria-hidden /> Sin logo
                  </span>
                )}
              </div>
              {puede ? (
                <EnlaceBotonHoja href={`?logo=${s.param}`} variante="secondary" className="w-full">
                  {url ? "Reemplazar" : "Subir"}
                </EnlaceBotonHoja>
              ) : null}
              {s.ayuda ? <span className="t-caption">{s.ayuda}</span> : null}
            </div>
          );
        })}
      </div>
    </SeccionTarjeta>
  );
}
