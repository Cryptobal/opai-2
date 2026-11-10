import { vinculosPrevisualizar } from "./vinculos-preview";
import { estructurasPanel } from "./estructuras-panel";
import type { Capacidad } from "../../types";
import { buscar } from "./buscar";
import { cargosCreate, cargosGet, cargosList, cargosSetActivo, cargosUpdate } from "./cargos";
import { contactosRestaurar } from "./contactos-restaurar";
import {
  contactosArchive,
  contactosCreate,
  contactosGet,
  contactosList,
  contactosUpdate,
} from "./contactos";
import { cuentasGet, cuentasList } from "./cuentas";
import { cuentasCreate, cuentasUpdate } from "./cuentas-escritura";
import { cuentasArchive, cuentasSetEstado, cuentasSetRepresentantes } from "./cuentas-estado";
import { capacidadesReferencias } from "./referencias";
import { cuentasAplicarSii, cuentasConsultarSii, cuentasFacturable } from "./cuentas-sii";
import { trabajoConsultarContribuyenteSii, trabajoPurgarCacheSii } from "./cuentas-sii-trabajo";
import { estructurasGet, estructurasList } from "./estructuras";
import { estructurasEfectiva } from "./estructuras-efectiva";
import { estructurasAnular, estructurasCreate } from "./estructuras-escritura";
import {
  funcionesCreate,
  funcionesGet,
  funcionesList,
  funcionesSetActivo,
  funcionesUpdate,
} from "./funciones";
import {
  patronesCreate,
  patronesGet,
  patronesList,
  patronesSetActivo,
  patronesUpdate,
} from "./patrones";
import { instalacionesGet, instalacionesList } from "./instalaciones";
import { instalacionesCreate, instalacionesUpdate } from "./instalaciones-escritura";
import { instalacionesArchive, instalacionesSetEstado } from "./instalaciones-estado";
import { personasGet, personasList } from "./personas";
import { personasCreate, personasUpdate } from "./personas-escritura";
import {
  personasArchive,
  personasBloquear,
  personasDesbloquear,
  personasVincularUsuario,
} from "./personas-estado";
import { trabajoPersonasNoRecontratarVencer } from "./personas-no-recontratar-limpieza";
import {
  personasMarcarNoRecontratar,
  personasNoRecontratarVer,
  personasQuitarNoRecontratar,
} from "./personas-no-recontratar";
import {
  personasPrevisionActualizar,
  personasPrevisionVer,
} from "./personas-prevision";
import { personasPagoSolicitarCambio, personasPagoVer } from "./personas-pago";
import {
  personasPagoAprobarCambio,
  personasPagoRechazarCambio,
} from "./personas-pago-aprobacion";
import { personasLaboralActualizar, personasLaboralVer } from "./personas-laboral";
import { cargosMontosPorInstalacion } from "./cargos-montos-instalacion";
import { puestosCreate, puestosUpdate } from "./puestos-escritura";
import { puestosSetEstado } from "./puestos-estado";
import { capacidadesTerreno } from "../terreno";
import { puestosGet, puestosList } from "./puestos";
import { vinculosCreate, vinculosList, vinculosTerminar, vinculosUpdate } from "./vinculos";

/** Maestros del núcleo (Brief 02, sesión B, bloque 6): una sola declaración para UI, API y MCP. */
export const capacidadesMaestros: readonly Capacidad[] = [
  ...capacidadesTerreno,
  cuentasList,
  cuentasGet,
  cuentasCreate,
  cuentasUpdate,
  cuentasSetEstado,
  cuentasArchive,
  cuentasSetRepresentantes,
  ...capacidadesReferencias,
  cuentasConsultarSii,
  cuentasFacturable,
  cuentasAplicarSii,
  contactosList,
  contactosGet,
  contactosCreate,
  contactosUpdate,
  contactosArchive,
  contactosRestaurar,
  instalacionesList,
  instalacionesGet,
  instalacionesCreate,
  instalacionesUpdate,
  instalacionesSetEstado,
  instalacionesArchive,
  puestosList,
  puestosGet,
  puestosCreate,
  puestosUpdate,
  puestosSetEstado,
  patronesList,
  patronesGet,
  patronesCreate,
  patronesUpdate,
  patronesSetActivo,
  funcionesList,
  funcionesGet,
  funcionesCreate,
  funcionesUpdate,
  funcionesSetActivo,
  personasList,
  personasGet,
  personasCreate,
  personasUpdate,
  personasBloquear,
  personasDesbloquear,
  personasArchive,
  personasVincularUsuario,
  personasNoRecontratarVer,
  personasMarcarNoRecontratar,
  personasQuitarNoRecontratar,
  personasPrevisionVer,
  personasPrevisionActualizar,
  personasPagoVer,
  personasPagoSolicitarCambio,
  personasPagoAprobarCambio,
  personasPagoRechazarCambio,
  personasLaboralVer,
  personasLaboralActualizar,
  vinculosPrevisualizar,
  vinculosList,
  vinculosCreate,
  vinculosUpdate,
  vinculosTerminar,
  cargosList,
  cargosGet,
  cargosCreate,
  cargosUpdate,
  cargosSetActivo,
  cargosMontosPorInstalacion,
  estructurasPanel,
  estructurasList,
  estructurasGet,
  estructurasCreate,
  estructurasAnular,
  estructurasEfectiva,
  buscar,
];

/** Trabajos diarios de los maestros, registrados por el borde (`apps/web/lib/registro.ts`). */
export const trabajosMaestros = [trabajoPersonasNoRecontratarVencer, trabajoConsultarContribuyenteSii, trabajoPurgarCacheSii];
