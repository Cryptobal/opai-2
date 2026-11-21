import { PaginaPortal } from "@/app/_components/pagina-portal";

import { ContenidoTurnoCentral } from "./_componentes/contenido-turno";
import { cargarPantallaTurno } from "./_componentes/datos-turno";

export const metadata = { title: "Turno de central" };

/** Turno de central y control del agente (modulos/central.md §3, CAR-521). */
export default function TurnoCentral() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Turno de central"
      ruta="/central/turno"
      volver={{ href: "/central", etiqueta: "Central" }}
      cargar={cargarPantallaTurno}
    >
      {(datos) => <ContenidoTurnoCentral {...datos} />}
    </PaginaPortal>
  );
}