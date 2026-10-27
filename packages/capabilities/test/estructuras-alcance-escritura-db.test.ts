// Brief 07c · B3 (bloqueante de autorrevisión), contra Postgres real: las escrituras de
// `core.estructuras.*` también deben respetar la RLS por tenant y el alcance por instalación,
// igual que las lecturas. En memoria no hay RLS real, así que el aislamiento entre tenants solo se
// prueba aquí.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";

describe.skipIf(!urlPropietario)("Alcance y aislamiento en escrituras de estructuras (B3)", () => {
  let e: Entorno;
  let tenantId = "";
  let otroId = "";
  let instA = "";
  let puestoA = "";
  let puestoB = "";
  const medidor = { registrar: async () => undefined };

  const ctxOwner = (id = tenantId) =>
    mod.crearContexto({ tenantId: id, actor: { tipo: "system" }, rol: "owner", medidor });
  // Permisos completos (como un admin) pero alcance acotado: aísla el efecto del alcance del de los
  // permisos, igual que "nadie da más alcance que el propio" en alcance-db.test.ts.
  const ctxAcotado = (instalaciones: string[]) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      rol: "admin",
      alcance: { instalaciones },
      medidor,
    });
  const crear = (ctx: ReturnType<typeof ctxOwner>, puestoId: string, vigenteDesde: string) =>
    mod.executeCapability(ctx, "core.estructuras.create", {
      nivel: "puesto",
      puestoId,
      sueldoBase: 100,
      vigenteDesde,
    });

  async function dato<T>(ctx: ReturnType<typeof ctxOwner>, id: string, input: unknown) {
    const r = await mod.executeCapability(ctx, id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const tenant = (nombre: string) =>
      e.admin.tenant
        .create({ data: { slug: `estr-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" } })
        .then((t) => t.id);
    tenantId = await tenant("Estr");
    otroId = await tenant("Otro");
    const o = ctxOwner();
    const cargoId = (await dato<{ id: string }>(o, "core.cargos.create", { nombre: "Guardia" })).id;
    const cuentaId = (await dato<{ id: string }>(o, "core.cuentas.create", { nombre: "Cuenta" })).id;
    instA = (
      await dato<{ id: string }>(o, "core.instalaciones.create", { cuentaId, nombre: "Planta A" })
    ).id;
    const instB = (
      await dato<{ id: string }>(o, "core.instalaciones.create", { cuentaId, nombre: "Planta B" })
    ).id;
    const puesto = (instalacionId: string, nombre: string) =>
      dato<{ id: string }>(o, "core.puestos.create", {
        instalacionId,
        cargoId,
        nombre,
        diasTrabajo: 4,
        diasDescanso: 4,
        horaInicio: "08:00",
        horaFin: "20:00",
      });
    puestoA = (await puesto(instA, "Día A")).id;
    puestoB = (await puesto(instB, "Día B")).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("otro tenant no puede crear ni anular una estructura aunque adivine el id del puesto", async () => {
    const otro = ctxOwner(otroId);
    expect(await crear(otro, puestoA, "2026-01-01")).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    const existente = await dato<{ id: string }>(ctxOwner(), "core.estructuras.create", {
      nivel: "puesto",
      puestoId: puestoA,
      sueldoBase: 100,
      vigenteDesde: "2026-02-01",
    });
    const anula = await mod.executeCapability(otro, "core.estructuras.anular", {
      id: existente.id,
      motivo: "Ajeno a este tenant",
    });
    expect(anula).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("acotado a instA no puede crear ni anular una estructura del puesto de instB", async () => {
    const acotado = ctxAcotado([instA]);
    expect(await crear(acotado, puestoB, "2026-04-01")).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    const existente = await dato<{ id: string }>(ctxOwner(), "core.estructuras.create", {
      nivel: "puesto",
      puestoId: puestoB,
      sueldoBase: 100,
      vigenteDesde: "2026-04-01",
    });
    const anula = await mod.executeCapability(acotado, "core.estructuras.anular", {
      id: existente.id,
      motivo: "Fuera de alcance",
    });
    expect(anula).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("fuera de alcance: el código de error es el mismo que si el puesto no existiera", async () => {
    const acotado = ctxAcotado([]);
    const fuera = await crear(acotado, puestoB, "2026-03-01");
    const inexistente = await crear(acotado, randomUUID(), "2026-03-01");
    expect(fuera).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(inexistente).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect((fuera as { error: { message: string } }).error.message).toBe(
      (inexistente as { error: { message: string } }).error.message,
    );
  });

  it("concurrencia: el filtro de alcance resiste llamadas paralelas (sin escaparse por carrera)", async () => {
    // Sin instalaciones a cargo: el puesto de instA queda fuera. El alcance viene de la sesión, no
    // de una fila mutable, así que no hay TOCTOU; esto prueba que el filtro sigue aplicando aun con
    // varias escrituras concurrentes sobre la misma referencia fuera de alcance.
    const acotado = ctxAcotado([]);
    const contar = () => e.forTenant(tenantId).estructuraSueldo.count({ where: { puestoId: puestoA } });
    const antes = await contar();
    const resultados = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        crear(acotado, puestoA, `2026-${String(6 + i).padStart(2, "0")}-01`),
      ),
    );
    for (const r of resultados) expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await contar()).toBe(antes);
  });
});
