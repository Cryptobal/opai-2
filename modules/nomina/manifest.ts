import { ajustesNomina, capacidadesNomina, defineModule } from "@opai/capabilities";

/**
 * Manifest del módulo Nómina (ADR-003, Brief 25). El núcleo deriva navegación, permisos,
 * configuración, eventos y herramientas MCP desde aquí. Las capacidades viven en
 * packages/capabilities/src/nomina. PR 1: períodos, novedades, préstamos con plan de cuotas (B3),
 * anticipo quincenal (B2), conceptos y calendario de obligaciones; sin cálculo de liquidaciones (el
 * motor de sueldos aún no existe). La configuración se renderiza en Configuración › Módulos › Nómina
 * (ajustes + pestaña «Conceptos»); el módulo no tiene página de configuración propia (ADR-018).
 * Permisos: el bloqueo financiero de permisos.ts (`nomina:*`) deja fuera a gerente, supervisor y
 * viewer; los roles nuevos nacen sin acceso a nómina (decisión de Carlos, 30-oct-2026).
 */
export const manifest = defineModule({
  id: "nomina",
  nombre: "Nómina",
  version: "0.1.0",
  dependencias: [],
  permisos: [
    { id: "nomina:read", descripcion: "Ver períodos de remuneraciones, conceptos y calendario de obligaciones" },
    { id: "nomina:periodos.manage", descripcion: "Abrir períodos, pasarlos a revisión, cerrarlos y reabrirlos" },
    { id: "nomina:periodos.pagar", descripcion: "Marcar un período cerrado como pagado (acto final)" },
    { id: "nomina:novedades.read", descripcion: "Ver novedades de remuneraciones por persona (dato sensible)" },
    { id: "nomina:novedades.manage", descripcion: "Registrar, cargar masivamente y anular novedades del período" },
    { id: "nomina:prestamos.read", descripcion: "Ver préstamos a trabajadores y sus planes de cuotas (dato sensible)" },
    { id: "nomina:prestamos.manage", descripcion: "Crear y cancelar préstamos y aplicar sus cuotas al período" },
    { id: "nomina:anticipos.manage", descripcion: "Definir las reglas de anticipo quincenal y generar los anticipos" },
    { id: "nomina:config.manage", descripcion: "Configurar conceptos de haberes y descuentos y los ajustes de Nómina" },
    { id: "nomina:obligaciones.manage", descripcion: "Gestionar el calendario de obligaciones (LRE, Previred, SII)" },
  ],
  navegacion: [
    {
      portal: "erp",
      area: "personas",
      href: "/nomina",
      etiqueta: "Nómina",
      icono: "Wallet",
      orden: 5,
      permiso: "nomina:read",
    },
  ],
  configuracion: ajustesNomina,
  eventos: [
    { id: "nomina.periodo.abierto", descripcion: "Se abrió un período de remuneraciones." },
    { id: "nomina.periodo.en_revision", descripcion: "Un período pasó a revisión." },
    { id: "nomina.periodo.cerrado", descripcion: "Se cerró un período de remuneraciones." },
    { id: "nomina.periodo.reabierto", descripcion: "Un período volvió a una etapa anterior, con motivo." },
    { id: "nomina.periodo.pagado", descripcion: "Se marcó como pagado un período de remuneraciones." },
    { id: "nomina.novedad.registrada", descripcion: "Se registraron novedades en un período." },
    { id: "nomina.novedad.anulada", descripcion: "Se anuló una novedad del período." },
    { id: "nomina.prestamo.creado", descripcion: "Se creó un préstamo con su plan de cuotas." },
    { id: "nomina.prestamo.cancelado", descripcion: "Se canceló un préstamo; sus cuotas pendientes se condonaron." },
  ],
  capacidades: capacidadesNomina,
});
