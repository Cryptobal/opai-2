import { describe, expect, it, vi } from "vitest";
import { dbEnMemoria } from "@opai/capabilities/testing";

vi.mock("@opai/capabilities", () => ({
  noEncontrado: (nombre: string) => new Error(nombre),
  reglaDeNegocio: (mensaje: string) => new Error(mensaje),
}));

import type { CopiaMovimiento } from "./descartes-copia";
import { planRestaurar } from "./descartes-plan";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const copia = (n: number, cambios: Partial<CopiaMovimiento> = {}): CopiaMovimiento => ({
  id: id(n), cartolaId: null, fecha: `2026-11-0${n}T00:00:00.000Z`, monto: "1000",
  glosa: "Transferencia ficticia", referencia: null, sucursal: null, saldoDespues: null,
  claveDedupe: `clave-${n}`, idExterno: `externo-${n}`, estado: "pendiente", origen: "web4leads",
  createdAt: "2026-11-01T00:00:00.000Z", ...cambios,
});

async function plan(copias: CopiaMovimiento[], vivos: CopiaMovimiento[]) {
  const { tx } = dbEnMemoria({
    movimientoBancarioDescarte: [{
      id: id(99), cuentaId: id(98), restauradoEn: null, movimientos: copias,
    }],
    movimientoBancario: vivos.map((v) => ({
      ...v, cuentaId: id(98), fecha: new Date(v.fecha), monto: BigInt(v.monto),
    })),
  });
  return planRestaurar(tx, id(99));
}

describe("planRestaurar: cada movimiento vivo representa una sola copia", () => {
  it.each(["id", "claveDedupe", "idExterno"] as const)("reserva el match exacto por %s antes de buscar parecidos", async (campo) => {
    const a = copia(1), b = copia(2), c = copia(3, { monto: "2500" });
    const vivo = copia(8, { fecha: a.fecha, [campo]: a[campo] });
    const p = await plan([a, b, c], [vivo]);
    expect(p.nuevos.map((m) => m.id)).toEqual([b.id, c.id]);
    expect(p.yaPresentes).toBe(1);
  });

  it("reserva todos los exactos aunque la copia parecida venga primero", async () => {
    const a = copia(1), b = copia(2);
    const p = await plan([b, a], [a]);
    expect(p.nuevos.map((m) => m.id)).toEqual([b.id]);
    expect(p.yaPresentes).toBe(1);
  });

  it("mantiene el cruce aproximado uno a uno para los vivos no consumidos", async () => {
    const a = copia(1), b = copia(2), c = copia(3, { monto: "2500" });
    const p = await plan([a, b, c], [a, copia(8, { fecha: b.fecha })]);
    expect(p.nuevos.map((m) => m.id)).toEqual([c.id]);
    expect(p.yaPresentes).toBe(2);
  });

  it.each([false, true])("rechaza identidades exactas contradictorias sin depender del orden (invertido=%s)", async (invertido) => {
    const a = copia(1), b = copia(2, { monto: "2000", glosa: "Otro movimiento ficticio" });
    const vivos = [
      copia(8, { id: a.id, claveDedupe: b.claveDedupe, monto: "9000" }),
      copia(9, { claveDedupe: a.claveDedupe, monto: "8000" }),
    ];
    await expect(plan(invertido ? [b, a] : [a, b], vivos)).rejects.toThrow("identificadores contradictorios");
  });

  it.each(["claveDedupe", "idExterno"] as const)("rechaza un vivo compartido por id y %s en ambos órdenes", async (campo) => {
    const a = copia(1), b = copia(2, { monto: "2000" });
    const vivo = copia(8, { id: a.id, [campo]: b[campo], monto: "9000" });
    for (const orden of [[a, b], [b, a]]) {
      await expect(plan(orden, [vivo])).rejects.toThrow("identificadores contradictorios");
    }
  });
});
