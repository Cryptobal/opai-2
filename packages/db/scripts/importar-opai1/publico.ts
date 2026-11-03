// API pública del importador 1.0 (consumida por la capacidad comercial.importar_1_0).
export { aplicarPlanEnTransaccion, type ResultadoAplicacion } from "./aplicar";
export { calcularPlan, type Plan } from "./plan";
export { OPCIONES_POR_DEFECTO, type OpcionesPlan, modulosDelPlan } from "./opciones";
export { construirReporte, type Reporte, resumenLegible } from "./reporte";
export { leerEstadoDestino, leerEstadoDestinoPorTenantId } from "./destino";
export { datosOpai1, validarDatos, type DatosOpai1 } from "./origen";
