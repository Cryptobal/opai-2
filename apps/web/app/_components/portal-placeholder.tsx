import { Empty } from "@opai/ds";

import { PaginaPortal } from "./pagina-portal";

/** Portal protegido por membresía cuyo contenido llega en la fase 3 (portales). */
export function PortalPlaceholder({
  portal,
  titulo,
  ruta,
}: {
  portal: string;
  titulo: string;
  ruta: string;
}) {
  return (
    <PaginaPortal portal={portal} titulo={titulo} ruta={ruta}>
      <h2 className="t-title mb-4 text-fg md:hidden">{titulo}</h2>
      <Empty
        titulo={`${titulo}: en construcción`}
        descripcion="Este portal se habilita en la fase de portales."
      />
    </PaginaPortal>
  );
}
