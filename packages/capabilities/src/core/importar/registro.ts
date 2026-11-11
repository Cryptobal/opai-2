import { noEncontrado } from "../../errores";
import { importadorContactos } from "./contactos";
import { importadorCuentas } from "./cuentas";
import { importadorInstalaciones } from "./instalaciones";
import { importadorNegocios } from "./negocios";
import type { Datos, Importador } from "./tipos";

/** Vista sin el tipo de datos propio de cada importador, para tratarlos a todos igual en el motor. */
function generico<D extends Datos>(i: Importador<D>): Importador<Datos> {
  return {
    def: i.def,
    entidad: i.entidad,
    permiso: i.permiso,
    ...(i.modulo ? { modulo: i.modulo } : {}),
    actualizables: i.actualizables,
    ...(i.sinDato ? { sinDato: i.sinDato } : {}),
    planificar: (ctx, filas, o) => i.planificar(ctx, filas, o),
    crear: (tx, ctx, datos) => i.crear(tx, ctx, datos as D),
    actualizar: (tx, id, cambios) => i.actualizar(tx, id, cambios as Partial<D>),
    actuales: (tx, ids) => i.actuales(tx, ids),
    bloqueos: (tx, ids) => i.bloqueos(tx, ids),
    borrar: (tx, ids) => i.borrar(tx, ids),
  };
}

/**
 * Importadores disponibles, en el orden en que conviene cargarlos (una cuenta antes que sus contactos).
 * Para sumar el de otro módulo (Personas, Finanzas): implementar `Importador` y agregarlo aquí.
 */
export const IMPORTADORES: readonly Importador<Datos>[] = [
  generico(importadorCuentas),
  generico(importadorContactos),
  generico(importadorInstalaciones),
  generico(importadorNegocios),
];

export const IDS_IMPORTADORES = ["cuentas", "contactos", "instalaciones", "negocios"] as const;

export function importadorDe(id: string): Importador<Datos> {
  const i = IMPORTADORES.find((x) => x.def.id === id);
  if (!i) throw noEncontrado("El importador");
  return i;
}

export const importadorDeEntidad = (entidad: string) => IMPORTADORES.find((x) => x.entidad === entidad);
