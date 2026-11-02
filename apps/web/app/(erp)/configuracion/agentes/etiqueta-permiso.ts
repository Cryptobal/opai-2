// Etiqueta legible de un permiso `<modulo>:<recurso>.<verbo>` para el selector de permisos de la key
// (Identidad de servicio t457u). Sin export de diseño: usa el vocabulario del propio id, agrupado por
// módulo. No inventa estilos.

const MODULOS: Record<string, string> = {
  core: "Núcleo",
  crm: "Comercial",
  cpq: "CPQ",
  ops: "Operaciones",
  rondas: "Rondas",
  asistencia: "Asistencia",
  finanzas: "Finanzas",
  nomina: "Remuneraciones",
  licitaciones: "Licitaciones",
};

const VERBOS: Record<string, string> = {
  read: "ver",
  manage: "gestionar",
  read_sensible: "ver (sensible)",
  delete: "eliminar",
};

export type EtiquetaPermiso = { modulo: string; moduloLabel: string; texto: string };

export function etiquetaPermiso(id: string): EtiquetaPermiso {
  const [modulo = "", accion = ""] = id.split(":");
  const i = accion.lastIndexOf(".");
  const recurso = i === -1 ? accion : accion.slice(0, i);
  const verbo = i === -1 ? "" : accion.slice(i + 1);
  return {
    modulo,
    moduloLabel: MODULOS[modulo] ?? modulo,
    texto: verbo ? `${recurso} · ${VERBOS[verbo] ?? verbo}` : recurso,
  };
}

/** Agrupa los permisos por módulo, conservando el orden del catálogo recibido. */
export function porModulo(permisos: string[]): { modulo: string; moduloLabel: string; ids: string[] }[] {
  const grupos: { modulo: string; moduloLabel: string; ids: string[] }[] = [];
  for (const id of permisos) {
    const e = etiquetaPermiso(id);
    const g = grupos.find((x) => x.modulo === e.modulo);
    if (g) g.ids.push(id);
    else grupos.push({ modulo: e.modulo, moduloLabel: e.moduloLabel, ids: [id] });
  }
  return grupos;
}
