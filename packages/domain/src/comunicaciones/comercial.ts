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
    evento: "comercial.seguimiento.cliente_respondio",
    nombre: "El cliente respondió al seguimiento",
    descripcion:
      "Avisa cuando un cliente responde a una cotización en seguimiento (por correo o registrado a mano). Llega a quien indique la regla, o al vendedor del negocio si la empresa activa ese aviso en Comercial.",
    transaccional: false,
    variables: [
      v("negocio.titulo", "texto", "Guardias · Planta 1", "Negocio cuyo cliente respondió."),
      EMPRESA,
      URL("Seguimiento del negocio en OPAI."),
    ],
    plantillas: {
      inapp: {
        asunto: "Respondió el cliente de «{{negocio.titulo}}»",
        cuerpo: "El seguimiento quedó detenido. Elige el próximo paso.",
      },
      correo: {
        asunto: "El cliente respondió: {{negocio.titulo}}",
        cuerpo:
          "El cliente de «{{negocio.titulo}}» respondió y el seguimiento quedó detenido.\n\nRevisa su respuesta y elige el próximo paso:\n{{url}}",
      },
    },
  },
  {
    evento: "comercial.seguimiento.cierre_aplicado",
    nombre: "OPAI cerró un negocio sin respuesta",
    descripcion:
      "Avisa cuando el plan de seguimiento, configurado para cerrar solo, perdió un negocio porque el cliente no respondió a ningún paso.",
    transaccional: false,
    variables: [
      v("negocio.titulo", "texto", "Guardias · Planta 1", "Negocio que se cerró."),
      EMPRESA,
      URL("Negocio en OPAI, desde donde se puede reabrir."),
    ],
    plantillas: {
      inapp: {
        asunto: "Se cerró «{{negocio.titulo}}» sin respuesta",
        cuerpo: "Puedes reabrirlo desde el negocio.",
      },
      correo: {
        asunto: "Negocio cerrado sin respuesta: {{negocio.titulo}}",
        cuerpo:
          "El plan de seguimiento cerró «{{negocio.titulo}}» porque el cliente no respondió.\n\nSi fue un error, reábrelo aquí:\n{{url}}",
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
