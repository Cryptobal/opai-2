// CAR-528: buscador de «ver como». Solo owner y admin; cada portal lista solo a quien se puede ver.
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { M2, semillaTenant, U2 } from "./semilla";

const T = TENANT_DE_PRUEBA;
const INST_CON_EQUIPO = "0192f3a0-0000-7000-8000-00000000d001";
const INST_SIN_EQUIPO = "0192f3a0-0000-7000-8000-00000000d002";
const CUENTA = "0192f3a0-0000-7000-8000-00000000d003";
const ACCESO = "0192f3a0-0000-7000-8000-00000000d004";
const BETO = { id: U2, nombre: "Beto", email: "beto@prueba.cl", platformRole: null };

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

function semilla() {
  const s = semillaTenant("admin");
  const persona = (id: string, usuarioId: string | null, nombres: string) => ({
    id,
    tenantId: T,
    nombres,
    apellidos: "Prueba",
    estado: "activo",
    usuarioId,
    archivadaEn: null,
    anonimizadaEn: null,
  });
  return {
    ...s,
    membership: s.membership.map((m) => ({ ...m, portales: ["erp", "trabajador", "cliente"] })),
    persona: [
      persona("0192f3a0-0000-7000-8000-00000000c001", U2, "Beto"),
      persona("0192f3a0-0000-7000-8000-00000000c002", USUARIO_DE_PRUEBA.id, "Ana"),
      persona("0192f3a0-0000-7000-8000-00000000c003", null, "Caro"),
    ],
    instalacion: [
      { id: INST_CON_EQUIPO, tenantId: T, nombre: "Bodega Norte", archivadaEn: null },
      { id: INST_SIN_EQUIPO, tenantId: T, nombre: "Bodega Sur", archivadaEn: null },
    ],
    dispositivo: [
      {
        id: "d1",
        tenantId: T,
        instalacionId: INST_CON_EQUIPO,
        identificador: "Kiosco 1",
        estado: "activo",
      },
    ],
    cuenta: [{ id: CUENTA, tenantId: T, nombre: "Cliente QA" }],
    accesoCliente: [
      { id: ACCESO, tenantId: T, cuentaId: CUENTA, membershipId: M2, estado: "activo" },
    ],
  };
}

const buscar = (ctx: ReturnType<typeof contextoDePrueba>["ctx"], portal: string, q = "") =>
  executeCapability(ctx, "core.ver_como.list", { portal, q });

describe("core.ver_como.list", () => {
  it("Terreno: solo instalaciones con un equipo activo", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    expect(await buscar(ctx, "terreno")).toMatchObject({
      ok: true,
      data: { items: [{ id: INST_CON_EQUIPO, nombre: "Bodega Norte", detalle: "Kiosco 1" }] },
    });
  });

  it("Trabajador: busca por nombre y nunca lista a quien mira", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    const r = await buscar(ctx, "trabajador");
    expect(r.ok).toBe(true);
    const nombres = r.ok
      ? (r.data as { items: { nombre: string }[] }).items.map((i) => i.nombre).sort()
      : [];
    expect(nombres).toEqual(["Beto Prueba", "Caro Prueba"]);
    expect(await buscar(ctx, "trabajador", "zzz")).toMatchObject({ ok: true, data: { items: [] } });
  });

  it("Cliente: un contacto por fila; un admin no ve al owner", async () => {
    const { ctx } = contextoDePrueba({ semilla: semilla() });
    expect(await buscar(ctx, "cliente")).toMatchObject({
      ok: true,
      data: { items: [{ id: ACCESO, nombre: "Cliente QA", detalle: "Beto" }] },
    });
    const admin = contextoDePrueba({ semilla: semilla(), rol: "admin", usuario: BETO });
    expect(await buscar(admin.ctx, "trabajador")).toMatchObject({
      ok: true,
      data: { items: [{ nombre: "Caro Prueba" }] },
    });
  });

  it("un no-admin no puede buscar", async () => {
    for (const rol of ["gerente", "supervisor", "viewer"] as const) {
      const { ctx } = contextoDePrueba({ semilla: semilla(), rol });
      expect(await buscar(ctx, "terreno")).toMatchObject({
        ok: false,
        error: { code: "FORBIDDEN" },
      });
    }
  });
});
