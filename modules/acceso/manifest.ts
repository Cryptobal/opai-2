import { z } from "zod";

import { capacidadesAcceso, defineModule } from "@opai/capabilities";

/**
 * Manifest del módulo Control de acceso (ADR-003, CAR-78 · E4, CAR-474). Las capacidades viven en
 * packages/capabilities/src/acceso. Pantallas: la pestaña «Accesos» de cada instalación (sin entrada propia en el
 * menú: `/accesos` redirige a Instalaciones) y la portería de Terreno (`/terreno/porteria`).
 */
export const manifest = defineModule({
  id: "acceso",
  nombre: "Control de acceso",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    {
      id: "acceso:read",
      descripcion: "Ver los registros de acceso y quién está en sitio (documentos enmascarados)",
    },
    {
      id: "acceso:listas.manage",
      descripcion: "Gestionar las listas autorizada y bloqueada de una instalación",
    },
    {
      id: "acceso:registros.manage",
      descripcion:
        "Registrar salidas desde el ERP, anular registros y cerrar en bloque a quienes siguen en sitio",
    },
    {
      id: "acceso:prerregistros.create",
      descripcion:
        "Prerregistrar visitas con invitación QR y cancelar los prerregistros propios (o todos, si también gestiona registros)",
    },
    {
      id: "acceso:config.manage",
      descripcion:
        "Configurar el control de acceso de la empresa y de cada instalación: tipos de ingreso, formulario y reglas",
    },
    {
      id: "acceso:datos.ver_patente",
      descripcion: "Ver la patente completa de los vehículos registrados (acceso restringido)",
    },
  ],
  navegacion: [],
  configuracion: z.object({
    cliente_gestiona_listas: z.boolean().default(true).meta({
      etiqueta: "El cliente gestiona la lista de sus instalaciones",
      ayuda:
        "Los contactos con permiso del Portal Cliente agregan y quitan personas de las listas de sus instalaciones. Tu lista bloqueada siempre manda (R7, R12).",
      grupo: "Portal Cliente",
      ambito: "tenant",
      permiso: "acceso:config.manage",
      control: "switch",
    }),
    cliente_configura_porteria: z.boolean().default(false).meta({
      etiqueta: "El cliente puede configurar el formulario y el fondo de la portería",
      ayuda: "Apagado por defecto: solo tu empresa decide qué pide la portería y cómo se ve.",
      grupo: "Portal Cliente",
      ambito: "tenant",
      permiso: "acceso:config.manage",
      control: "switch",
    }),
  }),
  eventos: [
    { id: "acceso.entrada", descripcion: "Se registró una entrada en una instalación." },
    { id: "acceso.salida", descripcion: "Se registró la salida de un visitante." },
    { id: "acceso.intento_denegado", descripcion: "Alguien no pudo entrar (bloqueado, fuera de lista u otro motivo)." },
    {
      id: "acceso.ingreso_bloqueado_diferido",
      descripcion: "Al sincronizar, un ingreso sin red coincide con la lista bloqueada vigente (R22).",
    },
    { id: "acceso.reporte", descripcion: "Se envió el reporte periódico de accesos de una instalación." },
  ],
  capacidades: capacidadesAcceso,
});
