import type { Parametros } from "@/lib/parametros";

import { conFiltrosInstalaciones } from "./filtros-instalaciones";

function pestanasModulosOpcionales(
  base: string,
  parametros: Parametros,
  modulos: readonly (readonly [boolean | undefined, string, string])[],
) {
  return modulos
    .filter(([ver]) => ver)
    .map(([, id, etiqueta]) => ({
      id,
      etiqueta,
      href: conFiltrosInstalaciones(`${base}/${id}`, parametros),
    }));
}

export function pestanasInstalacion(p: {
  base: string;
  parametros: Parametros;
  activos: number;
  documentos: number;
  negocios?: boolean;
  rondas?: boolean;
  turnosExtra?: boolean;
  accesos?: boolean;
  personas?: boolean;
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
    ...pestanasModulosOpcionales(p.base, p.parametros, [
      [p.negocios, "negocios", "Negocios"],
      [p.rondas, "rondas", "Rondas"],
      [p.turnosExtra, "turnos-extra", "Turnos extra"],
      [p.accesos, "accesos", "Accesos"],
      [p.personas, "personas", p.persona],
    ]),
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