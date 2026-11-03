import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

/** Avisos de tareas comerciales (CAR-162). Silencio por defecto (ADR-020). */
export const COMUNICABLES_ACTIVIDADES: readonly EventoComunicable[] = [
  {
    evento: "core.actividad.tarea_vencida",
    nombre: "Tarea vencida",
    descripcion:
      "Una tarea pendiente pasó su vencimiento. Llega a sus responsables si la empresa activa el aviso, o a quien indique la regla.",
    transaccional: false,
    variables: [
      v("tarea.titulo", "texto", "Enviar certificados OS-10 a Rodrigo Álvarez", "Qué hay que hacer."),
      v("tarea.vence", "fecha", "03-11-2026", "Fecha de vencimiento."),
      v("entidad.nombre", "texto", "Seguridad 24/7 · CD Lampa", "Ficha a la que está ligada."),
      EMPRESA,
      URL("Mis tareas en OPAI."),
    ],
    plantillas: {
      inapp: {
        asunto: "Venció «{{tarea.titulo}}»",
        cuerpo: "{{entidad.nombre}} · venció el {{tarea.vence}}",
      },
      correo: {
        asunto: "Tarea vencida: {{tarea.titulo}}",
        cuerpo:
          "La tarea «{{tarea.titulo}}» ({{entidad.nombre}}) venció el {{tarea.vence}}.\n\nMárcala hecha o posponla aquí:\n{{url}}",
      },
    },
  },
];
