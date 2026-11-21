import { haceCuanto } from "@/lib/fechas";

import { type Alerta, ETIQUETA_ESTADO } from "./datos";
import { BadgeEstado, BadgeSeveridad } from "./etiquetas";

export const instalacion = (a: Alerta) => a.instalacionNombre ?? "Instalación sin nombre";

export function TarjetaCola({ a }: { a: Alerta }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="flex items-center gap-2">
        <BadgeSeveridad severidad={a.severidad} />
        <span className="truncate text-base font-medium text-fg">{a.titulo}</span>
      </span>
      <span className="t-caption">
        {ETIQUETA_ESTADO[a.estado] ?? a.estado} · {haceCuanto(a.createdAt)}
      </span>
    </span>
  );
}

export const columnasCola = [
  { id: "instalacion", etiqueta: "Instalación", render: instalacion },
  {
    id: "severidad",
    etiqueta: "Severidad",
    render: (a: Alerta) => <BadgeSeveridad severidad={a.severidad} />,
  },
  { id: "titulo", etiqueta: "Alerta", render: (a: Alerta) => <span className="font-medium text-fg">{a.titulo}</span> },
  {
    id: "estado",
    etiqueta: "Estado",
    render: (a: Alerta) => <BadgeEstado estado={a.estado} />,
  },
  { id: "desde", etiqueta: "Desde", render: (a: Alerta) => haceCuanto(a.createdAt) },
];