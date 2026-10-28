import { ajustesComercial, capacidadesComercial, defineModule } from "@opai/capabilities";

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
  ],
  navegacion: [
    // Áreas de NAVEGACION.md §2: Negocios en Comercial; Contactos en Clientes, entre Cuentas (1) e
    // Instalaciones (2).
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
      area: "clientes",
      href: "/contactos",
      etiqueta: "Contactos",
      icono: "Users",
      orden: 1.5,
      permiso: "comercial:negocios.read",
    },
  ],
  // Ajustes del módulo (ADR-008), declarados en packages/capabilities/src/comercial/ajustes.ts.
  configuracion: ajustesComercial,
  eventos: [
    { id: "comercial.negocio.creado", descripcion: "Se creó un negocio." },
    {
      id: "comercial.negocio.actualizado",
      descripcion: "Cambiaron los datos o los vínculos de un negocio.",
    },
    { id: "comercial.negocio.etapa_cambiada", descripcion: "Un negocio cambió de etapa." },
    { id: "comercial.negocio.ganado", descripcion: "Un negocio se marcó como ganado." },
    { id: "comercial.negocio.perdido", descripcion: "Un negocio se marcó como perdido." },
    { id: "comercial.negocio.archivado", descripcion: "Un negocio se archivó o se desarchivó." },
  ],
  capacidades: capacidadesComercial,
});
