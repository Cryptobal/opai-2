import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

// Avisos de cumplimiento (Ley 21.719, Brief 07d): el acuse al titular de su solicitud (ARCO+) y el
// aviso de resolución. Silencio por defecto (ADR-020): sin regla activa no se envía; el tenant los
// edita en Configuración → Comunicaciones, con su marca (ADR-028).
const SOLICITUD = [
  v("solicitud.tipo", "texto", "acceso", "Derecho solicitado (acceso, rectificación, portabilidad…)."),
  v("solicitud.plazo", "fecha", "21-12-2026", "Fecha límite de atención, si hay plazo configurado."),
  v("titular.nombre", "texto", "María Fernanda Soto", "Nombre del titular."),
  EMPRESA,
  URL("Enlace al centro de cumplimiento o a la solicitud."),
];

export const COMUNICABLES_CUMPLIMIENTO: readonly EventoComunicable[] = [
  {
    evento: "core.cumplimiento.solicitud_creada",
    nombre: "Acuse de solicitud del titular",
    descripcion:
      "Se registró una solicitud del titular (ARCO+); el acuse confirma la recepción y el plazo.",
    transaccional: false,
    variables: SOLICITUD,
    plantillas: {
      correo: {
        asunto: "{{empresa.nombre}}: recibimos tu solicitud de {{solicitud.tipo}}",
        cuerpo:
          "Hola {{titular.nombre}}:\n\n{{empresa.nombre}} recibió tu solicitud de {{solicitud.tipo}}. La atenderemos dentro del plazo (hasta el {{solicitud.plazo}}).\n\n{{url}}",
      },
      inapp: {
        asunto: "Solicitud de {{solicitud.tipo}} recibida",
        cuerpo: "{{titular.nombre}} · plazo {{solicitud.plazo}}",
      },
    },
  },
  {
    evento: "core.cumplimiento.solicitud_resuelta",
    nombre: "Solicitud del titular resuelta",
    descripcion: "Una solicitud del titular (ARCO+) se resolvió; avisa al titular del cierre.",
    transaccional: false,
    variables: SOLICITUD,
    plantillas: {
      correo: {
        asunto: "{{empresa.nombre}}: resolvimos tu solicitud de {{solicitud.tipo}}",
        cuerpo:
          "Hola {{titular.nombre}}:\n\n{{empresa.nombre}} resolvió tu solicitud de {{solicitud.tipo}}.\n\n{{url}}",
      },
    },
  },
];
