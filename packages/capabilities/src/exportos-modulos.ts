export { ajustesComercial, buscadoresComercial, capacidadesComercial } from "./comercial";
export { hechosComercial } from "./comercial/hechos-gestion";
export { defineHecho, type HechoGestion } from "./hechos-gestion";
export { indicadoresComercial } from "./comercial/indicadores-gestion";
export { consumidorSeguimientoCierre, trabajosComercial } from "./comercial/seguimiento-trabajo";
export {
  capacidadesAcceso,
  trabajoCierreAutomatico,
  trabajoReportesAcceso,
  trabajoRetencionAcceso,
} from "./acceso";
export { ajustesRondas, capacidadesRondas, indicadoresRondas, trabajoVigilanciaRondas } from "./rondas";
export { ajustesNomina, buscadoresNomina, capacidadesNomina } from "./nomina";
export {
  ajustesPauta,
  ausenteSinJustificar,
  buscadoresPauta,
  capacidadesPauta,
  consumidorPautaCambio,
  consumidorPautaPublicada,
  diasConTurno,
  type DiaConTurno,
  fuentesAprobacionTurnosExtra,
  indicadoresPauta,
  SIGLAS_NEUTRAS,
  toleranciaAtrasoS,
} from "./pauta";
export {
  ajustesDesempeno,
  capacidadesDesempeno,
  consumidoresDesempeno,
  PERMISOS_DESEMPENO,
  trabajosDesempeno,
} from "./desempeno";
export { ajustesPortalCliente, capacidadesPortalCliente } from "./portal-cliente";
export { accesoDelActor } from "./portal-cliente/comun";
export {
  asegurarAccesoContacto,
  type EstadoAccesoContacto,
  type ResultadoAccesoContacto,
} from "./portal-cliente/acceso-contacto";
export { registrarPropuestaEnviada, type ResultadoPropuesta } from "./portal-cliente/propuesta-vigente";
export { propuestaAlAceptar } from "./portal-cliente/propuesta-al-aceptar";
export {
  ajustesFinanzas,
  trabajosFinanzas,
  capacidadesFinanzas,
  ventasProgramadasPorPeriodo,
  logoDeMarca,
} from "./finanzas";