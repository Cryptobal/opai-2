import type { Capacidad } from "../../types";
import { buscar } from "./buscar";
import { cargosCreate, cargosGet, cargosList, cargosSetActivo, cargosUpdate } from "./cargos";
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
import { puestosCreate, puestosGet, puestosList, puestosSetEstado, puestosUpdate } from "./puestos";
import { vinculosCreate, vinculosList, vinculosTerminar, vinculosUpdate } from "./vinculos";

/** Maestros del núcleo (Brief 02, sesión B, bloque 6): una sola declaración para UI, API y MCP. */
export const capacidadesMaestros: readonly Capacidad[] = [
  cuentasList,
  cuentasGet,
  cuentasCreate,
  cuentasUpdate,
  cuentasSetEstado,
  cuentasArchive,
  cuentasSetRepresentantes,
  contactosList,
  contactosGet,
  contactosCreate,
  contactosUpdate,
  contactosArchive,
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
  vinculosList,
  vinculosCreate,
  vinculosUpdate,
  vinculosTerminar,
  cargosList,
  cargosGet,
  cargosCreate,
  cargosUpdate,
  cargosSetActivo,
  estructurasList,
  estructurasGet,
  estructurasCreate,
  estructurasAnular,
  estructurasEfectiva,
  buscar,
];
