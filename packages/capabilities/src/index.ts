export { capacidadesDelNucleo, consumidoresDelNucleo, trabajosDelNucleo } from "./core";
export { ajustesComercial, capacidadesComercial } from "./comercial";
export { consumidorSeguimientoCierre, trabajosComercial } from "./comercial/seguimiento-trabajo";
export { ajustesRondas, capacidadesRondas } from "./rondas";
export { ajustesNomina, capacidadesNomina } from "./nomina";
export { capacidadesPauta } from "./pauta";
export { ajustesPortalCliente, capacidadesPortalCliente } from "./portal-cliente";
export { ajustesFinanzas, trabajosFinanzas, capacidadesFinanzas } from "./finanzas";
export { calcularEstadoCobro, registrarCobroDocumento, sincronizarCobroDocumento, validarDocumentoCobroBanco, validarDocumentoCompraBanco, documentoEmitidoConciliable } from "./finanzas/cobros";
export { ajuste, defineAjustes, type CampoAjuste, type MetaAjuste } from "./core/config";
export {
  cifradoDeCampos,
  estaCifrado,
  type CifradoDeCampos,
} from "./core/cumplimiento/cifrado-campos";
export { enviarCorreo } from "./core/comunicaciones";
export { generarApiKey, hashApiKey, slugDeApiKey } from "./core/apikey-formato";
export { plataformaVigente } from "./core/apikey-scopes";
export { catalogoPermisos } from "./core/me";
export {
  auditoriaEnDb,
  autorizador,
  crearContexto,
  type ParametrosContexto,
  SIN_TENANT,
  medidorEnDb,
} from "./contexto";
export { defineCapability } from "./define";
export { conflicto, ErrorCapacidad, noEncontrado, prohibido, reglaDeNegocio } from "./errores";
export { aplicarEtapa } from "./comercial/transiciones-util";
export { fijarFuenteContribuyente } from "./core/maestros/cuentas-sii-fuente";
export { planGanar, efectosGanarSchema, type EfectosGanar } from "./comercial/ganar-efectos";
export { sha256 } from "./core/comun";
export { uuid7 } from "./core/documentos/uuid7";
export { executeCapability } from "./execute";
export {
  limpiarRegistro,
  listarCapacidades,
  obtenerCapacidad,
  registrarCapacidades,
} from "./registry";
export type * from "./types";

export {
  defineModule,
  type EntradaNavegacion,
  type EventoDeDominio,
  limpiarModulos,
  listarModulos,
  type ModuleManifest,
  obtenerModulo,
  type Permiso,
  registrarModulos,
} from "./module";
export { portalesDe } from "./autorizacion";
export {
  type Consumidor,
  consumidoresDe,
  defineConsumidor,
  type EventoPublicado,
  limpiarConsumidores,
  registrarConsumidores,
} from "./eventos/consumidores";
export { despacharPendientes, MAX_INTENTOS_EVENTO } from "./eventos/despachar";
export { catalogoDeEventos, EVENTOS_CORE, eventoDeclarado } from "./eventos/catalogo";
export {
  defineTrabajo,
  type DefinicionTrabajo,
  limpiarTrabajos,
  listarTrabajos,
  obtenerTrabajo,
  registrarTrabajos,
  type Trabajo,
} from "./trabajos/registro";
export {
  type ColaTrabajos,
  ejecutarTrabajos,
  esperaReintento,
  programarCapturaSii,
  programarPeriodicos,
  programarHorarios,
} from "./trabajos/runner";
export { type ComprobanteNuevo, emitirComprobante, slugDeComprobante } from "./comprobantes";
export { camposExternos, externo } from "./externo";
export { correoDe, geoDe, iaDe } from "./integraciones/adaptadores";
export { ErrorRespaldoIa } from "./integraciones/ia-respaldo";
export { comoAgenteInterno } from "./agentes/interno";
export {
  iaElegidaDelAgente,
  modelosDelAgente,
  type ModeloAgente,
} from "./integraciones/ia-modelos";
export { credencialDe } from "./integraciones/resolver";
export { MANUALES } from "./manuales";

export type { PanelSueldo } from "./core/maestros/estructuras-panel-schema";
export { noRecontratarHabilitadaAhora } from "./core/maestros/personas-no-recontratar-vigencia";
export {
  clavesFaltantes,
  mutualAdicionalTenant,
  publicacionesParaFecha,
} from "./core/remuneraciones";
