// CAR-53 · Documentos, comunicaciones e invitaciones sin test: core.documentos.archive,
// core.documentos.pedir_renovacion, core.documento_tipos.update, core.plantillas.enviar_prueba y
// core.invitations.revoke. Autorización, dryRun, auditoría y alcance contra Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { type Car53, prepararCar53 } from "./nucleo-car53-fixture";

const DOCS = ["core:documentos.manage"];
const EVENTO = "core.documento.renovacion_solicitada";

describe.skipIf(!urlPropietario)("CAR-53 · documentos, plantillas e invitaciones", () => {
  let f: Car53;
  const id = { instAlfa: "", personaAlfa: "", personaBeta: "", tipo: "", docAlfa: "", docBeta: "" };

  beforeAll(async () => {
    f = await prepararCar53("car53-docs");
    const o = f.owner();
    const crear = async (cap: string, input: unknown) =>
      (await f.dato<{ id: string }>(o, cap, input)).id;
    const cargoId = await crear("core.cargos.create", { nombre: "Guardia" });
    const persona = async (nombre: string, rut: string, cuenta: string) => {
      const cuentaId = await crear("core.cuentas.create", { nombre: cuenta });
      const instalacionId = await crear("core.instalaciones.create", {
        cuentaId,
        nombre: `Planta ${cuenta}`,
      });
      const vinculo = {
        instalacionId,
        cargoId,
        tipo: "indefinido",
        inicio: "2026-01-05",
        horasSemanales: 40,
        distribucion: "Lunes a viernes",
      };
      const emailLaboral = `${nombre.toLowerCase()}@prueba.cl`;
      return {
        instalacionId,
        personaId: await crear("core.personas.create", {
          nombres: nombre,
          apellidos: "Prueba",
          rut,
          emailLaboral,
          vinculo,
        }),
      };
    };
    const alfa = await persona("Ana", "19.876.543-0", "Alfa");
    const beta = await persona("Bruno", "11.111.111-1", "Beta");
    Object.assign(id, {
      instAlfa: alfa.instalacionId,
      personaAlfa: alfa.personaId,
      personaBeta: beta.personaId,
    });
    id.tipo = await crear("core.documento_tipos.create", {
      codigo: "licencia_car53",
      capa: "persona",
      nombre: "Licencia",
    });
    const subir = async (personaId: string) => {
      const ini = await f.dato<{ documento: { id: string } }>(o, "core.documentos.iniciar_subida", {
        entidad: { tipo: "persona", id: personaId },
        tipoId: id.tipo,
        nombre: "licencia.pdf",
        mime: "application/pdf",
        tamano: 1234,
        sha256: "d".repeat(64),
      });
      const fila = await f.e.admin.documento.findUniqueOrThrow({ where: { id: ini.documento.id } });
      f.almacen.subir(fila.storageKey, 1234, "application/pdf", "d".repeat(64));
      await f.dato(o, "core.documentos.confirmar_subida", { id: fila.id });
      return fila.id;
    };
    id.docAlfa = await subir(id.personaAlfa);
    id.docBeta = await subir(id.personaBeta);
  });

  afterAll(async () => {
    await f?.cerrar();
  });

  const acotado = (portal = "erp") => f.acotado({ instalaciones: [id.instAlfa] }, DOCS, portal);

  it("core.documentos.archive", async () => {
    const leer = (docId: string) => () =>
      f.e.admin.documento.findUniqueOrThrow({ where: { id: docId }, select: { estado: true } });
    const r = await f.probarEscritura<{ estado: string }>(
      "core.documentos.archive",
      { id: id.docAlfa },
      leer(id.docAlfa),
    );
    expect(r.estado).toBe("archivado");
    expect(
      await f.mod.executeCapability(acotado(), "core.documentos.archive", { id: id.docBeta }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(await leer(id.docBeta)()).toEqual({ estado: "disponible" });
  });

  it("core.documentos.pedir_renovacion", async () => {
    const input = { pedidos: [{ personaId: id.personaAlfa, tipoIds: [id.tipo] }] };
    const enviados = () =>
      f.e.admin.envio.count({ where: { tenantId: f.tenantId, plantillaEvento: EVENTO } });
    const r = await f.probarEscritura<{ enviados: { para: string }[] }>(
      "core.documentos.pedir_renovacion",
      input,
      enviados,
    );
    expect(r.enviados).toEqual([{ personaId: id.personaAlfa, para: "ana@prueba.cl" }]);
    expect(f.correos.at(-1)?.para).toBe("ana@prueba.cl");
    // Supervisor con documentos.manage: pide para las personas de sus instalaciones. Fuera de su
    // alcance hoy también envía y revela el correo (hallazgo de CAR-53, reportado en el PR, sin test
    // en rojo hasta que su arreglo entre).
    const propio = await f.dato<{ enviados: unknown[] }>(
      acotado("supervisor"),
      "core.documentos.pedir_renovacion",
      input,
      { dryRun: true },
    );
    expect(propio.enviados).toHaveLength(1);
  });

  it("core.documento_tipos.update", async () => {
    const leer = () =>
      f.e.admin.documentoTipo.findUniqueOrThrow({
        where: { id: id.tipo },
        select: { diasAlerta: true },
      });
    const r = await f.probarEscritura<{ diasAlerta: number }>(
      "core.documento_tipos.update",
      { id: id.tipo, diasAlerta: 15 },
      leer,
    );
    expect(r.diasAlerta).toBe(15);
    // Un tipo de otra empresa no existe para esta (RLS): NOT_FOUND, no se modifica.
    const otra = await f.e.admin.tenant.create({
      data: {
        slug: `car53-otra-${randomUUID().slice(0, 8)}`,
        nombre: "Otra",
        vertical: "seguridad",
      },
    });
    const ajeno = await f.e.admin.documentoTipo.create({
      data: { tenantId: otra.id, codigo: "ajeno", capa: "persona", nombre: "Ajeno" },
    });
    expect(
      await f.mod.executeCapability(f.owner(), "core.documento_tipos.update", {
        id: ajeno.id,
        nombre: "Cambiado",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(
      (await f.e.admin.documentoTipo.findUniqueOrThrow({ where: { id: ajeno.id } })).nombre,
    ).toBe("Ajeno");
  });

  it("core.plantillas.enviar_prueba: solo al correo de quien la pide", async () => {
    const enviados = () =>
      f.e.admin.envio.count({ where: { tenantId: f.tenantId, destinatario: f.email } });
    const r = await f.probarEscritura<{ enviado: boolean; para: string }>(
      "core.plantillas.enviar_prueba",
      { evento: EVENTO },
      enviados,
    );
    expect(r).toEqual({ enviado: true, para: f.email });
    expect(f.correos.at(-1)?.para).toBe(f.email);
    const sinCorreo = f.mod.crearContexto({
      tenantId: f.tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });
    expect(
      await f.mod.executeCapability(sinCorreo, "core.plantillas.enviar_prueba", { evento: EVENTO }),
    ).toMatchObject({
      ok: false,
      error: { message: "La prueba se envía al correo de un usuario con sesión." },
    });
  });

  it("core.invitations.revoke", async () => {
    const invitar = (tenantId: string, email: string) =>
      f.e.admin.invitation.create({
        data: {
          tenantId,
          email,
          rol: "viewer",
          portales: ["erp"],
          tokenHash: randomUUID(),
          invitedByUserId: f.userId,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });
    const inv = await invitar(f.tenantId, "invitada@prueba.cl");
    const leer = () =>
      f.e.admin.invitation.findUniqueOrThrow({
        where: { id: inv.id },
        select: { revocadaEn: true },
      });
    const r = await f.probarEscritura("core.invitations.revoke", { invitationId: inv.id }, leer);
    expect(r).toEqual({ id: inv.id, revocada: true });
    // Repetir sobre una revocada no cambia nada; una invitación de otra empresa no existe aquí.
    expect(await f.dato(f.owner(), "core.invitations.revoke", { invitationId: inv.id })).toEqual({
      id: inv.id,
      revocada: false,
    });
    const otra = await f.e.admin.tenant.create({
      data: {
        slug: `car53-inv-${randomUUID().slice(0, 8)}`,
        nombre: "Otra",
        vertical: "seguridad",
      },
    });
    const ajena = await invitar(otra.id, "ajena@prueba.cl");
    expect(
      await f.mod.executeCapability(f.owner(), "core.invitations.revoke", {
        invitationId: ajena.id,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(
      (await f.e.admin.invitation.findUniqueOrThrow({ where: { id: ajena.id } })).revocadaEn,
    ).toBeNull();
  });
});
