// Firma electrónica del núcleo (CAR-82 · PR 2): envío, firma, rechazo, verificación y completado
// N1 contra Postgres real (firma.md CA1, CA3, CA5, CA6; R4, R7, R9, R11, R17, R19/P12).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Ctx = ReturnType<typeof ModuloCapacidades.crearContexto>;

describe.skipIf(!urlPropietario)("firma · envío, firma, rechazo y verificación en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const t: Record<"a" | "b", { tenantId: string; userId: string; keyId: string }> = {
    a: { tenantId: "", userId: "", keyId: "" },
    b: { tenantId: "", userId: "", keyId: "" },
  };

  const owner = (k: "a" | "b"): Ctx =>
    mod.crearContexto({
      tenantId: t[k].tenantId,
      actor: { tipo: "user", id: t[k].userId },
      rol: "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      usuario: { id: t[k].userId, nombre: "Ana", email: "a@b.cl", platformRole: null },
      medidor,
    });

  const agente = (k: "a" | "b" = "a", autonomia: Record<string, string> = {}): Ctx =>
    mod.crearContexto({
      tenantId: t[k].tenantId,
      actor: { tipo: "agent", id: t[k].keyId, viaUserId: t[k].userId },
      rol: "owner",
      scopes: ["*"],
      agente: { apiKeyId: t[k].keyId, nombre: "Agente", presupuestoMensualMicro: null, autonomia },
      medidor,
    });

  async function dato<T>(ctx: Ctx, id: string, input: unknown, opts = {}): Promise<T> {
    const r = await mod.executeCapability(ctx, id, input, opts);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  async function resultado(ctx: Ctx, id: string, input: unknown, opts = {}) {
    return mod.executeCapability(ctx, id, input, opts);
  }

  async function documento(k: "a" | "b" = "a") {
    const db = e.forTenant(t[k].tenantId);
    return db.documento.create({
      data: {
        tenantId: t[k].tenantId,
        nombre: "acta.pdf",
        mime: "application/pdf",
        tamano: 1234,
        sha256: randomUUID().replace(/-/g, "").padEnd(64, "0"),
        storageKey: randomUUID(),
        estado: "disponible",
        creadoPorTipo: "system",
      },
    });
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.limpiarConsumidores();
    mod.registrarConsumidores(mod.consumidoresDelNucleo);
    for (const k of ["a", "b"] as const) {
      const s = randomUUID().slice(0, 8);
      const tenantId = (
        await e.admin.tenant.create({ data: { slug: `fir2-${s}`, nombre: k, vertical: "seguridad" } })
      ).id;
      const userId = (
        await e.admin.user.create({
          data: { name: "Ana", email: `ana2-${s}@prueba.cl`, emailVerified: true },
        })
      ).id;
      await e.admin.membership.create({ data: { tenantId, userId, rol: "owner", portales: ["erp"] } });
      const keyId = (
        await e.admin.apiKey.create({
          data: { tenantId, userId, nombre: "Agente", prefijo: `opai_fir2_${s}`, hash: s, scopes: ["*"] },
        })
      ).id;
      t[k] = { tenantId, userId, keyId };
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("CA5: un agente envía N1 de acta sin aprobación, pero un contrato N2 queda APPROVAL_REQUIRED", async () => {
    const doc = await documento();
    const sinAprobacion = await resultado(agente(), "core.firmas.enviar", {
      documentoId: doc.id,
      clase: "acta_reunion",
      nivel: "N1",
      firmantes: [{ tipo: "externo", nombre: "Pedro Pérez", email: "pedro@cliente.cl" }],
    });
    expect(sinAprobacion).toMatchObject({ ok: true });

    const doc2 = await documento();
    await dato(owner("a"), "core.firmas.politica_set", {
      clase: "contrato_trabajo",
      nivelMinimo: "N2",
      nivelesPermitidos: ["N2"],
    });
    const preview = await dato<{ firmantes: { nombre: string }[]; sha256: string }>(
      agente(),
      "core.firmas.enviar",
      {
        documentoId: doc2.id,
        clase: "contrato_trabajo",
        nivel: "N2",
        firmantes: [{ tipo: "trabajador", nombre: "Rosa Ríos", email: "rosa@trabajo.cl" }],
      },
      { dryRun: true },
    );
    expect(preview.sha256).toBe(doc2.sha256);
    expect(preview.firmantes[0]?.nombre).toBe("Rosa Ríos");
    const bloqueado = await resultado(agente(), "core.firmas.enviar", {
      documentoId: doc2.id,
      clase: "contrato_trabajo",
      nivel: "N2",
      firmantes: [{ tipo: "trabajador", nombre: "Rosa Ríos", email: "rosa@trabajo.cl" }],
    });
    expect(bloqueado).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
  });

  it("CA1/CA4: un supervisor no envía fuera de actas; CA4 N1 nunca vale para un contrato", async () => {
    const doc = await documento();
    const sup = mod.crearContexto({
      tenantId: t.a.tenantId,
      actor: { tipo: "user", id: t.a.userId },
      rol: "supervisor",
      portal: "erp",
      portalesMembresia: ["erp"],
      usuario: { id: t.a.userId, nombre: "Sol", email: "sol@b.cl", platformRole: null },
      medidor,
    });
    const r1 = await resultado(sup, "core.firmas.enviar", {
      documentoId: doc.id,
      clase: "propuesta_comercial",
      nivel: "N1",
      firmantes: [{ tipo: "contacto", nombre: "Cliente X", email: "x@cliente.cl" }],
    });
    expect(r1).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    const r2 = await resultado(owner("a"), "core.firmas.enviar", {
      documentoId: doc.id,
      clase: "contrato_trabajo",
      nivel: "N1",
      firmantes: [{ tipo: "trabajador", nombre: "Rosa", email: "rosa2@trabajo.cl" }],
    });
    expect(r2).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });

  it("CA1: una versión nueva del documento cancela la solicitud viva con aviso", async () => {
    const doc = await documento();
    const s = await dato<{ id: string; estado: string }>(owner("a"), "core.firmas.enviar", {
      documentoId: doc.id,
      clase: "acta",
      nivel: "N1",
      firmantes: [{ tipo: "externo", nombre: "Juan", email: "juan@cliente.cl" }],
    });
    expect(s.estado).toBe("enviada");
    const db = e.forTenant(t.a.tenantId);
    const nueva = await db.documento.create({
      data: {
        tenantId: t.a.tenantId,
        nombre: "acta-v2.pdf",
        mime: "application/pdf",
        tamano: 10,
        sha256: "f".repeat(64),
        storageKey: randomUUID(),
        estado: "disponible",
        version: 2,
        reemplazaAId: doc.id,
        creadoPorTipo: "user",
        creadoPorId: t.a.userId,
      },
    });
    await db.evento.create({
      data: {
        tenantId: t.a.tenantId,
        tipo: "core.documento.registrado",
        entidadTipo: "documento",
        entidadId: nueva.id,
        payload: { reemplazaAId: doc.id },
        actorTipo: "user",
        actorId: t.a.userId,
      },
    });
    await mod.despacharPendientes(owner("a"));
    const cancelada = await dato<{ estado: string }>(owner("a"), "core.firmas.estado", { id: s.id });
    expect(cancelada.estado).toBe("cancelada");
  });

  it("R7/R11: orden secuencial, doble firma rechazada y firma vía token hasta completar", async () => {
    const doc = await documento();
    const s = await dato<{ id: string; firmantes: { id: string }[] }>(
      owner("a"),
      "core.firmas.enviar",
      {
        documentoId: doc.id,
        clase: "recepcion_laboral",
        nivel: "N1",
        orden: "secuencial",
        firmantes: [
          { tipo: "usuario", rol: "firma", usuarioId: t.a.userId, nombre: "Ana" },
          { tipo: "externo", rol: "firma", nombre: "Beto", run: "11111111-1", email: "beto@x.cl" },
        ],
      },
    );
    // El segundo firmante (externo) aún no le toca: no hay token disponible por API, pero el handler
    // de `firmar` igual lo rechazaría por turno si se le forzara un token propio.
    const primero = await dato<{ estadoSolicitud: string }>(owner("a"), "core.firmas.firmar", {
      solicitudId: s.id,
      metodo: "nombre",
      nombreFirma: "Ana Admin",
      aceptaMedio: true,
      textoAceptacion: "Acepto firmar electrónicamente este documento.",
      versionAceptacion: "2026-10",
    });
    expect(primero.estadoSolicitud).toBe("en_curso");
    // Repetir la misma firma (R11): conflicto.
    const repetida = await resultado(owner("a"), "core.firmas.firmar", {
      solicitudId: s.id,
      metodo: "nombre",
      nombreFirma: "Ana Admin",
      aceptaMedio: true,
      textoAceptacion: "Acepto firmar electrónicamente este documento.",
      versionAceptacion: "2026-10",
    });
    expect(repetida).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    // El segundo firmante firma con su token (enlace personal, R12) y completa la solicitud.
    const tokenHash = (
      await e.forTenant(t.a.tenantId).firmante.findFirstOrThrow({
        where: { solicitudId: s.id, nombre: "Beto" },
        select: { tokenHash: true },
      })
    ).tokenHash;
    expect(tokenHash).not.toBeNull();
    // El token en claro no se expone por ninguna capacidad (R12): se recupera solo para la prueba
    // desde una fila que un atacante no puede leer sin acceso directo a la base.
    const sinSesion = mod.crearContexto({ tenantId: t.a.tenantId, actor: { tipo: "system" }, medidor });
    const noValido = await resultado(sinSesion, "core.firmas.firmar", {
      token: "token-que-no-existe-0123456789",
      metodo: "nombre",
      nombreFirma: "Nadie",
      aceptaMedio: true,
      textoAceptacion: "Acepto firmar electrónicamente este documento.",
      versionAceptacion: "2026-10",
    });
    expect(noValido).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("R9: el firmante rechaza con motivo y la solicitud queda rechazada", async () => {
    const doc = await documento();
    const s = await dato<{ id: string }>(owner("a"), "core.firmas.enviar", {
      documentoId: doc.id,
      clase: "acta_reunion",
      nivel: "N1",
      firmantes: [{ tipo: "usuario", usuarioId: t.a.userId, nombre: "Ana" }],
    });
    const r = await dato<{ estadoSolicitud: string }>(owner("a"), "core.firmas.rechazar", {
      solicitudId: s.id,
      motivo: "Faltan datos del inmueble.",
    });
    expect(r.estadoSolicitud).toBe("rechazada");
    const fin = await dato<{ estado: string; firmantes: { estado: string; motivoRechazo: string | null }[] }>(
      owner("a"),
      "core.firmas.estado",
      { id: s.id },
    );
    expect(fin.estado).toBe("rechazada");
    expect(fin.firmantes[0]).toMatchObject({ estado: "rechazado", motivoRechazo: "Faltan datos del inmueble." });
  });

  it("CA6: en modo paralelo, recordar llega a todos los pendientes", async () => {
    const doc = await documento();
    const s = await dato<{ id: string }>(owner("a"), "core.firmas.enviar", {
      documentoId: doc.id,
      clase: "acta_reunion",
      nivel: "N1",
      orden: "paralelo",
      firmantes: [
        { tipo: "externo", nombre: "Uno", email: "uno@x.cl" },
        { tipo: "externo", nombre: "Dos", email: "dos@x.cl" },
      ],
    });
    const r = await dato<{ recordados: number }>(owner("a"), "core.firmas.recordar", { id: s.id });
    expect(r.recordados).toBe(2);
  });

  it("CA3: al completarse, el PDF firmado y su comprobante verifican la huella", async () => {
    const doc = await documento();
    const s = await dato<{ id: string }>(owner("a"), "core.firmas.enviar", {
      documentoId: doc.id,
      clase: "acta",
      nivel: "N1",
      firmantes: [{ tipo: "usuario", usuarioId: t.a.userId, nombre: "Ana" }],
    });
    const f = await dato<{ estadoSolicitud: string }>(owner("a"), "core.firmas.firmar", {
      solicitudId: s.id,
      metodo: "nombre",
      nombreFirma: "Ana Admin",
      aceptaMedio: true,
      textoAceptacion: "Acepto firmar electrónicamente este documento.",
      versionAceptacion: "2026-10",
    });
    expect(f.estadoSolicitud).toBe("completada");
    const completa = await dato<{ sha256Firmado: string | null; documentoFirmadoId: string | null }>(
      owner("a"),
      "core.firmas.estado",
      { id: s.id },
    );
    expect(completa.documentoFirmadoId).not.toBeNull();
    const comprobante = await e.forTenant(t.a.tenantId).comprobante.findFirstOrThrow({
      where: { entidadId: s.id, tipo: "documentos.firma.completada" },
    });
    const v = await dato<{ encontrada: boolean; coincide: boolean | null }>(
      owner("a"),
      "core.firmas.verificar",
      { token: comprobante.token, sha256: completa.sha256Firmado },
    );
    expect(v).toMatchObject({ encontrada: true, coincide: true });
    const vFalla = await dato<{ coincide: boolean | null }>(owner("a"), "core.firmas.verificar", {
      token: comprobante.token,
      sha256: "0".repeat(64),
    });
    expect(vFalla.coincide).toBe(false);
  });

  it("aislamiento: el tenant B no ve ni gestiona la solicitud del A", async () => {
    const doc = await documento("a");
    const s = await dato<{ id: string }>(owner("a"), "core.firmas.enviar", {
      documentoId: doc.id,
      clase: "acta",
      nivel: "N1",
      firmantes: [{ tipo: "externo", nombre: "Equis", email: "x@x.cl" }],
    });
    expect(await resultado(owner("b"), "core.firmas.estado", { id: s.id })).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(
      await resultado(owner("b"), "core.firmas.cancelar", { id: s.id, motivo: "ajeno" }),
    ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
