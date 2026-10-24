import { Home } from "lucide-react";

import { Empty } from "@opai/ds";

import { EnlaceBoton } from "./maestros/enlace-boton";
import { PaginaPortal } from "./pagina-portal";

/**
 * 404 dentro del shell del portal (menú, búsqueda y salida de siempre) en vez de la página genérica
 * de Next. ERP: lo usan el catch-all `(erp)/[...ruta]` y los `not-found.tsx` de las rutas con `[id]`;
 * cada otro portal tiene su propio catch-all para no mostrar el shell del ERP (ADR-044). No es un
 * único `not-found.tsx` en el grupo `(erp)` porque sumaría un chunk de JS a todas sus rutas (ADR-037).
 */
export function NoEncontrado({ portal = "erp" }: { portal?: string }) {
  const inicio = portal === "erp" ? "/" : `/${portal}`;
  return (
    <PaginaPortal portal={portal} titulo="No encontrado" ruta={inicio}>
      <h2 className="t-title mb-4 text-fg md:hidden">No encontrado</h2>
      <Empty
        titulo="No encontramos lo que buscas"
        descripcion="El enlace puede estar mal escrito o lo que buscas ya no existe."
        accion={
          <EnlaceBoton href={inicio} icono={Home}>
            Ir al inicio
          </EnlaceBoton>
        }
      />
    </PaginaPortal>
  );
}
