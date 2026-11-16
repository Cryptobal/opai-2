/** Piezas tipadas del Markdown seguro (novedades y chat del agente). */
export type TrozoNovedad =
  | { tipo: "texto"; texto: string }
  | { tipo: "negrita"; trozos: TrozoNovedad[] }
  | { tipo: "cursiva"; trozos: TrozoNovedad[] }
  | { tipo: "codigo"; texto: string }
  | { tipo: "enlace"; href: string; trozos: TrozoNovedad[] };

export type BloqueNovedad =
  | { tipo: "parrafo"; trozos: TrozoNovedad[] }
  | { tipo: "titulo"; trozos: TrozoNovedad[] }
  | { tipo: "lista"; ordenada: boolean; items: TrozoNovedad[][] }
  | { tipo: "tabla"; encabezados: TrozoNovedad[][]; filas: TrozoNovedad[][][] };
