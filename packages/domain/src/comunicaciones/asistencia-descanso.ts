import { TRABAJADOR } from "./asistencia";
import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

// Aviso de descanso insuficiente entre jornadas (derecho a desconexión del teletrabajo, Ley 21.220).
export const COMUNICABLES_DESCANSO: readonly EventoComunicable[] = [
  {
    evento: "asistencia.alerta.descanso_insuficiente",
    nombre: "Descanso entre jornadas insuficiente",
    descripcion:
      "Avisa al trabajador, en su correo personal y con copia al empleador, que el descanso entre su jornada anterior y la que inició fue menor al mínimo de su tipo de jornada (teletrabajo: 12 horas de desconexión).",
    transaccional: true,
    variables: [
      TRABAJADOR,
      v("jornada.tipo", "texto", "Teletrabajo", "Tipo de jornada del trabajador."),
      v("jornada.descanso_minimo_horas", "texto", "12", "Horas mínimas de descanso entre jornadas."),
      v("dia.entrada", "texto", "5 de noviembre de 2026, 07:30", "Hora de inicio de la jornada que quedó con descanso insuficiente."),
      EMPRESA,
      URL("Tus marcas."),
    ],
    plantillas: {
      correo: {
        asunto: "Descanso entre jornadas insuficiente",
        cuerpo:
          "{{trabajador.nombre}}, tu jornada ({{jornada.tipo}}) comenzó el {{dia.entrada}}, con menos de {{jornada.descanso_minimo_horas}} horas de descanso desde la anterior.\n\nTienes derecho a un descanso mínimo de {{jornada.descanso_minimo_horas}} horas entre jornadas. Si crees que es un error, revisa tus marcas.\n\n{{url}}\n\n{{empresa.nombre}}",
      },
    },
  },
];
