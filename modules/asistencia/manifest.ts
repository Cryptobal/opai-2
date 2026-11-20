import { defineModule } from "@opai/capabilities";

import { ajustesAsistencia, capacidades, indicadoresAsistencia } from "./capabilities";

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
  navegacion: [
    { portal: "erp", href: "/asistencia", etiqueta: "Asistencia", icono: "UserCheck", area: "operaciones", orden: 50, permiso: "asistencia:ver" },
    { portal: "erp", href: "/asistencia/marcas", etiqueta: "Marcas", icono: "Fingerprint", area: "operaciones", orden: 51, permiso: "asistencia:ver" },
    { portal: "erp", href: "/asistencia/reportes-dt", etiqueta: "Reportes DT", icono: "FileText", area: "operaciones", orden: 52, permiso: "asistencia:reportes" },
    { portal: "trabajador", href: "/trabajador/correcciones", etiqueta: "Correcciones", icono: "Pencil", area: "asistencia", orden: 35, permiso: null },
    { portal: "trabajador", href: "/trabajador/contingencias", etiqueta: "Contingencias", icono: "AlertTriangle", area: "asistencia", orden: 40, permiso: null },
  ],
  configuracion: ajustesAsistencia,
  eventos: [
    { id: "asistencia.marca.registrada", descripcion: "Se registró una marca legal de asistencia." },
    { id: "asistencia.cadena.rota", descripcion: "La verificación diaria encontró la cadena de marcas rota." },
    { id: "asistencia.correccion.propuesta", descripcion: "Se propuso corregir una marca; se avisa al trabajador." },
    { id: "asistencia.correccion.respondida", descripcion: "El trabajador aceptó u objetó una corrección, o venció el plazo." },
    { id: "asistencia.contingencia.propuesta", descripcion: "Se propuso una marca de contingencia; se avisa al trabajador." },
    { id: "asistencia.contingencia.respondida", descripcion: "El trabajador aceptó u objetó una marca de contingencia." },
    { id: "asistencia.alerta.sin_marca_inicio", descripcion: "Pasaron 30 minutos del inicio del turno sin marca de entrada." },
    { id: "asistencia.alerta.sin_marca_termino", descripcion: "El turno terminó sin marca de salida." },
    { id: "asistencia.alerta.descanso_insuficiente", descripcion: "El descanso entre dos jornadas fue menor al mínimo de su tipo de jornada (teletrabajo: 12 horas)." },
    { id: "asistencia.aviso.compensables", descripcion: "Aviso de horas compensables cada 30 días." },
    { id: "asistencia.alerta.sin_correo_personal", descripcion: "Un trabajador marcó y no tiene correo personal para recibir el comprobante." },
    { id: "asistencia.alerta.fuera_de_geocerca", descripcion: "Un trabajador marcó fuera del radio de geocerca de la instalación." },
    { id: "asistencia.alerta.limite_jornada", descripcion: "Un trabajador superó un límite de jornada (aviso 40 h, 42 h semanales, 12 h diarias o 2 h extra)." },
  ],
  capacidades,
  // Indicadores de gestión para el catálogo del núcleo (ADR-094, CAR-311).
  indicadores: indicadoresAsistencia,
});
