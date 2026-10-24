import { Home } from "lucide-react";

import { Empty } from "@opai/ds";

import { EnlaceBoton } from "./maestros/enlace-boton";
import { PaginaPortal } from "./pagina-portal";

/**
 * 404 del ERP dentro del shell (menú, búsqueda y salida de siempre) en vez de la página genérica de
 * Next. Se usa desde los `not-found.tsx` de las rutas con `[id]` que llaman a `notFound()`: un solo
 * `not-found.tsx` en el grupo `(erp)` sumaría un chunk de JS a todas las rutas del ERP (ADR-037).
 */
export function NoEncontrado() {
  return (
    <PaginaPortal portal="erp" titulo="No encontrado" ruta="/">
      <h2 className="t-title mb-4 text-fg md:hidden">No encontrado</h2>
      <Empty
        titulo="No encontramos lo que buscas"
        descripcion="El enlace puede estar mal escrito o lo que buscas ya no existe."
        accion={
          <EnlaceBoton href="/" icono={Home}>
            Ir al inicio
          </EnlaceBoton>
        }
      />
    </PaginaPortal>
  );
}
