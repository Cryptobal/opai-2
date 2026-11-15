// CAR-538: el contacto del cliente gestiona la lista de SUS instalaciones (R12), contra Postgres real con dos
// empresas: solo con el interruptor de la empresa y la opción de su cuenta, RUN validado, solo quita lo suyo,
// la lista de la empresa sigue mandando y nadie de otra cuenta o empresa ve ni toca nada. Auditado.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { entornoPortalAccesos } from "./acceso-portal-cliente-entorno";

type Entrada = { id: string; nombre: string | null; motivo: string | null; deCliente: boolean; mascara: string };
type Pag = { items: Entrada[]; siguiente: string | null };
const RUN = { tipo: "run", numero: "11.111.111-1" } as const;

describe.skipIf(!urlPropietario)("Listas del cliente en el Portal Cliente, base real (CAR-538)", () => {
  let x: Awaited<ReturnType<typeof entornoPortalAccesos>>;
  let deEmpresa = "";
  const code = (r: { ok: boolean; error?: { code: string } }) => (r.ok ? "ok" : r.error?.code);
  const interruptor = (tenantId: string, valor: boolean) =>
    x.e.admin.ajuste.upsert({
      where: { tenantId_ambito_sujetoId_modulo_clave: { tenantId, ambito: "tenant", sujetoId: tenantId, modulo: "acceso", clave: "clienteGestionaListas" } },
      create: { tenantId, ambito: "tenant", sujetoId: tenantId, modulo: "acceso", clave: "clienteGestionaListas", valor },
      update: { valor },
    });

  beforeAll(async () => {
    x = await entornoPortalAccesos();
    deEmpresa = (
      await x.ok<Entrada>(x.sistema(x.t.A), "acceso.listas.agregar", {
        instalacionId: x.inst.X1,
        tipo: "bloqueada",
        documento: { tipo: "run", numero: "10.000.000-8" },
        motivo: "Texto privado del bloqueo",
      })
    ).id;
  });

  afterAll(async () => {
    await x?.e.cerrar();
  });

  it("sin el interruptor de la empresa (apagado por defecto), FORBIDDEN", async () => {
    const r = await x.run(x.contacto("X"), "acceso.portal_listas.listar", { instalacionId: x.inst.X1 });
    expect(code(r)).toBe("FORBIDDEN");
  });

  it("con el interruptor, agrega a su lista; el RUN inválido se rechaza", async () => {
    await interruptor(x.t.A, true);
    const malo = await x.run(x.contacto("X"), "acceso.portal_listas.agregar", {
      instalacionId: x.inst.X1,
      tipo: "autorizada",
      documento: { tipo: "run", numero: "11.111.111-2" },
    });
    expect(code(malo)).toBe("UNPROCESSABLE");
    const e = await x.ok<Entrada>(x.contacto("X"), "acceso.portal_listas.agregar", {
      instalacionId: x.inst.X1,
      tipo: "autorizada",
      documento: RUN,
      nombre: "Visita frecuente",
    });
    expect(e.deCliente).toBe(true);
    expect(e.mascara).not.toContain("111.111");
    const fila = await x.e.admin.entradaLista.findUniqueOrThrow({ where: { id: e.id } });
    expect(fila.cuentaId).toBe(x.cuentas.X);
    const a = await x.e.admin.auditEvent.findFirstOrThrow({
      where: { tenantId: x.t.A, capability: "acceso.portal_listas.agregar", actorId: x.usuarios.X },
    });
    expect(JSON.stringify(a)).not.toContain("11.111.111");
  });

  it("ve la lista de su instalación sin el motivo del bloqueo de la empresa, y no la puede quitar", async () => {
    const l = (await x.ok<Pag>(x.contacto("X"), "acceso.portal_listas.listar", { instalacionId: x.inst.X1 })).items;
    expect(l.find((e) => e.id === deEmpresa)?.motivo).toBeNull();
    const q = await x.run(x.contacto("X"), "acceso.portal_listas.quitar", { id: deEmpresa });
    expect(code(q)).toBe("FORBIDDEN");
    expect(await x.e.admin.entradaLista.count({ where: { id: deEmpresa } })).toBe(1);
  });

  it("otra instalación, otra cuenta u otra empresa: NOT_FOUND o FORBIDDEN, sin escribir", async () => {
    for (const instalacionId of [x.inst.X2, x.inst.Y]) {
      const r = await x.run(x.contacto("X"), "acceso.portal_listas.agregar", { instalacionId, tipo: "autorizada", documento: RUN });
      expect(code(r)).toBe("NOT_FOUND");
    }
    const propia = (await x.ok<Pag>(x.contacto("X"), "acceso.portal_listas.listar", { instalacionId: x.inst.X1 })).items.find((e) => e.deCliente);
    expect(code(await x.run(x.contacto("Y"), "acceso.portal_listas.quitar", { id: propia?.id }))).toBe("NOT_FOUND");
    await interruptor(x.t.B, true);
    expect(code(await x.run(x.contacto("B"), "acceso.portal_listas.quitar", { id: propia?.id }))).toBe("NOT_FOUND");
    expect(code(await x.run(x.contacto("B"), "acceso.portal_listas.listar", { instalacionId: x.inst.X1 }))).toBe("NOT_FOUND");
  });

  it("sin «gestiona listas» en su cuenta, FORBIDDEN aunque la empresa lo permita", async () => {
    await x.e.admin.configPortalCuenta.create({ data: { tenantId: x.t.A, cuentaId: x.cuentas.Y, gestionaListas: false } });
    const r = await x.run(x.contacto("Y"), "acceso.portal_listas.listar", { instalacionId: x.inst.Y });
    expect(code(r)).toBe("FORBIDDEN");
  });

  it("quita la suya (vista previa sin escribir, luego real) y la empresa la ve marcada", async () => {
    const l = await x.ok<Entrada[]>(x.sistema(x.t.A), "acceso.listas.listar", { instalacionId: x.inst.X1 });
    const propia = l.find((e) => e.deCliente);
    expect(propia?.nombre).toBe("Visita frecuente");
    const id = propia?.id ?? "";
    await x.ok(x.contacto("X"), "acceso.portal_listas.quitar", { id }, { dryRun: true });
    expect(await x.e.admin.entradaLista.count({ where: { id } })).toBe(1);
    await x.ok(x.contacto("X"), "acceso.portal_listas.quitar", { id });
    expect(await x.e.admin.entradaLista.count({ where: { id } })).toBe(0);
  });
});
