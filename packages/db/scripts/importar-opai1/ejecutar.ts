// Flujo del CLI con dependencias inyectables (los tests no tocan la base ni 1.0).
import { type Origen, leerArgumentos } from "./argumentos";
import type { EstadoDestino } from "./destino-tipos";
import type { LectorOrigen } from "./origen";
import { calcularPlan } from "./plan";
import { construirReporte, resumenLegible } from "./reporte";

export type Dependencias = {
  lector: (origen: Origen) => LectorOrigen;
  estadoDestino: (slug: string) => Promise<{ estado: EstadoDestino } | null>;
  escribir: (ruta: string, contenido: string) => Promise<void>;
  log: (texto: string) => void;
  error: (texto: string) => void;
};

/** Devuelve el código de salida. Nunca escribe en la base: solo el reporte, si se pide `--salida`. */
export async function ejecutar(argv: readonly string[], deps: Dependencias): Promise<number> {
  const leidos = leerArgumentos(argv);
  if (!leidos.ok) {
    deps.error(leidos.error);
    return leidos.codigo;
  }
  const { tenant, origen, salida } = leidos.args;
  const datos = await deps.lector(origen).leer();
  const destino = await deps.estadoDestino(tenant);
  if (!destino) {
    deps.error(`No existe el tenant «${tenant}».`);
    return 1;
  }
  const reporte = construirReporte(calcularPlan(datos, destino.estado), tenant);
  deps.log(resumenLegible(reporte));
  const json = `${JSON.stringify(reporte, null, 2)}\n`;
  if (salida) {
    await deps.escribir(salida, json);
    deps.log(`Reporte JSON en ${salida}`);
  } else deps.log(json);
  return 0;
}
