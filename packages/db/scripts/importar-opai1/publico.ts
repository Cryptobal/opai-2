// API pública del importador 1.0 (consumida por la capacidad comercial.importar_1_0).
export { aplicarPlanEnTransaccion, type ResultadoAplicacion } from "./aplicar";
export { calcularPlan, type Plan } from "./plan";
export { OPCIONES_POR_DEFECTO, type OpcionesPlan, modulosDelPlan } from "./opciones";
export { construirReporte, type Reporte, resumenLegible } from "./reporte";
export { leerEstadoDestino, leerEstadoDestinoPorTenantId } from "./destino";
export {
  datosOpai1,
  validarDatos,
  type DatosOpai1,
  lectorApiOpai1,
  lectorContratoFixtures,
} from "./origen";
export { completarVacios, campoVacio, camposCompletarVacios } from "./completar-vacios";
export {
  cargarEquivalenciaEtapas,
  resolverEtapaNegocio,
  ETAPA_ADJUDICADO_2,
  ETAPA_PERDIDO_2,
} from "./etapas-equivalencia";
export { planNegocios, bloquearAplicarPorEtapas, type DatosNegocio } from "./negocios-plan";
export { conciliar, type ResumenConciliacion } from "./corrida/conciliar";
export { registrarCorrida, tenantImportacionCerrada, cerrarCorrida } from "./corrida/registrar-corrida";
export { revertirCorrida, type ResultadoRevertir } from "./corrida/revertir-corrida";
