import { EMPRESA, type EventoComunicable, v } from "./tipos";

export const COMUNICABLES_ACCESO: readonly EventoComunicable[] = [
  {
    evento: "acceso.entrada",
    nombre: "Entrada registrada",
    descripcion:
      "Alguien ingresó a una instalación. Por defecto no avisa a nadie; el anfitrión puede activar el aviso si lo pidió al prerregistrar.",
    transaccional: false,
    variables: [
      v("instalacion.nombre", "texto", "Planta Norte", "Instalación."),
      v("visita.nombre", "texto", "Ana Pérez", "Nombre en el registro."),
      v("visita.empresa", "texto", "Proveedor SA", "Empresa declarada, si la hay."),
      EMPRESA,
    ],
    plantillas: {
      correo: {
        asunto: "Llegó tu visita · {{visita.nombre}} · {{instalacion.nombre}}",
        cuerpo:
          "{{visita.nombre}}{{visita.empresa}} ingresó a {{instalacion.nombre}}.\n\n{{empresa.nombre}}",
      },
    },
  },
  {
    evento: "acceso.salida",
    nombre: "Salida registrada",
    descripcion: "Alguien salió de una instalación. Por defecto no genera avisos.",
    transaccional: false,
    variables: [v("instalacion.nombre", "texto", "Planta Norte", "Instalación."), EMPRESA],
    plantillas: {
      correo: {
        asunto: "Salida registrada · {{instalacion.nombre}}",
        cuerpo: "Se registró una salida en {{instalacion.nombre}}.\n\n{{empresa.nombre}}",
      },
    },
  },
  {
    evento: "acceso.intento_denegado",
    nombre: "Intento de acceso no autorizado",
    descripcion:
      "Alguien no pudo entrar (bloqueado, fuera de lista, fuera de horario o uso único consumido). Por defecto avisa al supervisor de la instalación.",
    transaccional: false,
    variables: [
      v("instalacion.nombre", "texto", "Planta Norte", "Instalación."),
      v("intento.motivo", "texto", "bloqueado", "Categoría del rechazo."),
      EMPRESA,
    ],
    plantillas: {
      correo: {
        asunto: "Intento de acceso no autorizado · {{instalacion.nombre}}",
        cuerpo:
          "Hubo un intento denegado en {{instalacion.nombre}} ({{intento.motivo}}).\n\n{{empresa.nombre}}",
      },
    },
  },
  {
    evento: "acceso.ingreso_bloqueado_diferido",
    nombre: "Ingreso sin conexión a revisar",
    descripcion:
      "Al sincronizar, alguien que entró sin red coincide con la lista bloqueada actual. Avisa al supervisor y al administrador.",
    transaccional: false,
    variables: [v("instalacion.nombre", "texto", "Planta Norte", "Instalación."), EMPRESA],
    plantillas: {
      correo: {
        asunto: "Revisa un ingreso sin conexión · {{instalacion.nombre}}",
        cuerpo:
          "Un ingreso sin conexión coincide con la lista bloqueada en {{instalacion.nombre}}. Revisa si la persona entró al recinto.\n\n{{empresa.nombre}}",
      },
    },
  },
  {
    evento: "acceso.reporte",
    nombre: "Reporte periódico de accesos",
    descripcion:
      "Correo con el resumen de entradas y salidas de una instalación en el período configurado (diario, semanal o mensual). Los documentos van enmascarados.",
    transaccional: false,
    variables: [
      v("instalacion.nombre", "texto", "Bodega Norte", "Nombre de la instalación."),
      v("reporte.periodo", "texto", "3 al 9 de noviembre de 2026", "Período cubierto por el reporte."),
      v("reporte.registros", "numero", "42", "Cantidad de registros incluidos."),
      EMPRESA,
    ],
    plantillas: {
      correo: {
        asunto: "Reporte de accesos · {{instalacion.nombre}} · {{reporte.periodo}}",
        cuerpo:
          "Reporte de Control de acceso para {{instalacion.nombre}} ({{reporte.periodo}}): {{reporte.registros}} registros. Va adjunto un CSV con cada entrada y salida; los documentos van enmascarados.\n\n{{empresa.nombre}}",
      },
    },
  },
];