/** Metadatos de la ficha que usa la pantalla (subconjunto de `meta` de `cpq.cotizaciones.ficha`). */
export type EstadoFichaMeta = {
  estado: string;
  etiqueta: string;
  siguiente: { accion: string; etiqueta: string };
  bloqueos: { codigo: string; mensaje: string }[];
};

export type MetaFicha = {
  /** Estado único y siguiente paso (CAR-192). */
  estadoFicha?: EstadoFichaMeta;
  puedeReabrir?: boolean;
  puedeCrearVersion?: boolean;
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
