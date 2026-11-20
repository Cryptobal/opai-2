export function pestanasPersona(p: { base: string; q: string; turnosExtra?: boolean; documentos: number }) {
  return [
    { id: "resumen" as const, etiqueta: "Resumen", href: `${p.base}${p.q}` },
    { id: "laboral" as const, etiqueta: "Laboral", href: `${p.base}/laboral${p.q}` },
    { id: "ausencias" as const, etiqueta: "Ausencias", href: `${p.base}/ausencias${p.q}` },
    ...(p.turnosExtra
      ? [{ id: "turnos-extra" as const, etiqueta: "Turnos extra", href: `${p.base}/turnos-extra${p.q}` }]
      : []),
    { id: "sueldo" as const, etiqueta: "Sueldo", href: `${p.base}/sueldo${p.q}` },
    { id: "anexos" as const, etiqueta: "Anexos", href: `${p.base}/anexos${p.q}` },
    {
      id: "documentos" as const,
      etiqueta: "Documentos",
      contador: p.documentos,
      href: `${p.base}/documentos${p.q}`,
    },
    { id: "privacidad" as const, etiqueta: "Privacidad", href: `${p.base}/privacidad${p.q}` },
    { id: "actividad" as const, etiqueta: "Actividad", href: `${p.base}/actividad${p.q}` },
  ];
}