/**
 * OS-10 que muestra la ficha (CAR-429). Una sola fuente para el vencimiento: el documento vigente
 * en Documentos cuando existe; si no, el dato manual de la ficha, marcado «sin respaldo».
 * El número de credencial sigue siendo el de la ficha (el documento no lo trae).
 */
export type Os10Manual = { credencial: string | null; venceEn: string | null } | null;
export type Os10Respaldo = {
  documentoId: string;
  emitidoEn: string | null;
  venceEn: string | null;
} | null;

export type Os10Efectivo = {
  credencial: string | null;
  venceEn: string | null;
  /** "documento" = viene de Documentos; "manual" = solo la ficha; null = no hay nada. */
  fuente: "documento" | "manual" | null;
  /** La fecha manual existe y no coincide con la del documento. */
  difiere: boolean;
  documentoId: string | null;
};

export function os10Efectivo(manual: Os10Manual, respaldo: Os10Respaldo): Os10Efectivo {
  const credencial = manual?.credencial ?? null;
  if (respaldo) {
    const difiere = !!manual?.venceEn && !!respaldo.venceEn && manual.venceEn !== respaldo.venceEn;
    return {
      credencial,
      venceEn: respaldo.venceEn ?? manual?.venceEn ?? null,
      fuente: "documento",
      difiere,
      documentoId: respaldo.documentoId,
    };
  }
  const hay = !!credencial || !!manual?.venceEn;
  return {
    credencial,
    venceEn: manual?.venceEn ?? null,
    fuente: hay ? "manual" : null,
    difiere: false,
    documentoId: null,
  };
}
