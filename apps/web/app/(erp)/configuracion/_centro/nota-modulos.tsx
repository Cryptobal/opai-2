import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import type { Seccion } from "./secciones";

/**
 * Nota bajo la lista del grupo Módulos cuando aún no hay módulos activos con ajustes (brief §5): la
 * tarjeta sigue por el Catálogo y aquí se ofrece verlo. Si ya hay algún `modulo-<id>`, no se muestra.
 */
export function NotaModulos({ entradas }: { entradas: readonly Seccion[] }) {
  if (entradas.some((s) => s.id.startsWith("modulo-"))) return null;
  return (
    <div className="flex flex-col items-start gap-2 px-4 pt-4">
      <p className="text-base text-fg-muted">Aún no tienes módulos con ajustes.</p>
      <EnlaceBoton href="/configuracion/modulos" variante="secondary">
        Ver catálogo
      </EnlaceBoton>
    </div>
  );
}
