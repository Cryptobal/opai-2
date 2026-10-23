import { Badge } from "@opai/ds";

import type { PersonaFila } from "@/lib/tipos-maestros";

/** Semáforo de documentos de la persona (53): vencidos, por vencer o al día. */
export function SemaforoDocs({ d }: { d: PersonaFila["documentos"] }) {
  if (d.vencidos)
    return (
      <Badge tono="danger" punto>
        {d.vencidos} {d.vencidos === 1 ? "vencido" : "vencidos"}
      </Badge>
    );
  if (d.porVencer)
    return (
      <Badge tono="warning" punto>
        {d.porVencer} por vencer
      </Badge>
    );
  return (
    <Badge tono="success" punto>
      Al día
    </Badge>
  );
}
