import { Badge } from "@opai/ds";

import type { Ticket } from "./datos";
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD, TONO_ESTADO, TONO_PRIORIDAD } from "./datos";

export const COLUMNAS_TICKETS = [
  { id: "numero", etiqueta: "N.º", render: (t: Ticket) => t.numero, className: "w-24" },
  { id: "titulo", etiqueta: "Ticket", render: (t: Ticket) => t.titulo },
  { id: "tipo", etiqueta: "Tipo", render: (t: Ticket) => t.tipoNombre },
  {
    id: "prioridad",
    etiqueta: "Prioridad",
    render: (t: Ticket) => (
      <Badge tono={TONO_PRIORIDAD[t.prioridad] ?? "neutro"}>
        {ETIQUETA_PRIORIDAD[t.prioridad] ?? t.prioridad}
      </Badge>
    ),
  },
  {
    id: "estado",
    etiqueta: "Estado",
    render: (t: Ticket) => (
      <Badge tono={TONO_ESTADO[t.estado] ?? "neutro"}>
        {ETIQUETA_ESTADO[t.estado] ?? t.estado}
      </Badge>
    ),
  },
];
