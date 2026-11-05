// Rendiciones R2b (CAR-197) con Postgres real: tipo de documento, opciones del formulario (nunca uno mismo
// como aprobador, destino del respaldo según el alcance), aviso de boleta repetida y portal Supervisor.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/rendiciones/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Item = Record<string, unknown>;

describe.skipIf(omitirSuiteDb())("Rendiciones · R2b (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  let instA = "";
  const rinde = randomUUID();
  const aprueba = randomUUID();
  const ajeno = randomUUID();
  const otroJefe = randomUUID();

  type Rol = "supervisor" | "gerente" | "viewer";
  const ctx = (uid: string, rol: Rol, tid: string, alcance: readonly string[] | null) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: uid },
      usuario: {
        id: uid,
        nombre: "Prueba",
        email: `${uid.slice(0, 6)}@rend.test`,
        platformRole: null,
      },
      portal: rol === "supervisor" ? "supervisor" : "erp",
      portalesMembresia: [rol === "supervisor" ? "supervisor" : "erp"],
      rol,
      modulosActivos: ["rendiciones"],
      ...(alcance ? { alcance: { instalaciones: alcance } } : {}),
      medidor: { registrar: async () => undefined },
    });
  const supervisor = (id: string, input: Record<string, unknown>) =>
    mod.executeCapability(ctx(rinde, "supervisor", tenantA, [instA]), id, input);
  const jefe = (id: string, input: Record<string, unknown>) =>
    mod.executeCapability(ctx(aprueba, "gerente", tenantA, null), id, input);
  const dato = async <T>(r: Awaited<ReturnType<typeof supervisor>>): Promise<T> => {
    if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
    return r.data as T;
  };
  const item = (extra: Item = {}): Item => ({
    fecha: "2026-11-02",
    proveedor: "Ferretería Sur",
    folio: "R2B-1",
    descripcion: "Candados",
    monto: 12_000,
    sinRespaldoMotivo: "La boleta se mojó",
    ...extra,
  });
  const cuerpo = (extra: Item = {}): Item => ({
    descripcion: "Compras de la semana",
    centroCosto: "instalacion",
    instalacionId: instA,
    aprobadorId: aprueba,
    items: [item()],
    ...extra,
  });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const t = (slug: string) =>
      e.admin.tenant.create({
        data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" },
      });
    tenantA = (await t("r2b-a")).id;
    tenantB = (await t("r2b-b")).id;
    const c = await e.admin.cuenta.create({
      data: { tenantId: tenantA, nombre: "Cliente R2b", rut: "76333444-5" },
    });
    instA = (
      await e.admin.instalacion.create({
        data: {
          tenantId: tenantA,
          cuentaId: c.id,
          nombre: "Planta R2b",
          estado: "activa",
          lat: -33.45,
          lng: -70.66,
        },
      })
    ).id;
    for (const [id, nombre, rol, tid, portal] of [
      [rinde, "Rita Rinde", "supervisor", tenantA, "supervisor"],
      [aprueba, "Ana Aprueba", "gerente", tenantA, "erp"],
      [otroJefe, "Otro Jefe", "gerente", tenantA, "erp"],
      [ajeno, "Otro Tenant", "gerente", tenantB, "erp"],
    ] as const) {
      await e.admin.user.create({
        data: { id, name: nombre, email: `${id.slice(0, 8)}@rend.test` },
      });
      await e.admin.membership.create({
        data: { tenantId: tid, userId: id, rol, portales: [portal] },
      });
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("el supervisor rinde desde su portal: el tipo de documento queda guardado y se devuelve el nombre de quien revisa", async () => {
    const creada = await dato<{ id: string }>(
      await supervisor(
        "rendiciones.rendiciones.crear",
        cuerpo({
          items: [item({ tipoDocumento: "factura", folio: "F-9" }), item({ folio: "B-9" })],
        }),
      ),
    );
    const { rendicion } = await dato<{
      rendicion: {
        aprobadorNombre: string | null;
        items: { tipoDocumento: string; folio: string }[];
      };
    }>(await supervisor("rendiciones.rendiciones.obtener", { id: creada.id }));
    expect(rendicion.aprobadorNombre).toBe("Ana Aprueba");
    expect(rendicion.items.map((i) => [i.folio, i.tipoDocumento]).sort()).toEqual([
      ["B-9", "boleta"],
      ["F-9", "factura"],
    ]);
    const { rendiciones } = await dato<{
      rendiciones: { id: string; aprobadorNombre: string | null }[];
    }>(await supervisor("rendiciones.rendiciones.listar", { alcance: "propias" }));
    expect(rendiciones.find((r) => r.id === creada.id)?.aprobadorNombre).toBe("Ana Aprueba");
    expect(
      await supervisor(
        "rendiciones.rendiciones.crear",
        cuerpo({ items: [item({ tipoDocumento: "pagare" })] }),
      ),
    ).toMatchObject({ ok: false });
  });

  it("opciones: instalaciones de la empresa, aprobadores sin él mismo y destino del respaldo según el alcance", async () => {
    const cuenta = await e.admin.cuenta.findFirstOrThrow({ where: { tenantId: tenantA } });
    await e.admin.instalacion.create({ data: { tenantId: tenantA, cuentaId: cuenta.id, nombre: "Planta ajena al alcance", estado: "activa" } });
    const o = await dato<{
      instalaciones: { id: string; lat: number | null }[];
      aprobadores: { id: string; nombre: string }[];
      destinoRespaldo: { tipo: string; id: string } | null;
      kilometraje: unknown;
    }>(await supervisor("rendiciones.opciones.obtener", {}));
    expect(o.instalaciones.map((i) => i.id)).toEqual([instA]); // dentro de su alcance
    expect(o.instalaciones[0]?.lat).toBeCloseTo(-33.45);
    expect(o.aprobadores).toEqual([]); // sin aprobador por defecto ni elegibles no se lista a nadie
    await e.admin.ajuste.createMany({ data: [{ tenantId: tenantA, ambito: "tenant", sujetoId: tenantA, modulo: "rendiciones", clave: "aprobador_defecto_id", valor: aprueba }] });
    const conDefecto = await dato<{ aprobadores: { id: string; nombre: string }[]; aprobadorPorDefectoId: string | null }>(await supervisor("rendiciones.opciones.obtener", {}));
    expect(conDefecto.aprobadores).toEqual([{ id: aprueba, nombre: "Ana Aprueba" }]);
    expect(conDefecto.aprobadorPorDefectoId).toBe(aprueba);
    expect(o.aprobadores.some((a) => a.id === rinde)).toBe(false);
    expect(o.destinoRespaldo).toEqual({ tipo: "instalacion", id: instA }); // subida acotada: a una instalación a su cargo
    expect(o.kilometraje).toBeNull(); // la empresa aún no configuró el kilometraje
    const g = await dato<{
      aprobadores: { id: string }[];
      destinoRespaldo: { tipo: string } | null;
    }>(await jefe("rendiciones.opciones.obtener", {}));
    expect(g.destinoRespaldo).toMatchObject({ tipo: "tenant" });
    expect(g.aprobadores.some((a) => a.id === aprueba)).toBe(false);
  });

  it("el viewer no rinde: ninguna pantalla ni herramienta de rendir le responde", async () => {
    const viewer = (id: string, input: Record<string, unknown>) =>
      mod.executeCapability(ctx(randomUUID(), "viewer", tenantA, null), id, input);
    expect(await viewer("rendiciones.opciones.obtener", {})).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await viewer("rendiciones.rendiciones.listar", { alcance: "propias" })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("un respaldo de OTRA empresa se rechaza; con ver_todas se acepta el de un colega de la misma empresa", async () => {
    const doc = (tenantId: string, por: string) =>
      e.admin.documento
        .create({ data: { tenantId, nombre: "b.pdf", mime: "application/pdf", tamano: 1_000, storageKey: `k-${randomUUID()}`, estado: "disponible", creadoPorTipo: "user", creadoPorId: por } })
        .then((d) => d.id);
    const conDoc = (documentoId: string, folio: string) => cuerpo({ items: [item({ documentoId, sinRespaldoMotivo: undefined, folio })] });
    const deOtraEmpresa = await doc(tenantB, ajeno);
    expect(await supervisor("rendiciones.rendiciones.crear", conDoc(deOtraEmpresa, "X-1"))).toMatchObject({ ok: false });
    expect(await jefe("rendiciones.rendiciones.crear", conDoc(deOtraEmpresa, "X-2"))).toMatchObject({ ok: false }); // ni siquiera con ver_todas
    const colega = await doc(tenantA, rinde);
    expect(await jefe("rendiciones.rendiciones.crear", { ...conDoc(colega, "X-3"), aprobadorId: otroJefe })).toMatchObject({ ok: true }); // ver_todas: el de otra persona de su empresa
  });

  it("opciones suma los elegibles de la empresa y el aprobador asignado a la rendición que se corrige", async () => {
    await e.admin.ajuste.createMany({ data: [{ tenantId: tenantA, ambito: "tenant", sujetoId: tenantA, modulo: "rendiciones", clave: "aprobadores_elegibles_ids", valor: [otroJefe, ajeno] }] });
    const o = await dato<{ aprobadores: { id: string }[] }>(await supervisor("rendiciones.opciones.obtener", {}));
    expect(o.aprobadores.map((a) => a.id).sort()).toEqual([aprueba, otroJefe].sort()); // el elegible de OTRA empresa no aparece
    await e.admin.ajuste.deleteMany({ where: { tenantId: tenantA, modulo: "rendiciones", clave: { in: ["aprobadores_elegibles_ids", "aprobador_defecto_id"] } } });
    const r = await dato<{ id: string }>(await supervisor("rendiciones.rendiciones.crear", cuerpo({ aprobadorId: otroJefe })));
    const sin = await dato<{ aprobadores: { id: string }[] }>(await supervisor("rendiciones.opciones.obtener", {}));
    expect(sin.aprobadores).toEqual([]);
    const con = await dato<{ aprobadores: { id: string }[] }>(await supervisor("rendiciones.opciones.obtener", { rendicionId: r.id }));
    expect(con.aprobadores.map((a) => a.id)).toEqual([otroJefe]);
  });

  it("opciones no cruza empresas", async () => {
    const o = await dato<{ instalaciones: unknown[]; aprobadores: { id: string }[] }>(
      await mod.executeCapability(
        ctx(ajeno, "gerente", tenantB, null),
        "rendiciones.opciones.obtener",
        {},
      ),
    );
    expect(o.instalaciones).toEqual([]);
    expect(o.aprobadores.map((a) => a.id)).not.toContain(aprueba);
  });

  it("duplicados.consultar avisa la boleta repetida solo si la persona puede ver esa rendición", async () => {
    const a = await dato<{ codigoVisible: string }>(
      await supervisor(
        "rendiciones.rendiciones.crear",
        cuerpo({ items: [item({ folio: "DUP-R2B", monto: 4_321 })] }),
      ),
    );
    const gasto = { proveedor: "ferreteria sur", folio: "DUP-R2B", monto: 4_321 };
    const r = await dato<{ repetidos: { gasto: number; codigoVisible: string }[] }>(
      await supervisor("rendiciones.duplicados.consultar", { gastos: [gasto] }),
    );
    expect(r.repetidos).toEqual([{ gasto: 1, codigoVisible: a.codigoVisible }]);
    const otraEmpresa = await dato<{ repetidos: unknown[] }>(
      await mod.executeCapability(
        ctx(ajeno, "gerente", tenantB, null),
        "rendiciones.duplicados.consultar",
        { gastos: [gasto] },
      ),
    );
    expect(otraEmpresa.repetidos).toEqual([]);
  });
});
