import { ajustesFinanzas } from "../src/finanzas";
import { defineModule, registrarModulos } from "../src/module";

/** Registra solo los ajustes del módulo (las pruebas con base los leen); sus capacidades van aparte. */
export function registrarModuloFinanzas() {
  registrarModulos([
    defineModule({
      id: "finanzas",
      nombre: "Finanzas",
      version: "0.1.0",
      dependencias: [],
      permisos: [],
      navegacion: [],
      configuracion: ajustesFinanzas,
      eventos: [],
      capacidades: [],
    }),
  ]);
}
