import type { Fila } from "./db-memoria-util";

type Delegado = {
  findUnique(a: { where: Fila }): Promise<Fila | null>;
  findMany(a: Record<string, unknown>): Promise<Fila[]>;
  update(a: { where: Fila; data: Fila }): Promise<Fila>;
};

/** Las tres operaciones de «módulos nuevos» sobre la base en memoria. */
export function modulosNuevosEnMemoria(delegado: (m: string) => Delegado) {
  return {
    tenantModulosNuevos: (id: string) => delegado("tenant").findUnique({ where: { id } }),
    tenantsConModulosNuevos: async () =>
      (await delegado("tenant").findMany({})).flatMap((f) => {
        const desde = f["activarModulosNuevosDesde"];
        return desde instanceof Date
          ? [{ id: f["id"] as string, activarModulosNuevosDesde: desde }]
          : [];
      }),
    fijarModulosNuevosDesde: (id: string, desde: Date | null) =>
      delegado("tenant").update({ where: { id }, data: { activarModulosNuevosDesde: desde } }),
  };
}
