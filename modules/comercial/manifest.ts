import {
  ajustesComercial,
  capacidadesComercial,
  defineModule,
  hechosComercial,
} from "@opai/capabilities";

/**
 * Manifest del módulo Comercial (ADR-003, Brief 07 · PR 1). El núcleo deriva navegación, permisos,
 * configuración, eventos y herramientas MCP desde aquí. Las capacidades viven en
 * packages/capabilities/src/comercial y se listan como `capacidadesComercial`.
 */
export const manifest = defineModule({
  id: "comercial",
  nombre: "Comercial",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: "comercial:negocios.read", descripcion: "Ver negocios y el embudo" },
    {
      id: "comercial:negocios.manage",
      descripcion: "Crear, editar, mover, ganar y perder negocios",
    },
    {
      id: "comercial:config.manage",
      descripcion: "Configurar el embudo y los catálogos del módulo",
    },
    {
      id: "comercial:solicitudes.read",
      descripcion: "Ver la bandeja de solicitudes (leads) y su detalle",
    },
    {
      id: "comercial:solicitudes.manage",
      descripcion: "Registrar, derivar, descartar y convertir solicitudes en negocios",
    },
    {
      id: "comercial:canales.manage",
      descripcion: "Configurar los canales de entrada de solicitudes",
    },
  ],
  navegacion: [
    // Áreas de NAVEGACION.md §2: Negocios en Comercial; Contactos en Clientes, entre Cuentas (1) e
    // Instalaciones (2).
    // Solicitudes (Leads): la bandeja va antes de Negocios en el área Comercial.
    {
      portal: "erp",
      area: "comercial",
      href: "/solicitudes",
      etiqueta: "Solicitudes",
      icono: "NotebookPen",
      orden: 1,
      permiso: "comercial:solicitudes.read",
    },
    {
      portal: "erp",
      area: "comercial",
      href: "/negocios",
      etiqueta: "Negocios",
      icono: "Briefcase",
      orden: 2,
      permiso: "comercial:negocios.read",
    },
    {
      portal: "erp",
      area: "comercial",
      href: "/tareas",
      etiqueta: "Mis tareas",
      icono: "ListChecks",
      orden: 3,
      permiso: "comercial:negocios.read",
    },
    {
      portal: "erp",
      area: "comercial",
      href: "/negocios/seguimiento",
      etiqueta: "Pendientes",
      icono: "BellRing",
      orden: 3,
      permiso: "comercial:negocios.read",
    },
    {
      portal: "erp",
      area: "comercial",
      href: "/contactos",
      etiqueta: "Contactos",
      icono: "ContactRound",
      orden: 5,
      permiso: "comercial:negocios.read",
    },
  ],
  // Ajustes del módulo (ADR-008), declarados en packages/capabilities/src/comercial/ajustes.ts.
  configuracion: ajustesComercial,
  eventos: [
    { id: "comercial.seguimiento.iniciado", descripcion: "Se inició el seguimiento de un negocio." },
    { id: "comercial.seguimiento.pausado", descripcion: "Un seguimiento quedó pausado." },
    { id: "comercial.seguimiento.reanudado", descripcion: "Un seguimiento se reanudó." },
    { id: "comercial.seguimiento.cancelado", descripcion: "Un seguimiento se canceló." },
    { id: "comercial.seguimiento.terminado", descripcion: "Un seguimiento terminó." },
    { id: "comercial.seguimiento.cliente_respondio", descripcion: "El cliente respondió y el seguimiento se detuvo." },
    { id: "comercial.seguimiento.cierre_aplicado", descripcion: "OPAI cerró un negocio porque el plan terminó sin respuesta del cliente." },
    { id: "comercial.seguimiento.paso_registrado", descripcion: "Se hizo, envió, omitió o pospuso un paso del seguimiento." },
    { id: "comercial.seguimiento.plan_actualizado", descripcion: "Se creó o cambió un plan de seguimiento." },
    { id: "comercial.negocio.creado", descripcion: "Se creó un negocio." },
    {
      id: "comercial.negocio.actualizado",
      descripcion: "Cambiaron los datos o los vínculos de un negocio.",
    },
    { id: "comercial.negocio.etapa_cambiada", descripcion: "Un negocio cambió de etapa." },
    { id: "comercial.negocio.ganado", descripcion: "Un negocio se marcó como ganado." },
    { id: "comercial.negocio.perdido", descripcion: "Un negocio se marcó como perdido." },
    { id: "comercial.negocio.archivado", descripcion: "Un negocio se archivó o se desarchivó." },
    { id: "comercial.solicitud.creada", descripcion: "Entró una solicitud a la bandeja." },
    {
      id: "comercial.solicitud.enriquecida",
      descripcion: "Un agente enriqueció los datos propuestos de una solicitud.",
    },
    { id: "comercial.solicitud.derivada", descripcion: "Una solicitud pasó a revisión." },
    { id: "comercial.solicitud.descartada", descripcion: "Se descartó una solicitud." },
    { id: "comercial.solicitud.reabierta", descripcion: "Se reabrió una solicitud descartada." },
    { id: "comercial.solicitud.duplicada", descripcion: "Se marcó una solicitud como duplicada." },
    { id: "comercial.solicitud.convertida", descripcion: "Una solicitud se convirtió en negocio." },
    {
      id: "comercial.canal.actualizado",
      descripcion: "Cambió la configuración de un canal de entrada.",
    },
    {
      id: "comercial.embudo.actualizado",
      descripcion: "Se agregó o reordenó una etapa del embudo de ventas.",
    },
  ],
  capacidades: capacidadesComercial,
  // Hechos que la empresa puede usar para armar indicadores propios (CAR-313, ADR-094 §8).
  hechos: hechosComercial,
});
