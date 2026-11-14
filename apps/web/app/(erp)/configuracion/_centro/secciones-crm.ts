import { ListPlus } from "lucide-react";

import { PERMISOS_CORE } from "@opai/domain";

import { seccion as s, type Seccion } from "./seccion-tipo";

/** Ajustes de las fichas de clientes (CAR-27): campos propios de cuentas, contactos y negocios. */
export const SECCIONES_CRM: readonly Seccion[] = [
  s({
    id: "campos-personalizados",
    titulo: "Campos personalizados",
    descripcion: "Campos propios en las fichas de cuentas, contactos y negocios",
    corta: "Campos propios en las fichas",
    icono: ListPlus,
    grupo: "operacion",
    permiso: PERMISOS_CORE.camposConfig,
  }),
];
