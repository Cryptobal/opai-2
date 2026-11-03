import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

export const COMUNICABLES_COMERCIAL: readonly EventoComunicable[] = [
  {
    evento: "comercial.solicitud.creada",
    nombre: "Nueva solicitud en la bandeja",
    descripcion:
      "Avisa al responsable del canal cuando entra una solicitud (formulario web, correo o registro).",
    transaccional: false,
    variables: [
      v("solicitud.nombre", "texto", "Ana Pérez", "Nombre o empresa tal como llegó."),
      v("solicitud.canal", "texto", "Web", "Canal de entrada."),
      EMPRESA,
      URL("Ficha de la solicitud en OPAI."),
    ],
    plantillas: {
      inapp: {
        asunto: "Nueva solicitud · {{solicitud.canal}}",
        cuerpo: "{{solicitud.nombre}} envió una consulta por {{solicitud.canal}}.",
      },
      correo: {
        asunto: "Nueva solicitud · {{empresa.nombre}}",
        cuerpo:
          "Entró una solicitud por {{solicitud.canal}}:\n\n{{solicitud.nombre}}\n\nVer en OPAI:\n{{url}}",
      },
    },
  },
  {
    evento: "comercial.solicitud.acuse",
    nombre: "Acuse de recibo al solicitante",
    descripcion:
      "Correo automático al correo del lead cuando el tenant activa el acuse (apagado por defecto).",
    transaccional: true,
    variables: [
      v("solicitud.nombre", "texto", "Ana Pérez", "Nombre de quien consultó."),
      EMPRESA,
    ],
    plantillas: {
      correo: {
        asunto: "Recibimos tu consulta · {{empresa.nombre}}",
        cuerpo:
          "Hola {{solicitud.nombre}}:\n\nRecibimos tu mensaje. Un ejecutivo de {{empresa.nombre}} te contactará pronto.\n\nEste correo es automático; no respondas a esta dirección.",
      },
    },
  },
];
