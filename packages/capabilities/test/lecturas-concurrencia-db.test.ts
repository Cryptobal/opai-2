import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { enTransaccion, type TenantTx } from "@opai/db";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Mod from "../src";
import { type FixtureLecturas, sembrarLecturas } from "./lecturas-sensibles-fixture";

describe.skipIf(!urlPropietario)("lecturas sensibles: relaciones de alcance estables", () => {
  let e: Entorno,
    mod: typeof Mod,
    f: FixtureLecturas,
    cuentaB = "";
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    f = await sembrarLecturas(e);
    cuentaB = (await e.admin.cuenta.create({ data: { tenantId: f.tenantId, nombre: "Fuera" } })).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  const contexto = () => {
    const ctx = mod.crearContexto({
      tenantId: f.tenantId,
      actor: { tipo: "user", id: f.userId },
      rol: "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      alcance: { instalaciones: [f.instalacionId] },
      medidor: { registrar: async () => undefined },
    });
    ctx.servicios.almacenamiento.urlDescarga = async () => "https://archivo.example.test/ficticio";
    return ctx;
  };
  function barrera(ctx: ReturnType<typeof contexto>, marca: string) {
    let avisar = () => {},
      liberar = () => {};
    const seleccionada = new Promise<void>((r) => {
      avisar = r;
    });
    const continuar = new Promise<void>((r) => {
      liberar = r;
    });
    const original = ctx.transaccion;
    ctx.transaccion = (fn) =>
      original((tx) =>
        fn(
          new Proxy(tx, {
            get(target, prop) {
              if (prop !== "$queryRaw") return Reflect.get(target, prop);
              return async (sql: TemplateStringsArray, ...valores: unknown[]) => {
                const filas = await target.$queryRaw(sql, ...valores);
                if (sql.join("?").includes(marca)) {
                  avisar();
                  await continuar;
                }
                return filas;
              };
            },
          }),
        ),
      );
    return { seleccionada, liberar };
  }

  it("lista, ficha, vencimientos y descarga retienen instalación y dueño hasta auditar", async () => {
    const cambios: ((tx: TenantTx) => Promise<number>)[] = [
      (tx) =>
        tx.$executeRaw`UPDATE core.instalaciones SET cuenta_id = ${cuentaB}::uuid WHERE id = ${f.instalacionId}::uuid`,
      (tx) =>
        tx.$executeRaw`UPDATE core.documento_vinculos SET entidad_tipo = 'cuenta', entidad_id = ${cuentaB}::uuid WHERE documento_id = ${f.documentoId}::uuid`,
    ];
    for (const id of [
      "core.documentos.list",
      "core.documentos.get",
      "core.documentos.vencimientos",
      "core.documentos.url_descarga",
    ]) {
      const ctx = contexto();
      const b = barrera(ctx, "/* nucleo-h:propietarios */");
      const lectura = mod.executeCapability(ctx, id, { id: f.documentoId });
      try {
        await Promise.race([
          b.seleccionada,
          lectura.then(() => {
            throw new Error(`No alcanzó la barrera: ${id}`);
          }),
        ]);
        for (const cambiar of cambios)
          await expect(
            enTransaccion(f.tenantId, async (tx) => {
              await tx.$executeRaw`SET LOCAL lock_timeout = '100ms'`;
              await cambiar(tx);
            }),
          ).rejects.toMatchObject({
            code: "P2010",
            meta: { driverAdapterError: { cause: { code: "55P03" } } },
          });
      } finally {
        b.liberar();
      }
      expect(await lectura, id).toMatchObject({ ok: true });
    }
    await e.admin.documentoVinculo.updateMany({
      where: { documentoId: f.documentoId },
      data: { entidadTipo: "cuenta", entidadId: cuentaB },
    });
    expect(
      await mod.executeCapability(contexto(), "core.documentos.url_descarga", {
        id: f.documentoId,
      }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("consentimientos no incorpora un contacto que entró después de bloquear el conjunto", async () => {
    const c = await e.admin.contacto.create({
      data: {
        tenantId: f.tenantId,
        cuentaId: cuentaB,
        nombres: "Fuera",
        apellidos: "Prueba",
      },
    });
    await e.admin.consentimiento.create({
      data: {
        tenantId: f.tenantId,
        titularTipo: "contacto",
        titularId: c.id,
        proposito: "prueba",
        versionAviso: "1",
        estado: "otorgado",
      },
    });
    const ctx = contexto();
    const b = barrera(ctx, "SELECT c.id FROM core.contactos");
    const lectura = mod.executeCapability(ctx, "core.cumplimiento.consentimientos_listar", {
      titular: { tipo: "contacto", id: c.id },
    });
    try {
      await Promise.race([
        b.seleccionada,
        lectura.then(() => {
          throw new Error("No alcanzó la barrera");
        }),
      ]);
      await e.admin.contacto.update({ where: { id: c.id }, data: { cuentaId: f.cuentaId } });
    } finally {
      b.liberar();
    }
    expect(await lectura).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    await e.admin.contacto.update({ where: { id: c.id }, data: { cuentaId: cuentaB } });
    const desconocido = await mod.executeCapability(
      contexto(),
      "core.cumplimiento.consentimientos_listar",
      { titular: { tipo: "contacto", id: randomUUID() } },
    );
    expect(desconocido).toEqual(await lectura);
  });
});
