/** Filtro «Instalación» de las secciones de Accesos (chips), a partir de las instalaciones a cargo. */
export const filtroInstalacion = (instalaciones: { id: string; nombre: string }[]) => ({
  param: "instalacion",
  etiqueta: "Instalación",
  opciones: instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre })),
});
