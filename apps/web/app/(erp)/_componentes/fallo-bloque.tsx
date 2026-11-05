import { ErrorState } from "@opai/ds";

import { ReintentarBloque } from "./reintentar-bloque";

/** Un bloque de Inicio solo se oculta por ausencia (sin permiso o módulo apagado); un fallo real se dice. */
export const esFalloReal = (code: string) => code === "INTERNAL" || code === "INVALID_OUTPUT";

/** Fallo de un bloque: corto, con «Reintentar», sin tumbar a los demás (diseño §4.5). */
export function FalloBloque({ titulo }: { titulo: string }) {
  return (
    <ErrorState
      titulo={titulo}
      descripcion="Los demás bloques siguen al día. Intenta de nuevo."
      accion={<ReintentarBloque />}
    />
  );
}
