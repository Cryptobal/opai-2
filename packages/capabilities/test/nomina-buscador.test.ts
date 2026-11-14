// CAR-406: Remuneraciones aporta sus períodos a la búsqueda global (⌘K y `core.buscar`), sin montos.
// Solo con `nomina:read` y el módulo activo; la RLS de cada empresa se prueba en nomina-db.test.ts.
import { beforeEach, describe, expect, it } from "vitest";

import { buscadoresNomina, capacidadesDelNucleo, executeCapability, limpiarRegistro, registrarBuscadores, registrarCapacidades } from "../src";
import { limpiarBuscadores } from "../src/core/maestros/buscadores";
import { TENANT_DE_PRUEBA as T, contextoDePrueba } from "../src/testing";
import { semillaTenant } from "./semilla";

const f = (s: string) => new Date(`${s}T00:00:00.000Z`);
const periodo = (id: string, anio: number, mes: number, estado: string) =>
  ({ id, tenantId: T, anio, mes, estado, inicio: f(`${anio}-${String(mes).padStart(2, "0")}-01`), fin: f(`${anio}-${String(mes).padStart(2, "0")}-28`), cierrePrevisto: f(`${anio}-01-28`) });
const como = (rol: "owner" | "gerente" = "owner", modulos = ["nomina"]) =>
  contextoDePrueba({
    rol, portal: "erp", modulosActivos: modulos,
    semilla: { ...semillaTenant(), nominaPeriodo: [periodo("p-nov", 2026, 11, "abierto"), periodo("p-oct", 2026, 10, "pagado")] },
  });
type Salida = { otros: { grupo: string; items: { id: string; titulo: string; detalle: string | null; href: string }[] }[] };
const buscar = async (c: ReturnType<typeof como>, q: string) => {
  const r = await executeCapability(c.ctx, "core.buscar", { q });
  if (!r.ok) throw new Error(r.error.message);
  return (r.data as Salida).otros.find((g) => g.grupo === "remuneraciones")?.items ?? [];
};

beforeEach(() => {
  limpiarRegistro();
  limpiarBuscadores();
  registrarCapacidades(capacidadesDelNucleo);
  registrarBuscadores(buscadoresNomina);
});

describe("buscador de Remuneraciones (CAR-406)", () => {
  it("encuentra el período por mes, sin tildes ni mayúsculas, con estado y enlace", async () => {
    expect(await buscar(como(), "noviembre")).toEqual([
      { id: "p-nov", titulo: "Remuneraciones Noviembre 2026", detalle: "Abierto", href: "/remuneraciones/p-nov" },
    ]);
    expect((await buscar(como(), "OCTUBRE 2026")).map((i) => i.id)).toEqual(["p-oct"]);
    expect((await buscar(como(), "sueldos 2026")).map((i) => i.id)).toEqual(["p-nov", "p-oct"]);
  });

  it("sin permiso de nómina o con el módulo apagado no aporta nada", async () => {
    expect(await buscar(como("gerente"), "noviembre")).toEqual([]);
    expect(await buscar(como("owner", []), "noviembre")).toEqual([]);
  });
});
