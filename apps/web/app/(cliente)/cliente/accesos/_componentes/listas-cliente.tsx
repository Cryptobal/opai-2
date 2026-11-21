import { Forbidden } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import type { Pagina } from "@/app/(erp)/accesos/_componentes/datos";
import { type EntradaLista, PanelListas } from "@/app/(erp)/accesos/_componentes/panel-listas";

import { ruta } from "./ruta";

/** `pagina` es null cuando la empresa de seguridad no habilitó la gestión de listas en este portal. */
export type Listas = { tipo: "autorizada" | "bloqueada"; pagina: Pagina<EntradaLista> | null };

/** Listas autorizada y bloqueada de una instalación del cliente (CAR-538), con las mismas piezas del ERP. */
export function ListasCliente({ instalacion, listas }: { instalacion: string; listas: Listas }) {
  const { tipo, pagina } = listas;
  if (!pagina)
    return (
      <Forbidden
        titulo="Listas no habilitadas"
        descripcion="Tu empresa de seguridad gestiona las listas de tus instalaciones. Pídele que te habilite si quieres agregar o quitar personas."
      />
    );
  return (
    <>
      <PanelListas
        state="ready"
        portal="cliente"
        instalacionId={instalacion}
        tipo={tipo}
        entradas={pagina.items}
        href={(t) => ruta({ instalacion, vista: "listas", lista: t })}
      />
      {pagina.siguiente ? (
        <LinkNext
          href={ruta({ instalacion, vista: "listas", lista: tipo, cursor: pagina.siguiente })}
          className="t-label self-start px-4 py-3 text-accent"
        >
          Siguiente página
        </LinkNext>
      ) : null}
    </>
  );
}
