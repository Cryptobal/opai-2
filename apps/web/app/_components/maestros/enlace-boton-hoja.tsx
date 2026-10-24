import { cn, estilosBoton } from "@opai/ds";

import type { PropsEnlaceBoton } from "./enlace-boton";
import { EnlaceUrl } from "./enlace-url";

/**
 * Botón que abre una hoja por parámetro de la misma página (`?nueva=1`, `?subir=1`): abre al instante
 * (historial del navegador) sin esperar al servidor. Va en un módulo aparte para que las pantallas
 * que no abren hojas no carguen `EnlaceUrl` (ADR-037). Para enlaces que necesitan datos del servidor
 * (`?historial=1`) se usa `EnlaceBoton`.
 */
export function EnlaceBotonHoja({
  href,
  children,
  variante = "primary",
  icono: Icono,
  etiqueta,
  className,
}: PropsEnlaceBoton) {
  return (
    <EnlaceUrl
      href={href}
      aria-label={etiqueta}
      className={cn(estilosBoton({ variant: variante }), className)}
    >
      {Icono ? <Icono className="size-4" aria-hidden /> : null}
      {children}
    </EnlaceUrl>
  );
}
