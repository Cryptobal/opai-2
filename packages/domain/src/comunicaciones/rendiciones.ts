import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

const CODIGO = v("rendicion.codigo", "texto", "REN-42", "Código visible de la rendición.");
const DESCRIPCION = v(
  "rendicion.descripcion",
  "texto",
  "Viáticos reunión con cliente",
  "Motivo o descripción que escribió quien rinde.",
);
const MOTIVO = v("motivo", "texto", "Adjunta el respaldo del peaje.", "Motivo al devolver o rechazar.");
const APROBADOR = v("aprobador.nombre", "texto", "Juan Pérez", "Nombre de quien revisa.");

/** Avisos de rendiciones (CAR-598): sin montos ni datos bancarios en las plantillas. */
export const COMUNICABLES_RENDICIONES: readonly EventoComunicable[] = [
  {
    evento: "rendiciones.rendicion.enviada",
    nombre: "Rendición enviada a aprobación",
    descripcion: "Avisa al aprobador asignado que llegó una rendición por revisar.",
    transaccional: false,
    variables: [CODIGO, DESCRIPCION, APROBADOR, EMPRESA, URL("Bandeja o ficha de la rendición.")],
    plantillas: {
      inapp: {
        asunto: "Por revisar · {{rendicion.codigo}}",
        cuerpo: "{{rendicion.descripcion}}",
      },
      correo: {
        asunto: "Rendición {{rendicion.codigo}} por revisar",
        cuerpo:
          "Tienes una rendición por revisar:\n\n{{rendicion.codigo}} · {{rendicion.descripcion}}\n\nÁbrela aquí:\n{{url}}\n\n{{empresa.nombre}}",
      },
    },
  },
  {
    evento: "rendiciones.rendicion.aprobada",
    nombre: "Rendición aprobada",
    descripcion: "Avisa a quien rindió que su rendición fue aprobada.",
    transaccional: false,
    variables: [CODIGO, DESCRIPCION, EMPRESA, URL("Ficha de la rendición.")],
    plantillas: {
      inapp: {
        asunto: "Aprobada · {{rendicion.codigo}}",
        cuerpo: "Tu rendición {{rendicion.codigo}} fue aprobada.",
      },
      correo: {
        asunto: "Aprobamos tu rendición {{rendicion.codigo}}",
        cuerpo: "Tu rendición {{rendicion.codigo}} ({{rendicion.descripcion}}) fue aprobada.\n\n{{url}}\n\n{{empresa.nombre}}",
      },
    },
  },
  {
    evento: "rendiciones.rendicion.rechazada",
    nombre: "Rendición rechazada",
    descripcion: "Avisa a quien rindió que su rendición fue rechazada.",
    transaccional: false,
    variables: [CODIGO, DESCRIPCION, MOTIVO, EMPRESA, URL("Ficha de la rendición.")],
    plantillas: {
      inapp: {
        asunto: "Rechazada · {{rendicion.codigo}}",
        cuerpo: "{{motivo}}",
      },
      correo: {
        asunto: "Rechazamos tu rendición {{rendicion.codigo}}",
        cuerpo:
          "Tu rendición {{rendicion.codigo}} fue rechazada.\n\nMotivo:\n{{motivo}}\n\n{{url}}\n\n{{empresa.nombre}}",
      },
    },
  },
  {
    evento: "rendiciones.rendicion.devuelta",
    nombre: "Rendición devuelta",
    descripcion: "Avisa a quien rindió que debe corregir y reenviar su rendición.",
    transaccional: false,
    variables: [CODIGO, DESCRIPCION, MOTIVO, EMPRESA, URL("Corregir la rendición.")],
    plantillas: {
      inapp: {
        asunto: "Devuelta · {{rendicion.codigo}}",
        cuerpo: "{{motivo}}",
      },
      correo: {
        asunto: "Devolvimos tu rendición {{rendicion.codigo}}",
        cuerpo:
          "Corrige y vuelve a enviar tu rendición {{rendicion.codigo}}.\n\nMotivo:\n{{motivo}}\n\n{{url}}\n\n{{empresa.nombre}}",
      },
    },
  },
  {
    evento: "rendiciones.rendicion.pagada",
    nombre: "Rendición pagada",
    descripcion: "Avisa a quien rindió que su rendición pasó a pagada con el lote.",
    transaccional: false,
    variables: [CODIGO, DESCRIPCION, EMPRESA, URL("Ficha de la rendición.")],
    plantillas: {
      inapp: {
        asunto: "Pagada · {{rendicion.codigo}}",
        cuerpo: "Tu rendición {{rendicion.codigo}} está pagada.",
      },
      correo: {
        asunto: "Pagamos tu rendición {{rendicion.codigo}}",
        cuerpo: "Tu rendición {{rendicion.codigo}} ({{rendicion.descripcion}}) está pagada.\n\n{{url}}\n\n{{empresa.nombre}}",
      },
    },
  },
];