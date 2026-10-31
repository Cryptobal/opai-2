import { ajustesPortalCliente, capacidadesPortalCliente, defineModule } from "@opai/capabilities";

/**
 * Manifest del módulo Portal Cliente (ADR-003, Brief 16 · PR 1). El núcleo deriva navegación,
 * permisos, configuración, eventos y herramientas MCP desde aquí. Las capacidades viven en
 * packages/capabilities/src/portal-cliente. El acceso (cuenta + instalaciones habilitadas) y la
 * configuración por cuenta son lo central del PR 1; las secciones con datos (marcaciones, libro de
 * novedades, supervisión, accesos operativos, cotizaciones) llegan en el PR 2 con sus dependencias.
 * La entrada «Portal Cliente» del ERP vive en la ficha de la cuenta y en Configuración, sin entrada
 * propia de navegación.
 */
export const manifest = defineModule({
  id: "portal_cliente",
  nombre: "Portal Cliente",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: "portal_cliente:read", descripcion: "Usar el Portal Cliente como contacto de una cuenta" },
    {
      id: "portal_cliente:accesos.read",
      descripcion: "Ver quién tiene acceso al Portal Cliente de una cuenta",
    },
    {
      id: "portal_cliente:accesos.manage",
      descripcion: "Vincular contactos a una cuenta y fijar las instalaciones que ven",
    },
    { id: "portal_cliente:config.read", descripcion: "Ver la configuración del Portal Cliente" },
    {
      id: "portal_cliente:config.manage",
      descripcion: "Configurar qué ve el cliente en su portal (Ley 21.719)",
    },
  ],
  navegacion: [],
  configuracion: ajustesPortalCliente,
  eventos: [
    { id: "portal_cliente.acceso.vinculado", descripcion: "Se vinculó un contacto a la cuenta de un cliente." },
    { id: "portal_cliente.acceso.actualizado", descripcion: "Cambió el estado o las instalaciones de un acceso al portal." },
    { id: "portal_cliente.config.actualizada", descripcion: "Cambió la configuración del Portal Cliente de una cuenta." },
  ],
  capacidades: capacidadesPortalCliente,
});
