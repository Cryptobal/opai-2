import { ajustesRondas, capacidadesRondas, defineModule, indicadoresRondas } from "@opai/capabilities";

/**
 * Manifest del módulo Rondas (ADR-003, Brief 14). El núcleo deriva navegación, permisos,
 * configuración, eventos y herramientas MCP desde aquí. Las capacidades viven en
 * packages/capabilities/src/rondas y se listan como `capacidadesRondas`. La entrada de navegación del
 * ERP «Control de rondas» y las pantallas de terreno llegan en los PR 3 y PR 4; en el PR 1 la
 * configuración de puntos vive en la pestaña «Rondas» de la ficha de instalación.
 */
export const manifest = defineModule({
  id: "rondas",
  nombre: "Rondas",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: "rondas:read", descripcion: "Ver rondas, puntos, plantillas, control e informes" },
    {
      id: "rondas:configurar",
      descripcion: "Crear y editar puntos, plantillas, programaciones y tipos de incidente",
    },
    { id: "rondas:revisar", descripcion: "Revisar anomalías de rondas" },
    {
      id: "rondas:administrar",
      descripcion: "Cerrar rondas como administrador e invalidar marcas",
    },
    {
      id: "rondas:confianza.manage",
      descripcion: "Configurar y publicar el modelo de confianza de rondas",
    },
  ],
  navegacion: [],
  configuracion: ajustesRondas,
  eventos: [
    { id: "rondas.ejecucion.iniciada", descripcion: "Comenzó una ronda." },
    { id: "rondas.ejecucion.completada", descripcion: "Se cerró una ronda con sus puntos marcados." },
    { id: "rondas.ejecucion.atrasada", descripcion: "Una ronda en curso superó su tiempo máximo." },
    { id: "rondas.ejecucion.no_realizada", descripcion: "Venció la ventana sin iniciar la ronda." },
    { id: "rondas.ejecucion.incompleta", descripcion: "Una ronda se cerró con puntos sin marcar." },
    { id: "rondas.punto.omitido", descripcion: "Venció el tramo de un punto obligatorio." },
    { id: "rondas.anomalia.detectada", descripcion: "Se detectó una anomalía en una marca o ronda." },
    {
      id: "rondas.ronda.sin_movimiento",
      descripcion: "Una ronda en curso no registró desplazamiento por el umbral configurado.",
    },
    { id: "rondas.ronda.sin_rastro", descripcion: "Un tramo de la ronda quedó sin rastro GPS." },
    { id: "rondas.marca.sincronizada_tarde", descripcion: "Llegó una marca sin conexión tras el cierre." },
    { id: "rondas.emergencia", descripcion: "El guardia activó el botón de emergencia." },
    { id: "rondas.novedad.grave", descripcion: "Se registró una novedad de gravedad alta (incidente)." },
    { id: "rondas.informe.cliente", descripcion: "Se generó el informe de rondas programado para el cliente." },
  ],
  capacidades: capacidadesRondas,
  // Indicador de gestión para el catálogo del núcleo (ADR-094, CAR-310).
  indicadores: indicadoresRondas,
});
