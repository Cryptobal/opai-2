import { ajustesComercial } from "../src/comercial";
import { defineModule, registrarModulos } from "../src/module";

/** Registra solo los ajustes del módulo (ganar los lee sin respaldo); sus capacidades van aparte. */
export function registrarModuloComercial() {
  registrarModulos([
    defineModule({
      id: "comercial",
      nombre: "Comercial",
      version: "0.1.0",
      dependencias: [],
      permisos: [],
      navegacion: [],
      configuracion: ajustesComercial,
      eventos: [],
      capacidades: [],
    }),
  ]);
}
