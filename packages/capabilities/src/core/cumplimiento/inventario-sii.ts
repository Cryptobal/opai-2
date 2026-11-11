import { defineDatosPersonales } from "@opai/domain";

/** Caché de la consulta de contribuyente al SII por RUT (CAR-156). */
export const INVENTARIO_SII = defineDatosPersonales("core", [
  {
    tabla: "sii_contribuyentes",
    finalidad:
      "Caché de la consulta al SII por RUT (CAR-156) para completar los datos tributarios de las cuentas; si el contribuyente es persona natural, su RUT, nombre y domicilio tributario son personales.",
    categorias: ["identificacion"],
    campos: ["rut", "datos"],
    baseLicitud: "contrato",
    destinatarios: ["SimpleAPI RUT (consulta de contribuyente) — a confirmar por legal"],
    retencion: "Vence a los 30 días con datos, 7 sin inicio de actividades y 1 sin registros; el trabajo diario core.sii.purgar_cache borra las vencidas.",
  },
]);
