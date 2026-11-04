/** Metadatos de la ficha que usa la pantalla (subconjunto de `meta` de `cpq.cotizaciones.ficha`). */
export type MetaFicha = {
  fechaCalculo?: string;
  validaHastaContrato?: string | null;
  avisoRecalculo?: { mensaje: string } | null;
  puedeEnviar?: boolean;
  puedeAprobarMargen?: boolean;
  motivoNoAprobarMargen?: string | null;
  autoaprobacionMargen?: boolean | null;
  aprobacion?: { bandejaId?: string } | null;
  requiereConfirmarMutual?: boolean;
};
