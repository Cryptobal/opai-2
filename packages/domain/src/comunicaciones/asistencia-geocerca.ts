import { TRABAJADOR } from "./asistencia";
import { EMPRESA, type EventoComunicable, URL, v } from "./tipos";

export const COMUNICABLES_GEOCERCA: readonly EventoComunicable[] = [
  {
    evento: "asistencia.alerta.fuera_de_geocerca",
    nombre: "Marca fuera de la geocerca",
    descripcion:
      "Avisa al empleador que un trabajador marcó fuera del radio de la instalación. La marca se registra igual; el aviso es configurable y empieza silenciado hasta activar una regla en Comunicaciones.",
    transaccional: false,
    variables: [
      TRABAJADOR,
      v("marca.tipo", "texto", "Entrada", "Tipo de marca."),
      v("marca.fecha_hora", "texto", "5 de noviembre de 2026, 08:00", "Fecha y hora del servidor."),
      v("marca.distancia_m", "texto", "450 m", "Distancia al punto de la instalación."),
      v("instalacion.nombre", "texto", "Planta Norte", "Instalación del turno."),
      EMPRESA,
      URL("Ficha del trabajador."),
    ],
    plantillas: {
      inapp: {
        asunto: "{{trabajador.nombre}} marcó fuera de {{instalacion.nombre}}",
        cuerpo: "{{marca.tipo}} a las {{marca.fecha_hora}}, a {{marca.distancia_m}} del punto.",
      },
      correo: {
        asunto: "Marca fuera de geocerca · {{trabajador.nombre}}",
        cuerpo:
          "{{trabajador.nombre}} registró {{marca.tipo}} a las {{marca.fecha_hora}} en {{instalacion.nombre}}, a {{marca.distancia_m}} del punto de la geocerca.\n\nRevisa sus marcas:\n{{url}}\n\n{{empresa.nombre}}",
      },
    },
  },
];