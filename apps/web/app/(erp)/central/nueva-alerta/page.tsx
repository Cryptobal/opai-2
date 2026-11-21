import { DetailScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";

import { FormularioNuevaAlerta } from "./_componentes/formulario";

export const metadata = { title: "Abrir alerta" };

/** Abrir una alerta a mano (CAR-521). */
export default function NuevaAlertaCentral() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Abrir alerta"
      ruta="/central/nueva-alerta"
      volver={{ href: "/central", etiqueta: "Central" }}
    >
      <DetailScreen state="ready" titulo="Abrir alerta" subtitulo="Queda nueva en la cola de la central">
        <FormularioNuevaAlerta />
      </DetailScreen>
    </PaginaPortal>
  );
}