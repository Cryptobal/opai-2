// Ayudas de los tests de CPQ (Brief 10 · PR 10.1): semilla de Comercial con un negocio abierto (N1,
// instalación I1 de la cuenta CU) más un cargo, y contextos por rol o permisos.
import type { Rol } from "@opai/domain";

import {
  capacidadesComercial,
  capacidadesCpq,
  capacidadesDelNucleo,
  limpiarModulos,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { TENANT_DE_PRUEBA, contextoDePrueba } from "../src/testing";
import type { Alcance } from "../src/types";
import { CU, I1, N1, semillaComercial } from "./comercial-ayuda";

export { CU, I1, N1 };
export const CARGO = "0192f3a0-0000-7000-8000-00000000c0a1";
export const MODULOS = ["comercial", "cpq"];

export function registrarCpq() {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, ...capacidadesComercial, ...capacidadesCpq]);
}

export function semillaCpq() {
  const s = semillaComercial({ conNegocio: true });
  if (!("negocio" in s)) throw new Error("La semilla de Comercial no trae el negocio N1.");
  return {
    ...s,
    cargo: [{ id: CARGO, tenantId: TENANT_DE_PRUEBA, nombre: "Guardia", estado: "activo" }],
  };
}

type Opciones = {
  rol?: Rol;
  permisos?: readonly string[];
  alcance?: Alcance | null;
  semilla?: ReturnType<typeof semillaCpq>;
};

export function ctxCpq(o: Opciones = {}) {
  return contextoDePrueba({
    ...(o.permisos ? { permisos: o.permisos } : { rol: o.rol ?? "owner" }),
    portal: "erp",
    modulosActivos: MODULOS,
    alcance: o.alcance ?? null,
    semilla: o.semilla ?? semillaCpq(),
  });
}
