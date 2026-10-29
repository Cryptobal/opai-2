import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

export const COMUNICABLES_USUARIOS: readonly EventoComunicable[] = [
  {
    evento: "core.usuario.invitado",
    nombre: "Invitación a la empresa",
    descripcion: "Se envía a la persona invitada con su enlace de un solo uso.",
    transaccional: true,
    variables: [
      v("invitador.nombre", "texto", "Carlos Irigoyen", "Quién invita."),
      EMPRESA,
      v("rol", "texto", "admin", "Rol asignado."),
      URL("Enlace de aceptación (72 horas, un uso)."),
    ],
    plantillas: {
      correo: {
        asunto: "{{invitador.nombre}} te invitó a {{empresa.nombre}} en OPAI",
        cuerpo:
          "Hola:\n\n{{invitador.nombre}} te invitó a {{empresa.nombre}} en OPAI con el rol {{rol}}.\n\nAcepta la invitación aquí (vence en 72 horas y sirve una sola vez):\n{{url}}",
      },
    },
  },
  {
    evento: "core.usuario.invitacion_solicitada",
    nombre: "Pedido de nueva invitación",
    descripcion: "Avisa a quien invitó que el enlace venció y la persona pide otro.",
    transaccional: true,
    variables: [
      v("email", "texto", "ana@cliente.cl", "Correo de quien pide."),
      EMPRESA,
      URL("Usuarios de la empresa."),
    ],
    plantillas: {
      correo: {
        asunto: "{{email}} pide una nueva invitación a {{empresa.nombre}}",
        cuerpo:
          "La invitación de {{email}} a {{empresa.nombre}} venció o ya se usó. Envía una nueva desde Configuración → Usuarios:\n{{url}}",
      },
    },
  },
  {
    evento: "core.usuario.recuperacion",
    nombre: "Recuperación de contraseña",
    descripcion: "Enlace para crear una contraseña nueva (30 minutos, un uso).",
    transaccional: true,
    variables: [
      v("usuario.nombre", "texto", "Ana Rojas", "Nombre de la persona."),
      URL("Enlace de recuperación."),
    ],
    plantillas: {
      correo: {
        asunto: "Recupera tu contraseña de OPAI",
        cuerpo:
          "Hola {{usuario.nombre}}:\n\nPara crear una contraseña nueva abre este enlace (vence en 30 minutos y sirve una sola vez):\n{{url}}\n\nSi no lo pediste, ignora este correo.",
      },
    },
  },
  {
    evento: "core.usuario.mfa_restablecida",
    nombre: "Segundo factor restablecido",
    descripcion: "Avisa a la persona que otro usuario u OPAI apagó su segundo factor (CAR-54).",
    transaccional: true,
    variables: [
      v("usuario.nombre", "texto", "Ana Rojas", "Nombre de la persona."),
      v("responsable", "texto", "Carlos Irigoyen (owner)", "Quién lo restableció."),
      URL("Mi cuenta, para activarlo de nuevo."),
    ],
    plantillas: {
      correo: {
        asunto: "Tu segundo factor quedó desactivado",
        cuerpo:
          "Hola {{usuario.nombre}}:\n\n{{responsable}} restableció el segundo factor de tu cuenta: queda desactivado hasta que lo vuelvas a activar.\n\nSi no lo pediste, contacta a tu empresa de inmediato.\n\nActívalo de nuevo aquí:\n{{url}}",
      },
    },
  },
];
