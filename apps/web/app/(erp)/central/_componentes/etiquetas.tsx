import { Badge } from "@opai/ds";

import { ETIQUETA_ESTADO, ETIQUETA_SEVERIDAD, TONO_ESTADO, TONO_SEVERIDAD } from "./datos";

export function BadgeSeveridad({ severidad }: { severidad: string }) {
  return <Badge tono={TONO_SEVERIDAD[severidad] ?? "neutro"}>{ETIQUETA_SEVERIDAD[severidad] ?? severidad}</Badge>;
}

export function BadgeEstado({ estado }: { estado: string }) {
  return <Badge tono={TONO_ESTADO[estado] ?? "neutro"}>{ETIQUETA_ESTADO[estado] ?? estado}</Badge>;
}