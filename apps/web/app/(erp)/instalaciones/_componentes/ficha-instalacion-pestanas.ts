import type { Parametros } from "@/lib/parametros";

import { conFiltrosInstalaciones } from "./filtros-instalaciones";

export function pestanasInstalacion(p: {
  base: string;
  parametros: Parametros;
  activos: number;
  documentos: number;
  negocios?: boolean;
  rondas?: boolean;
  turnosExtra?: boolean;
  accesos?: boolean;
  persona: string;
}) {
  return [
    { id: "resumen" as const, etiqueta: "Resumen", href: conFiltrosInstalaciones(p.base, p.parametros) },
    {
      id: "puestos" as const,
      etiqueta: "Puestos",
      contador: p.activos,
      href: conFiltrosInstalaciones(`${p.base}/puestos`, p.parametros),
    },
    {
      id: "sueldo" as const,
      etiqueta: "Sueldo",
      href: conFiltrosInstalaciones(`${p.base}/sueldo`, p.parametros),
    },
    ...(
      [
        [p.negocios, "negocios", "Negocios"],
        [p.rondas, "rondas", "Rondas"],
        [p.turnosExtra, "turnos-extra", "Turnos extra"],
        [p.accesos, "accesos", "Accesos"],
      ] as const
    )
      .filter(([ver]) => ver)
      .map(([, id, etiqueta]) => ({
        id,
        etiqueta,
        href: conFiltrosInstalaciones(`${p.base}/${id}`, p.parametros),
      })),
    {
      id: "personas" as const,
      etiqueta: p.persona,
      href: p.base,
      deshabilitada: "Disponible con Operaciones",
    },
    {
      id: "dispositivos" as const,
      etiqueta: "Dispositivos",
      href: conFiltrosInstalaciones(`${p.base}/dispositivos`, p.parametros),
    },
    {
      id: "documentos" as const,
      etiqueta: "Documentos",
      contador: p.documentos,
      href: conFiltrosInstalaciones(`${p.base}/documentos`, p.parametros),
    },
    {
      id: "actividad" as const,
      etiqueta: "Actividad",
      href: conFiltrosInstalaciones(`${p.base}/actividad`, p.parametros),
    },
  ];
}