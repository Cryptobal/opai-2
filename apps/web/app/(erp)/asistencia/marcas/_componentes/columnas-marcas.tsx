import { Badge } from "@opai/ds";

import type { FilaMarca } from "./lista-marcas";

const GPS_TONO: Record<string, "success" | "warning" | "neutro"> = { Dentro: "success", Fuera: "warning", "Sin GPS": "neutro" };

export function columnasMarcas(hora: Intl.DateTimeFormat) {
  return [
    { id: "hora", etiqueta: "Hora", render: (m: FilaMarca) => hora.format(new Date(m.horaServidor)) },
    { id: "persona", etiqueta: "Trabajador", render: (m: FilaMarca) => m.personaNombre },
    { id: "inst", etiqueta: "Instalación", render: (m: FilaMarca) => m.instalacionNombre },
    { id: "tipo", etiqueta: "Tipo", render: (m: FilaMarca) => m.tipoEtiqueta },
    { id: "metodo", etiqueta: "Método", render: (m: FilaMarca) => m.metodoEtiqueta },
    {
      id: "gps",
      etiqueta: "GPS",
      render: (m: FilaMarca) => <Badge tono={GPS_TONO[m.gpsEtiqueta] ?? "neutro"}>{m.gpsEtiqueta}</Badge>,
    },
  ];
}