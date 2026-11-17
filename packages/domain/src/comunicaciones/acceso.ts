import { EMPRESA, type EventoComunicable, v } from "./tipos";

export const COMUNICABLES_ACCESO: readonly EventoComunicable[] = [
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