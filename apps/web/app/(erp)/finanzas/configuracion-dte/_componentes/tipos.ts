export type ConfigDte = {
  ambiente: "certificacion" | "produccion";
  rutEmisor: string | null;
  acteco: number | null;
  emisionProveedor: "simulado" | "simpleapi";
  cesionProveedor: "octava" | null;
  resolucionSiiNumero: number | null;
  resolucionSiiFecha: string | null;
  umbralFoliosPct: number;
  avisoCafDias: number;
  fechaCorte1_0: string | null;
};
