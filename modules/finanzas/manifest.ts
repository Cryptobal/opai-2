import { ajustesFinanzas, capacidadesFinanzas, defineModule } from "@opai/capabilities";

/**
 * Manifest del módulo Finanzas (ADR-003, Brief 23). El núcleo deriva navegación, permisos,
 * configuración, eventos y herramientas MCP desde aquí. Las capacidades viven en
 * packages/capabilities/src/finanzas. PR 1: plan de cuentas, centros de costo, proveedores y libro de
 * compras. Conciliación, reglas, asientos y estados financieros llegan en los PR siguientes.
 * Finanzas es bloqueo financiero (ADR-016): solo owner y admin; gerente, supervisor y viewer no la ven.
 */
export const manifest = defineModule({
  id: "finanzas",
  nombre: "Finanzas",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: "finanzas:read", descripcion: "Ver el libro de compras, los proveedores, el plan de cuentas y los centros de costo" },
    { id: "finanzas:compras.manage", descripcion: "Registrar, importar y asignar centro de costo a documentos recibidos" },
    { id: "finanzas:proveedores.manage", descripcion: "Crear y editar proveedores y sus valores por defecto" },
    { id: "finanzas:plan.manage", descripcion: "Cargar y editar el plan de cuentas" },
  ],
  navegacion: [
    {
      portal: "erp",
      area: "finanzas",
      href: "/finanzas/compras",
      etiqueta: "Compras",
      icono: "FileText",
      orden: 4,
      permiso: "finanzas:read",
    },
    {
      portal: "erp",
      area: "finanzas",
      href: "/finanzas/plan-de-cuentas",
      etiqueta: "Plan de cuentas",
      icono: "Briefcase",
      orden: 6,
      permiso: "finanzas:read",
    },
  ],
  configuracion: ajustesFinanzas,
  eventos: [
    { id: "finanzas.plan.inicializado", descripcion: "Se cargó la plantilla chilena base del plan de cuentas." },
    { id: "finanzas.plan.cuenta_creada", descripcion: "Se creó una cuenta en el plan de cuentas." },
    { id: "finanzas.plan.cuenta_actualizada", descripcion: "Cambió una cuenta del plan de cuentas." },
    { id: "finanzas.proveedor.creado", descripcion: "Se creó un proveedor." },
    { id: "finanzas.proveedor.actualizado", descripcion: "Cambiaron los datos de un proveedor." },
    { id: "finanzas.compra.registrada", descripcion: "Se registró un documento recibido en el libro de compras." },
    { id: "finanzas.compras.importadas", descripcion: "Se importó un lote de documentos recibidos." },
    { id: "finanzas.compras.centro_asignado", descripcion: "Se asignó un centro de costo a documentos del libro de compras." },
  ],
  capacidades: capacidadesFinanzas,
});
