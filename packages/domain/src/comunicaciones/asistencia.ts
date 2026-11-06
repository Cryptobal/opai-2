import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

// Eventos comunicables de Asistencia (ADR-020, ORD 770/2025). El comprobante y los avisos al trabajador
// son transaccionales: van directo a su correo PERSONAL (nunca al corporativo), sin reglas ni silencio.
const TRABAJADOR = v("trabajador.nombre", "texto", "Ana Pérez", "Nombre completo del trabajador.");

export const COMUNICABLES_ASISTENCIA: readonly EventoComunicable[] = [
  {
    evento: "asistencia.marca.comprobante",
    nombre: "Comprobante de marca",
    descripcion:
      "Comprobante inmediato de cada marca de asistencia, al correo personal del trabajador. Lleva la fecha y hora del servidor, el tipo, el método, el lugar, el hash y el código de verificación; si hay resolución de jornada excepcional o empresa usuaria (EST o subcontrato), también.",
    transaccional: true,
    variables: [
      TRABAJADOR,
      v("marca.tipo", "texto", "Entrada", "Entrada, salida o colación."),
      v("marca.fecha_hora", "texto", "5 de noviembre de 2026, 08:00:01", "Fecha y hora asignadas por el servidor."),
      v("marca.metodo", "texto", "RUT y PIN", "Cómo se identificó."),
      v("marca.lugar", "texto", "Planta Norte", "Establecimiento donde marcó."),
      v("marca.hash", "texto", "b70a56ca…", "Huella SHA-256 de la marca."),
      v("marca.codigo", "texto", "0EAC10A2D2", "Código de verificación."),
      v("marca.resolucion", "texto", "Res. 123 del 1-ene-2026", "Resolución de jornada excepcional, si corresponde."),
      v("marca.empresa_usuaria", "texto", "Minera Los Andes SA · 76.111.111-1", "Empresa donde presta servicios, si es EST o subcontrato."),
      EMPRESA,
      URL("Verificación pública de la marca."),
    ],
    plantillas: {
      correo: {
        asunto: "Comprobante de marca · {{marca.tipo}} · {{marca.fecha_hora}}",
        cuerpo:
          "{{trabajador.nombre}}, registramos tu marca:\n\nTipo: {{marca.tipo}}\nFecha y hora del servidor: {{marca.fecha_hora}}\nMétodo: {{marca.metodo}}\nLugar: {{marca.lugar}}\nEmpresa usuaria: {{marca.empresa_usuaria}}\nResolución de jornada: {{marca.resolucion}}\nHash: {{marca.hash}}\nCódigo de verificación: {{marca.codigo}}\n\nVerifica tu marca:\n{{url}}\n\n{{empresa.nombre}}",
      },
    },
  },
  {
    evento: "asistencia.correccion.propuesta",
    nombre: "Corrección de una marca por responder",
    descripcion:
      "Avisa al trabajador que se propone corregir una de sus marcas y le da un enlace para aceptar u objetar (objetar exige un comentario). Si no responde en el plazo, la corrección vence y se mantiene el valor original.",
    transaccional: true,
    variables: [
      TRABAJADOR,
      v("correccion.original", "texto", "Entrada 5-nov 08:12", "Marca original."),
      v("correccion.propuesta", "texto", "Entrada 5-nov 08:00", "Valor propuesto."),
      v("correccion.motivo", "texto", "Falla del lector", "Motivo de quien la propone."),
      v("correccion.vence", "texto", "7 de noviembre de 2026, 08:00", "Hasta cuándo puedes responder."),
      EMPRESA,
      URL("Enlace personal para responder."),
    ],
    plantillas: {
      correo: {
        asunto: "Corrección de tu marca: responde antes del {{correccion.vence}}",
        cuerpo:
          "{{trabajador.nombre}}, se propone corregir una de tus marcas:\n\nOriginal: {{correccion.original}}\nPropuesta: {{correccion.propuesta}}\nMotivo: {{correccion.motivo}}\n\nPuedes aceptar u objetar hasta el {{correccion.vence}}. Mientras no respondas, vale tu marca original.\n\n{{url}}\n\n{{empresa.nombre}}",
      },
    },
  },
  {
    evento: "asistencia.alerta.sin_marca_inicio",
    nombre: "Falta la marca de inicio",
    descripcion:
      "A los 30 minutos de iniciado el turno sin marca de entrada, avisa al trabajador y envía copia al empleador (art. 45 de la Res. 38).",
    transaccional: true,
    variables: [
      TRABAJADOR,
      v("turno.inicio", "texto", "5 de noviembre de 2026, 08:00", "Inicio del turno."),
      v("turno.lugar", "texto", "Planta Norte", "Lugar del turno."),
      EMPRESA,
      URL("Tu historial de marcas."),
    ],
    plantillas: {
      correo: {
        asunto: "No registramos tu marca de inicio de las {{turno.inicio}}",
        cuerpo:
          "{{trabajador.nombre}}, tu turno en {{turno.lugar}} empezó a las {{turno.inicio}} y aún no registras tu marca de entrada.\n\nSi ya llegaste, marca ahora. Si no, avisa a tu supervisor.\n\n{{empresa.nombre}}\n{{url}}",
      },
    },
  },
  {
    evento: "asistencia.alerta.sin_marca_termino",
    nombre: "Falta la marca de término",
    descripcion:
      "Cuando termina el turno sin marca de salida, avisa al trabajador y envía copia al empleador. El empleador puede deshabilitar este aviso (art. 45 de la Res. 38).",
    transaccional: true,
    variables: [
      TRABAJADOR,
      v("turno.fin", "texto", "5 de noviembre de 2026, 20:00", "Término del turno."),
      v("turno.lugar", "texto", "Planta Norte", "Lugar del turno."),
      EMPRESA,
      URL("Tu historial de marcas."),
    ],
    plantillas: {
      correo: {
        asunto: "No registramos tu marca de término de las {{turno.fin}}",
        cuerpo:
          "{{trabajador.nombre}}, tu turno en {{turno.lugar}} terminó a las {{turno.fin}} y no registras tu marca de salida.\n\nSi aún estás en el lugar, marca ahora. Si no, avisa a tu supervisor.\n\n{{empresa.nombre}}\n{{url}}",
      },
    },
  },
  {
    evento: "asistencia.aviso.compensables",
    nombre: "Horas compensables acumuladas",
    descripcion:
      "Cada 30 días, avisa al trabajador sus horas extraordinarias compensables acumuladas (art. 45 de la Res. 38).",
    transaccional: true,
    variables: [
      TRABAJADOR,
      v("periodo.desde", "texto", "6 de octubre de 2026", "Inicio del período."),
      v("periodo.hasta", "texto", "5 de noviembre de 2026", "Fin del período."),
      v("horas.compensables", "texto", "6 h 30 min", "Horas compensables acumuladas."),
      EMPRESA,
      URL("Tu historial de marcas."),
    ],
    plantillas: {
      correo: {
        asunto: "Tus horas compensables al {{periodo.hasta}}",
        cuerpo:
          "{{trabajador.nombre}}, entre el {{periodo.desde}} y el {{periodo.hasta}} acumulas {{horas.compensables}} de horas compensables.\n\n{{empresa.nombre}}\n{{url}}",
      },
    },
  },
  {
    evento: "asistencia.alerta.sin_correo_personal",
    nombre: "Trabajador sin correo personal",
    descripcion:
      "Avisa al empleador que un trabajador no tiene correo personal registrado y, por eso, no puede recibir el comprobante de sus marcas (ORD 770/2025).",
    transaccional: false,
    variables: [TRABAJADOR, EMPRESA, URL("Ficha de la persona en OPAI.")],
    plantillas: {
      inapp: {
        asunto: "{{trabajador.nombre}} no tiene correo personal",
        cuerpo: "No podemos enviarle el comprobante de sus marcas. Registra su correo personal.",
      },
      correo: {
        asunto: "Falta el correo personal de {{trabajador.nombre}}",
        cuerpo:
          "{{trabajador.nombre}} marcó y no tiene correo personal registrado, así que no recibió su comprobante.\n\nRegístralo en su ficha:\n{{url}}\n\n{{empresa.nombre}}",
      },
    },
  },
];
