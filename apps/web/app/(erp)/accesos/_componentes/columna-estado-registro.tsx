import { Badge, type Columna } from "@opai/ds";

import type { Registro } from "./datos";
import { estadoRegistro } from "./etiquetas";

/** Columna Estado reutilizada en listas ERP y portal Cliente. */
export const columnaEstadoRegistro = (): Columna<Registro> => ({
  id: "estado",
  etiqueta: "Estado",
  render: (x) => (
    <Badge tono={estadoRegistro(x).tono} punto>
      {estadoRegistro(x).etiqueta}
    </Badge>
  ),
});