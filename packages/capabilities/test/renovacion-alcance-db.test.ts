// CAR-53, contra Postgres real: `core.documentos.pedir_renovacion` respeta el alcance por filas
// (ADR-022). Un supervisor acotado a una instalación, con `core:documentos.manage` por excepción,
// no puede pedir la renovación a una persona cuyo vínculo vigente está en otra instalación: recibe
// el mismo error que si la persona no existiera, no se envía correo y la salida no revela nada.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PERMISOS_CORE } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type { Correo } from "../src/testing/tipos";

describe.skipIf(!urlPropietario)("pedir renovación respeta el alcance del supervisor (CAR-53)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let instA = "";
  let personaA = "";
  let personaB = "";
  let tipoId = "";
  const correos: Correo[] = [];
  const sufijo = randomUUID().slice(0, 8);
  const correoA = `a-${sufijo}@prueba.cl`;
  const correoB = `b-${sufijo}@prueba.cl`;

  const ctxSup = (instalaciones: string[]) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      portal: "supervisor",
      portalesMembresia: ["erp", "supervisor"],
      rol: "supervisor",
      excepciones: [{ permiso: PERMISOS_CORE.documentosManage, conceder: true }],
      alcance: { instalaciones },
      medidor: { registrar: async () => undefined },
      servicios: { correo: { nombre: "memoria", enviar: async (c) => void correos.push(c) } },
    });
  const pedir = (instalaciones: string[], personaIds: string[], dryRun = false) =>
    mod.executeCapability(
      ctxSup(instalaciones),
      "core.documentos.pedir_renovacion",
      { pedidos: personaIds.map((personaId) => ({ personaId, tipoIds: [tipoId] })) },
      { dryRun },
    );
  const enviosPara = (para: string) => e.admin.envio.count({ where: { tenantId, destinatario: para } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `car53-${sufijo}`, nombre: "Car53", vertical: "seguridad" },
      })
    ).id;
    const cuenta = await e.admin.cuenta.create({ data: { tenantId, nombre: "Cuenta" } });
    const inst = (nombre: string) =>
      e.admin.instalacion.create({ data: { tenantId, cuentaId: cuenta.id, nombre } });
    instA = (await inst("Planta A")).id;
    const instB = (await inst("Planta B")).id;
    const cargoId = (await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia" } })).id;
    const persona = async (nombres: string, rut: string, email: string, instalacionId: string) => {
      const p = await e.admin.persona.create({
        data: { tenantId, nombres, apellidos: "Prueba", rut, emailLaboral: email },
      });
      await e.admin.vinculoLaboral.create({
        data: {
          tenantId,
          personaId: p.id,
          cargoId,
          instalacionId,
          tipo: "indefinido",
          inicio: new Date("2026-01-01"),
        },
      });
      return p.id;
    };
    personaA = await persona("Ana", "11.111.111-1", correoA, instA);
    personaB = await persona("Berta", "22.222.222-2", correoB, instB);
    tipoId = (
      await e.admin.documentoTipo.create({
        data: { tenantId, codigo: "licencia", nombre: "Licencia", capa: "persona" },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("persona a cargo: se le pide la renovación", async () => {
    const r = await pedir([instA], [personaA]);
    expect(r).toMatchObject({ ok: true, data: { enviados: [{ personaId: personaA, para: correoA }] } });
    // Control positivo: el correo sí sale por el mailer de prueba y queda registrado.
    expect(correos.some((c) => c.para === correoA)).toBe(true);
    expect(await enviosPara(correoA)).toBe(1);
  });

  it("persona fuera de alcance: mismo error que inexistente, sin correo ni datos revelados", async () => {
    const enviadosAntes = correos.length;
    const registrosAntes = await enviosPara(correoB);
    for (const dryRun of [false, true]) {
      const fuera = await pedir([instA], [personaB], dryRun);
      const inexistente = await pedir([instA], [randomUUID()], dryRun);
      expect(fuera).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
      expect(fuera).toEqual(inexistente);
      expect(JSON.stringify(fuera)).not.toContain(correoB);
      expect(JSON.stringify(fuera)).not.toContain("Berta");
    }
    // Mezclada con una persona a cargo, todo el pedido se rechaza antes de enviar nada.
    expect(await pedir([instA], [personaA, personaB])).toEqual(await pedir([instA], [randomUUID()]));
    expect(correos.length).toBe(enviadosAntes);
    expect(correos.some((c) => c.para === correoB)).toBe(false);
    expect(await enviosPara(correoB)).toBe(registrosAntes);
  });

  it("supervisor sin instalaciones a cargo: no alcanza a nadie", async () => {
    expect(await pedir([], [personaA], true)).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE", message: "Alguna persona no existe." },
    });
  });
});
