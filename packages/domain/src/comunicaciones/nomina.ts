import { TRABAJADOR } from "./asistencia";
import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

export const COMUNICABLES_NOMINA: readonly EventoComunicable[] = [
  {
    evento: "nomina.liquidacion.publicada",
    nombre: "Liquidación publicada al trabajador",
    descripcion:
      "Avisa al trabajador que su liquidación del período quedó en Mis documentos del portal y se envía copia al correo personal.",
    transaccional: true,
    variables: [
      TRABAJADOR,
      v("periodo.nombre", "texto", "Octubre 2026", "Mes de la liquidación."),
      EMPRESA,
      URL("Mis documentos en el portal del trabajador."),
    ],
    plantillas: {
      correo: {
        asunto: "Tu liquidación de {{periodo.nombre}} · {{empresa.nombre}}",
        cuerpo:
          "{{trabajador.nombre}}, publicamos tu liquidación de {{periodo.nombre}}.\n\nLa encuentras en Mis documentos del portal del trabajador:\n{{url}}\n\n{{empresa.nombre}}",
      },
      inapp: {
        asunto: "Liquidación de {{periodo.nombre}}",
        cuerpo: "Tu liquidación de {{periodo.nombre}} ya está en Mis documentos.",
      },
    },
  },
];