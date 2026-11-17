import { TRABAJADOR } from "./asistencia";
import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

export const COMUNICABLES_LIMITES: readonly EventoComunicable[] = [
  {
    evento: "asistencia.alerta.limite_jornada",
    nombre: "Límite de jornada superado",
    descripcion:
      "Avisa al empleador cuando un trabajador supera el aviso semanal (40 h), el tope semanal (42 h), las 12 h diarias o las 2 h extraordinarias diarias configuradas (Ley 21.561). Un aviso por tope y período; sin repetir si el día se recalcula.",
    transaccional: false,
    variables: [
      TRABAJADOR,
      v("limite.etiqueta", "texto", "Límite semanal de jornada (42 h)", "Cuál límite se superó."),
      v("dia.fecha", "texto", "2026-11-05", "Fecha del día evaluado."),
      v("dia.minutos", "texto", "735", "Minutos trabajados ese día."),
      v("dia.extra", "texto", "2 h 15 min", "Horas extraordinarias del día."),
      v("jornada.minutos_semana", "texto", "2520", "Minutos trabajados en la semana."),
      v("semana.desde", "texto", "2026-11-03", "Lunes de la semana evaluada."),
      EMPRESA,
      URL("Ficha del trabajador en OPAI."),
    ],
    plantillas: {
      inapp: {
        asunto: "{{trabajador.nombre}}: {{limite.etiqueta}}",
        cuerpo:
          "Semana desde {{semana.desde}}: {{jornada.minutos_semana}} min acumulados. Día {{dia.fecha}}: {{dia.minutos}} min trabajados, {{dia.extra}} extra.",
      },
      correo: {
        asunto: "{{limite.etiqueta}} · {{trabajador.nombre}}",
        cuerpo:
          "{{trabajador.nombre}} superó un límite de jornada ({{limite.etiqueta}}).\n\nSemana desde {{semana.desde}}: {{jornada.minutos_semana}} minutos acumulados.\nDía {{dia.fecha}}: {{dia.minutos}} min trabajados; extraordinarias: {{dia.extra}}.\n\nRevisa sus marcas:\n{{url}}\n\n{{empresa.nombre}}",
      },
    },
  },
];