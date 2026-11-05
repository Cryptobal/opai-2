import { defineModule } from "@opai/capabilities";

import { ajustesAsistencia, capacidades } from "./capabilities";

/**
 * Manifest del módulo Asistencia (ADR-003, ADR-048): vendible por separado, depende solo del núcleo.
 * La marca es un hecho regulado (ADR-023). Especificación: docs/2.0/modulos/asistencia.md.
 */
export const manifest = defineModule({
  id: "asistencia",
  nombre: "Asistencia",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: "asistencia:marcar", descripcion: "Registrar la propia marca (solo personas, en Terreno y Portal Trabajador)" },
    { id: "asistencia:ver", descripcion: "Ver marcas y asistencia de las instalaciones a cargo" },
    { id: "asistencia:ver_todo", descripcion: "Ver marcas y asistencia de toda la empresa" },
    { id: "asistencia:corregir", descripcion: "Proponer y gestionar correcciones, contingencias e incidentes" },
    { id: "asistencia:configurar", descripcion: "Configurar Asistencia: canales, geocerca, plazos y alertas" },
    { id: "asistencia:reportes", descripcion: "Ver y exportar los reportes de asistencia" },
  ],
  navegacion: [],
  configuracion: ajustesAsistencia,
  eventos: [
    { id: "asistencia.marca.registrada", descripcion: "Se registró una marca legal de asistencia." },
    { id: "asistencia.cadena.rota", descripcion: "La verificación diaria encontró la cadena de marcas rota." },
  ],
  capacidades,
});
