// Capacidades de CRM PR 2a (CAR-26): contacto en varias cuentas, actividad unificada y etiquetas.
import type { Capacidad } from "../../types";
import { cuentasFusionar } from "../maestros/cuentas-fusion";
import { actividadesCompletar, actividadesUpdate } from "./actividades-editar";
import { actividadesDelete } from "./actividades-eliminar";
import { actividadesCreate } from "./actividades-escritura";
import { actividadesTareas, actividadesTimeline } from "./actividades-lectura";
import { contactosCuentas, cuentasContactos } from "./contactos-cuentas";
import { contactosDesvincular } from "./contactos-desvincular";
import { contactosSetRoles, contactosVincular } from "./contactos-vinculos";
import { camposPersonalizadosCreate, camposPersonalizadosList } from "./campos-personalizados";
import { camposPersonalizadosUpdate } from "./campos-personalizados-editar";
import { camposValoresGet, camposValoresSet } from "./campos-valores";
import { etiquetasAsignar, etiquetasDeEntidad, etiquetasQuitar } from "./etiquetas-asignar";
import { etiquetasCreate, etiquetasList, etiquetasUpdate } from "./etiquetas";
import { etiquetasDelete } from "./etiquetas-eliminar";

export const capacidadesCrm: readonly Capacidad[] = [
  contactosCuentas,
  cuentasContactos,
  contactosVincular,
  contactosSetRoles,
  contactosDesvincular,
  actividadesCreate,
  actividadesUpdate,
  actividadesCompletar,
  actividadesDelete,
  actividadesTimeline,
  actividadesTareas,
  etiquetasList,
  etiquetasCreate,
  etiquetasUpdate,
  etiquetasDelete,
  etiquetasAsignar,
  etiquetasQuitar,
  etiquetasDeEntidad,
  camposPersonalizadosList,
  camposPersonalizadosCreate,
  camposPersonalizadosUpdate,
  cuentasFusionar,
];
