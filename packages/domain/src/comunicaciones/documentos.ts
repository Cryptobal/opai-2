import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

const DOC = [
  v("documento.nombre", "texto", "Credencial OS-10 María Soto.pdf", "Archivo."),
  v("documento.tipo", "texto", "Credencial OS-10", "Tipo de documento."),
  v("documento.vence", "fecha", "05-11-2026", "Fecha de vencimiento."),
  v("documento.dias", "numero", "14", "Días que faltan (0 = hoy)."),
  v("entidad.nombre", "texto", "María Fernanda Soto", "A quién o qué pertenece."),
  EMPRESA,
  URL("Enlace al documento."),
];

export const COMUNICABLES_DOCUMENTOS: readonly EventoComunicable[] = [
  {
    evento: "core.documento.por_vencer",
    nombre: "Documento por vencer",
    descripcion: "Un documento llega a un hito de aviso antes de vencer.",
    transaccional: false,
    variables: DOC,
    plantillas: {
      correo: {
        asunto: "{{documento.tipo}} de {{entidad.nombre}} vence el {{documento.vence}}",
        cuerpo:
          "{{documento.tipo}} de {{entidad.nombre}} vence en {{documento.dias}} días ({{documento.vence}}).\n\nRevísalo aquí:\n{{url}}",
      },
      inapp: {
        asunto: "{{documento.tipo}} vence en {{documento.dias}} días",
        cuerpo: "{{entidad.nombre}} · vence el {{documento.vence}}",
      },
    },
  },
  {
    evento: "core.documento.vencido",
    nombre: "Documento vencido",
    descripcion: "Un documento llegó a su fecha de vencimiento.",
    transaccional: false,
    variables: DOC,
    plantillas: {
      correo: {
        asunto: "Venció {{documento.tipo}} de {{entidad.nombre}}",
        cuerpo:
          "{{documento.tipo}} de {{entidad.nombre}} venció el {{documento.vence}}.\n\nSube la versión vigente aquí:\n{{url}}",
      },
      inapp: {
        asunto: "Venció {{documento.tipo}}",
        cuerpo: "{{entidad.nombre}} · venció el {{documento.vence}}",
      },
    },
  },
];
