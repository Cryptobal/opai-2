import { Alerta } from "@opai/ds";

import { mesCorto, type Propio } from "../../_componentes/tipos";

/** Avisa que se edita el cambio guardado que rige más adelante, y si ya está publicado. */
export function AvisoPendiente({ pendiente }: { pendiente: Propio["pendiente"] }) {
  if (!pendiente) return null;
  return (
    <Alerta
      tono="info"
      titulo={`Editas el cambio que rige desde ${mesCorto(pendiente.vigenteDesde)}.`}
      {...(pendiente.estado === "publicado"
        ? { descripcion: "Ya está publicado: para cambiarlo, publica de nuevo." }
        : {})}
    />
  );
}
