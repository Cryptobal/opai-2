// Brief 16 · Portal Cliente PR 1 (CAR-88): el acceso del contacto de un cliente contra Postgres real
// (si hay DATABASE_URL_TEST). Prueba el alcance FAIL-CLOSED: un contacto solo ve su cuenta y las
// instalaciones habilitadas, nunca las de otra cuenta de su empresa ni las de otra empresa.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Rol = "owner" | "viewer";

describe.skipIf(!urlPropietario)("Portal Cliente · acceso y alcance en base real", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tA = "";
  let tB = "";
  let cuentaX = "";
  let cuentaY = "";
  let cuentaB = "";
  let instX1 = "";
  let instX2 = "";
  let instXArch = "";
  let instY1 = "";
  let instB1 = "";
  let acceso: { limitado: string; todas: string } = { limitado: "", todas: "" };
  const usuarios = {
    limitado: randomUUID(),
    todas: randomUUID(),
    sinAcceso: randomUUID(),
    interno: randomUUID(),
    otraEmpresa: randomUUID(),
  };
  const membresias: Record<string, string> = {};
  const sufijo = randomUUID().slice(0, 8);
  const medidor = { registrar: async () => undefined };

  const ctxOwner = (tenantId: string, rol: Rol = "owner") =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol,
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["portal_cliente"],
      medidor,
    });
  const ctxCliente = (tenantId: string, userId: string, nombre: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre, email: `${nombre}-${sufijo}@prueba.cl`, platformRole: null },
      rol: "viewer",
      permisosRol: ["portal_cliente:read"],
      portal: "cliente",
      portalesMembresia: ["cliente"],
      modulosActivos: ["portal_cliente"],
      medidor,
    });

  async function ejecutar(ctx: ReturnType<typeof ctxOwner>, id: string, input: unknown, o = {}) {
    return mod.executeCapability(ctx, id, input, o);
  }
  async function dato<T>(ctx: ReturnType<typeof ctxOwner>, id: string, input: unknown, o = {}) {
    const r = await ejecutar(ctx, id, input, o);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesPortalCliente]);

    const tenant = async (slug: string) =>
      (await e.admin.tenant.create({ data: { slug: `${slug}-${sufijo}`, nombre: slug, vertical: "seguridad" } })).id;
    tA = await tenant("pc-a");
    tB = await tenant("pc-b");
    const cuenta = async (tenantId: string, nombre: string) =>
      (await e.admin.cuenta.create({ data: { tenantId, nombre } })).id;
    const inst = async (tenantId: string, cuentaId: string, nombre: string, extra = {}) =>
      (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre, estado: "activa", ...extra } })).id;
    cuentaX = await cuenta(tA, "Logística Andina SpA");
    cuentaY = await cuenta(tA, "Inmobiliaria Apoquindo");
    cuentaB = await cuenta(tB, "Cuenta de otra empresa");
    instX1 = await inst(tA, cuentaX, "Planta Quilicura");
    instX2 = await inst(tA, cuentaX, "Bodega Lampa");
    instXArch = await inst(tA, cuentaX, "Sucursal cerrada", { archivadaEn: new Date() });
    instY1 = await inst(tA, cuentaY, "Torre Apoquindo");
    instB1 = await inst(tB, cuentaB, "Planta B");

    const miembro = async (tenantId: string, userId: string, nombre: string, rol: string, portales: string[]) => {
      await e.admin.user.upsert({
        where: { id: userId },
        create: { id: userId, name: nombre, email: `${nombre}-${sufijo}@prueba.cl` },
        update: {},
      });
      const m = await e.admin.membership.create({ data: { tenantId, userId, rol, portales } });
      membresias[nombre] = m.id;
    };
    await miembro(tA, usuarios.limitado, "limitado", "viewer", ["cliente"]);
    await miembro(tA, usuarios.todas, "todas", "viewer", ["cliente"]);
    await miembro(tA, usuarios.sinAcceso, "sinAcceso", "viewer", ["cliente"]);
    await miembro(tA, usuarios.interno, "interno", "viewer", ["erp"]);
    await miembro(tB, usuarios.otraEmpresa, "otraEmpresa", "viewer", ["cliente"]);
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("lista como candidatos solo a los invitados al portal cliente sin vincular", async () => {
    const c = await dato<{ nombre: string }[]>(ctxOwner(tA), "portal_cliente.accesos.candidatos", {});
    expect(c.map((x) => x.nombre).sort()).toEqual(["limitado", "sinAcceso", "todas"]);
  });

  it("vincular en vista previa no escribe", async () => {
    const v = await dato<{ instalaciones: unknown[] }>(
      ctxOwner(tA),
      "portal_cliente.accesos.vincular",
      { membershipId: membresias["limitado"], cuentaId: cuentaX, instalacionIds: [instX1] },
      { dryRun: true },
    );
    expect(v.instalaciones).toHaveLength(1);
    expect(await e.admin.accesoCliente.count({ where: { tenantId: tA } })).toBe(0);
  });

  it("vincula a un contacto limitado y a otro con todas las instalaciones", async () => {
    const lim = await dato<{ id: string }>(ctxOwner(tA), "portal_cliente.accesos.vincular", {
      membershipId: membresias["limitado"],
      cuentaId: cuentaX,
      instalacionIds: [instX1],
    });
    const todas = await dato<{ id: string }>(ctxOwner(tA), "portal_cliente.accesos.vincular", {
      membershipId: membresias["todas"],
      cuentaId: cuentaX,
      todasInstalaciones: true,
    });
    acceso = { limitado: lim.id, todas: todas.id };
    // El contacto recibe el rol sistema con solo `portal_cliente:read`.
    const m = await e.admin.membership.findUniqueOrThrow({
      where: { id: membresias["limitado"] ?? "" },
      include: { rolTenant: true },
    });
    expect(m.rolTenant?.sistema).toBe(true);
    expect(m.rolTenant?.permisos).toEqual(["portal_cliente:read"]);
  });

  it("el contacto limitado ve solo su instalación; el de todas, las vigentes de su cuenta", async () => {
    const lim = await dato<{ limitado: boolean; instalaciones: { id: string }[]; cuentaNombre: string }>(
      ctxCliente(tA, usuarios.limitado, "limitado"),
      "portal_cliente.resumen.leer",
      {},
    );
    expect(lim.cuentaNombre).toBe("Logística Andina SpA");
    expect(lim.limitado).toBe(true);
    expect(lim.instalaciones.map((i) => i.id)).toEqual([instX1]);
    const todas = await dato<{ limitado: boolean; instalaciones: { id: string }[] }>(
      ctxCliente(tA, usuarios.todas, "todas"),
      "portal_cliente.resumen.leer",
      {},
    );
    expect(todas.limitado).toBe(false);
    expect(todas.instalaciones.map((i) => i.id).sort()).toEqual([instX1, instX2].sort());
    // Ninguna sección trae cifras: solo su disponibilidad.
    expect(JSON.stringify(todas)).not.toMatch(/cobertura":\s*\d/);
  });

  it("nadie ve instalaciones de otra cuenta de la misma empresa ni de otra empresa", async () => {
    for (const quien of ["limitado", "todas"] as const) {
      const r = await dato<{ instalaciones: { id: string }[] }>(
        ctxCliente(tA, usuarios[quien], quien),
        "portal_cliente.resumen.leer",
        {},
      );
      const ids = r.instalaciones.map((i) => i.id);
      expect(ids).not.toContain(instY1);
      expect(ids).not.toContain(instB1);
      expect(ids).not.toContain(instXArch);
    }
  });

  it("no deja habilitar una instalación de otra cuenta (ni por la capacidad ni por la base)", async () => {
    const r = await ejecutar(ctxOwner(tA), "portal_cliente.accesos.actualizar", {
      accesoId: acceso.limitado,
      instalacionIds: [instY1],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
    await expect(
      e.admin.accesoInstalacion.create({
        data: { tenantId: tA, accesoId: acceso.limitado, instalacionId: instY1 },
      }),
    ).rejects.toThrow(/no pertenece a la cuenta/);
  });

  it("sin acceso, con acceso de otra empresa o con membresía interna no ve nada (fail-closed)", async () => {
    for (const [tenant, user, nombre] of [
      [tA, usuarios.sinAcceso, "sinAcceso"],
      [tB, usuarios.otraEmpresa, "otraEmpresa"],
    ] as const) {
      const r = await ejecutar(ctxCliente(tenant, user, nombre), "portal_cliente.resumen.leer", {});
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.code).toBe("FORBIDDEN");
    }
    // Un usuario interno (portal ERP) no puede vincularse como contacto de cliente.
    const v = await ejecutar(ctxOwner(tA), "portal_cliente.accesos.vincular", {
      membershipId: membresias["interno"],
      cuentaId: cuentaX,
      todasInstalaciones: true,
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error.code).toBe("UNPROCESSABLE");
  });

  it("otra empresa no puede vincular una membresía ni leer una cuenta ajena", async () => {
    const v = await ejecutar(ctxOwner(tB), "portal_cliente.accesos.vincular", {
      membershipId: membresias["sinAcceso"],
      cuentaId: cuentaB,
      todasInstalaciones: true,
    });
    expect(v.ok).toBe(false);
    const l = await ejecutar(ctxOwner(tB), "portal_cliente.accesos.listar", { cuentaId: cuentaX });
    expect(l.ok).toBe(false);
    if (!l.ok) expect(l.error.code).toBe("NOT_FOUND");
  });

  it("suspender corta el acceso al instante y reactivar lo devuelve; revocar es definitivo", async () => {
    const o = ctxOwner(tA);
    await dato(o, "portal_cliente.accesos.actualizar", { accesoId: acceso.limitado, estado: "suspendido" });
    const c = ctxCliente(tA, usuarios.limitado, "limitado");
    expect((await ejecutar(c, "portal_cliente.mi_acceso", {})).ok).toBe(false);
    await dato(o, "portal_cliente.accesos.actualizar", { accesoId: acceso.limitado, estado: "activo" });
    expect((await ejecutar(c, "portal_cliente.mi_acceso", {})).ok).toBe(true);
    await dato(o, "portal_cliente.accesos.actualizar", { accesoId: acceso.limitado, estado: "revocado" });
    expect((await ejecutar(c, "portal_cliente.mi_acceso", {})).ok).toBe(false);
    const de = await ejecutar(o, "portal_cliente.accesos.actualizar", { accesoId: acceso.limitado, estado: "activo" });
    expect(de.ok).toBe(false);
    // Vincular de nuevo devuelve el acceso (reutiliza la fila revocada).
    const otra = await dato<{ id: string }>(o, "portal_cliente.accesos.vincular", {
      membershipId: membresias["limitado"],
      cuentaId: cuentaX,
      instalacionIds: [instX2],
    });
    expect(otra.id).toBe(acceso.limitado);
    const r = await dato<{ instalaciones: { id: string }[] }>(c, "portal_cliente.resumen.leer", {});
    expect(r.instalaciones.map((i) => i.id)).toEqual([instX2]);
  });

  it("la configuración es por cuenta, aislada, y rechaza los documentos vedados", async () => {
    const o = ctxOwner(tA);
    const antes = await dato<{ guardada: boolean; config: { tiposDocumentoVisibles: string[] } }>(
      o,
      "portal_cliente.config.leer",
      { cuentaId: cuentaX },
    );
    expect(antes.guardada).toBe(false);
    expect(antes.config.tiposDocumentoVisibles).toEqual([]);
    const malo = await ejecutar(o, "portal_cliente.config.actualizar", {
      cuentaId: cuentaX,
      tiposDocumentoVisibles: ["liquidacion_sueldo"],
    });
    expect(malo.ok).toBe(false);
    const correo = await ejecutar(o, "portal_cliente.config.actualizar", {
      cuentaId: cuentaX,
      destinatariosInforme: ["no-es-correo"],
    });
    expect(correo.ok).toBe(false);
    await dato(o, "portal_cliente.config.actualizar", {
      cuentaId: cuentaX,
      tiposDocumentoVisibles: ["credencial_os10"],
      destinatariosInforme: [" Ana@Atlas.cl "],
      muestraRutGuardias: false,
    });
    const x = await dato<{ guardada: boolean; config: { destinatariosInforme: string[]; muestraRutGuardias: boolean } }>(
      o, "portal_cliente.config.leer", { cuentaId: cuentaX });
    expect(x.guardada).toBe(true);
    expect(x.config.destinatariosInforme).toEqual(["ana@atlas.cl"]);
    expect(x.config.muestraRutGuardias).toBe(false);
    // La otra cuenta de la misma empresa sigue con los defectos.
    const y = await dato<{ guardada: boolean }>(o, "portal_cliente.config.leer", { cuentaId: cuentaY });
    expect(y.guardada).toBe(false);
    // El contacto ve la configuración efectiva de SU cuenta: sin RUT de guardias.
    const perfil = await dato<{ muestraRutGuardias: boolean }>(
      ctxCliente(tA, usuarios.todas, "todas"),
      "portal_cliente.mi_acceso",
      {},
    );
    expect(perfil.muestraRutGuardias).toBe(false);
    // Otra empresa no ve la cuenta.
    const ajena = await ejecutar(ctxOwner(tB), "portal_cliente.config.leer", { cuentaId: cuentaX });
    expect(ajena.ok).toBe(false);
  });

  it("un contacto de cliente no puede usar capacidades del ERP", async () => {
    const r = await ejecutar(ctxCliente(tA, usuarios.todas, "todas"), "portal_cliente.accesos.listar", {
      cuentaId: cuentaX,
    });
    expect(r.ok).toBe(false);
    const c = await ejecutar(ctxCliente(tA, usuarios.todas, "todas"), "core.cuentas.list", {});
    expect(c.ok).toBe(false);
  });
});
