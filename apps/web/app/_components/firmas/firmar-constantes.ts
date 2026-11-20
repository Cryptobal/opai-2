export const TEXTO_ACEPTACION =
  "Acepto firmar este documento electrónicamente y declaro que la información que entrego es mía.";
export const VERSION_ACEPTACION = "2026-10";

export type PayloadFirmaN1 = {
  metodo: "trazo" | "nombre";
  nombreFirma: string;
  textoAceptacion: string;
  versionAceptacion: string;
};