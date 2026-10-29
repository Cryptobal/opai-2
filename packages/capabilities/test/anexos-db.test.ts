// Anexo de contrato (Brief 07b, PR 4) contra Postgres real: aislamiento por tenant, permisos
// (D8/D13), gobierno de agentes (soloPersonas) y el documento final con SHA-256 y bitácora.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type * as Plantilla from "../src/core/anexos/plantilla";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";
import { destinoVinculo } from "./vinculo-fixture";

// CAR-58: la plantilla del repositorio es de ejemplo y bloquea la aprobación (eso lo prueba
// `anexos-plantilla-ejemplo.test.ts`). Aquí se simula el texto definitivo para seguir probando el
// camino completo de aprobación (bloqueo, revalidación, documento con SHA-256 y bitácora).
vi.mock("../src/core/anexos/plantilla", async (original) => ({
  ...(await original<typeof Plantilla>()),
  PLANTILLA_ANEXO: { version: "definitiva-de-prueba", esEjemplo: false },
}));

describe.skipIf(!urlPropietario)("anexo de contrato en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let otroTenantId = "";
  let userId = "";
  let personaId = "";
  let vinculoId = "";
  let instalacionId = "";
  const almacen = almacenamientoEnMemoria();

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.limpiarConsumidores();
    mod.registrarConsumidores(mod.consumidoresDelNucleo);
    const s = randomUUID().slice(0, 8);
    const tenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    tenantId = (await tenant(`anx-a-${s}`)).id;
    otroTenantId = (await tenant(`anx-b-${s}`)).id;
    userId = (
      await e.admin.user.create({
        data: { name: "Rosa", email: `rosa-${s}@prueba.cl`, emailVerified: true },
      })
    ).id;
    await e.admin.membership.create({
      data: { tenantId, userId, rol: "owner", portales: ["erp"] },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const usuario = () => ({
    id: userId,
    nombre: "Rosa",
    email: "rosa@prueba.cl",
    platformRole: null,
  });

  const ctx = (o: { rol?: string; actor?: Record<string, unknown> } = {}) =>
    mod.crearContexto({
      tenantId,
      actor: (o.actor as never) ?? { tipo: "user", id: userId },
      usuario: usuario(),
      rol: (o.rol as never) ?? "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
      servicios: { almacenamiento: almacen.almacenamiento },
    });

  const ctxOtro = () =>
    mod.crearContexto({
      tenantId: otroTenantId,
      actor: { tipo: "user", id: userId },
      usuario: usuario(),
      rol: "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
    });

  async function dato<T>(c: ModuloCapacidades.Contexto, id: string, input: unknown): Promise<T> {
    const r = await mod.executeCapability(c, id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  beforeAll(async () => {
    const cargo = await dato<{ id: string }>(ctx(), "core.cargos.create", { nombre: "Guardia" });
    const destino = await destinoVinculo(ctx());
    instalacionId = destino.instalacionId;
    const persona = await dato<{ id: string }>(ctx(), "core.personas.create", {
      nombres: "Elena",
      apellidos: "Ríos",
      rut: "17.123.456-5",
      vinculo: { ...destino, cargoId: cargo.id, tipo: "indefinido", inicio: "2026-01-05" },
    });
    personaId = persona.id;
    const v = await e.admin.vinculoLaboral.findFirstOrThrow({
      where: { personaId, estado: "vigente" },
    });
    vinculoId = v.id;
  });

  it("rechaza referencias de otra persona sin crear borrador", async () => {
    const cargoId = (await e.admin.vinculoLaboral.findUniqueOrThrow({ where: { id: vinculoId } }))
      .cargoId;
    const cuenta = await e.admin.cuenta.create({ data: { tenantId, nombre: "Otra cuenta" } });
    const instalacion = await e.admin.instalacion.create({
      data: { tenantId, cuentaId: cuenta.id, nombre: "Otra instalación" },
    });
    const puesto = await e.admin.puesto.create({
      data: {
        tenantId,
        instalacionId: instalacion.id,
        cargoId,
        nombre: "Otro puesto",
        diasTrabajo: 5,
        diasDescanso: 2,
        horaInicio: "08:00",
        horaFin: "17:00",
      },
    });
    const destino = {
      instalacionId: instalacion.id,
      puestoId: puesto.id,
      horasSemanales: 40,
      distribucion: "Lunes a viernes",
    };
    const otra = await dato<{ id: string }>(ctx(), "core.personas.create", {
      nombres: "Otra",
      apellidos: "Persona",
      rut: "11.111.111-1",
      vinculo: {
        ...destino,
        cargoId: (await e.admin.vinculoLaboral.findUniqueOrThrow({ where: { id: vinculoId } }))
          .cargoId,
        tipo: "indefinido",
        inicio: "2026-01-05",
      },
    });
    const estructura = await e.admin.estructuraSueldo.create({
      data: {
        tenantId,
        nivel: "persona",
        personaId: otra.id,
        vigenteDesde: new Date("2026-01-01"),
        sueldoBase: 900000,
      },
    });
    const antes = await e.admin.anexoContrato.count({ where: { tenantId, personaId } });
    for (const snapshotDespues of [
      { estructuraId: estructura.id },
      { instalacionId: destino.instalacionId },
      { puestoId: destino.puestoId },
    ]) {
      const r = await mod.executeCapability(ctx(), "core.anexos.generar", {
        personaId,
        motivoCambio: "monto",
        snapshotDespues,
      });
      expect(r.ok).toBe(false);
      expect(!r.ok && r.error.code).toBe("UNPROCESSABLE");
    }
    expect(await e.admin.anexoContrato.count({ where: { tenantId, personaId } })).toBe(antes);
  });

  it("acepta instalación de un vínculo anterior de la misma persona (decisión t500u)", async () => {
    const actual = await e.admin.vinculoLaboral.findUniqueOrThrow({ where: { id: vinculoId } });
    const cuenta = await e.admin.cuenta.create({ data: { tenantId, nombre: "Cuenta anterior" } });
    const instalacionAnterior = await e.admin.instalacion.create({
      data: { tenantId, cuentaId: cuenta.id, nombre: "Instalación anterior" },
    });
    await e.admin.vinculoLaboral.create({
      data: {
        tenantId,
        personaId,
        cargoId: actual.cargoId,
        instalacionId: instalacionAnterior.id,
        tipo: "indefinido",
        inicio: new Date("2025-01-01"),
        termino: new Date("2025-12-31"),
        motivoTermino: "Cambio de instalación",
        estado: "terminado",
      },
    });
    const anexo = await dato<{ id: string }>(ctx(), "core.anexos.generar", {
      personaId,
      motivoCambio: "instalacion",
      snapshotAntes: { instalacionId: instalacionAnterior.id },
      snapshotDespues: { instalacionId },
    });
    expect(anexo.id).toBeTruthy();
  });

  it("rechaza al aprobar un borrador contaminado insertado directo en la base", async () => {
    const cargoId = (await e.admin.vinculoLaboral.findUniqueOrThrow({ where: { id: vinculoId } }))
      .cargoId;
    const ajena = await dato<{ id: string }>(ctx(), "core.personas.create", {
      nombres: "Ajena",
      apellidos: "Persona",
      rut: "22.222.222-2",
      vinculo: { ...(await destinoVinculo(ctx())), cargoId, tipo: "indefinido", inicio: "2026-01-05" },
    });
    const estructuraAjena = await e.admin.estructuraSueldo.create({
      data: {
        tenantId,
        nivel: "persona",
        personaId: ajena.id,
        vigenteDesde: new Date("2026-01-01"),
        sueldoBase: 1_500_000,
      },
    });
    const contaminado = await e.admin.anexoContrato.create({
      data: {
        tenantId,
        personaId,
        vinculoId,
        motivoCambio: "monto",
        snapshotDespues: { estructuraId: estructuraAjena.id },
        generadoPorTipo: "usuario",
        generadoPorId: userId,
        estado: "borrador",
      },
    });
    const documentosAntes = await e.admin.documento.count({ where: { tenantId } });
    const r = await mod.executeCapability(ctx(), "core.anexos.aprobar", { id: contaminado.id });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("UNPROCESSABLE");
    const sinCambios = await e.admin.anexoContrato.findUniqueOrThrow({
      where: { id: contaminado.id },
    });
    expect(sinCambios.estado).toBe("borrador");
    expect(await e.admin.documento.count({ where: { tenantId } })).toBe(documentosAntes);
  });

  it("gerente no lee ni genera anexos (D8, bloqueo financiero)", async () => {
    const gerente = ctx({ rol: "gerente" });
    expect((await mod.executeCapability(gerente, "core.anexos.list", {})).ok).toBe(false);
    const r = await mod.executeCapability(gerente, "core.anexos.generar", {
      personaId,
      motivoCambio: "monto",
      snapshotDespues: { nota: "prueba" },
    });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe("FORBIDDEN");
  });

  it("un agente no aprueba ni rechaza (soloPersonas, ADR-032)", async () => {
    const agente = ctx({ actor: { tipo: "agent", id: "agente-1", viaUserId: userId } });
    const a = await dato<{ id: string }>(ctx(), "core.anexos.generar", {
      personaId,
      motivoCambio: "monto",
      snapshotDespues: { nota: "para el agente" },
    });
    const ap = await mod.executeCapability(agente, "core.anexos.aprobar", { id: a.id });
    expect(!ap.ok && ap.error.code).toBe("FORBIDDEN");
    const re = await mod.executeCapability(agente, "core.anexos.rechazar", {
      id: a.id,
      motivo: "No corresponde",
    });
    expect(!re.ok && re.error.code).toBe("FORBIDDEN");
  });

  it("otro tenant no ve ni aprueba el anexo ajeno (RLS)", async () => {
    const a = await dato<{ id: string }>(ctx(), "core.anexos.generar", {
      personaId,
      motivoCambio: "capa",
      snapshotDespues: { nota: "tenant A" },
    });
    const otro = ctxOtro();
    const get = await mod.executeCapability(otro, "core.anexos.get", { id: a.id });
    expect(!get.ok && get.error.code).toBe("NOT_FOUND");
    const lista = await dato<unknown[]>(otro, "core.anexos.list", {});
    expect(lista).toEqual([]);
    const aprobar = await mod.executeCapability(otro, "core.anexos.aprobar", { id: a.id });
    expect(!aprobar.ok && aprobar.error.code).toBe("NOT_FOUND");
  });

  it("aprueba y materializa el documento final con SHA-256 y bitácora (R15)", async () => {
    const a = await dato<{ id: string }>(ctx(), "core.anexos.generar", {
      personaId,
      motivoCambio: "instalacion",
      snapshotDespues: { instalacionId },
    });
    const preview = await mod.executeCapability(
      ctx(),
      "core.anexos.aprobar",
      { id: a.id },
      { dryRun: true },
    );
    expect(preview.ok && preview.data).toMatchObject({ estado: "aprobado" });
    expect(await e.admin.documento.count({ where: { tenantId } })).toBe(0); // dryRun no persiste.
    const aprobado = await dato<{ estado: string; documentoId: string }>(
      ctx(),
      "core.anexos.aprobar",
      { id: a.id },
    );
    expect(aprobado.estado).toBe("aprobado");
    const doc = await e.admin.documento.findUniqueOrThrow({
      where: { id: aprobado.documentoId as string },
    });
    // La relación del documento con el anexo es la marca sensible, incluso para registros existentes.
    for (const rol of ["gerente", "viewer", "supervisor"]) {
      const lector = {
        ...ctx({ rol }),
        ...(rol === "supervisor" ? { alcance: { instalaciones: [instalacionId] } } : {}),
      };
      const lista = await dato<{ items: { id: string }[] }>(lector, "core.documentos.list", {
        entidad: { tipo: "persona", id: personaId },
      });
      expect(lista.items.some((d) => d.id === doc.id)).toBe(false);
      for (const capacidad of ["core.documentos.get", "core.documentos.url_descarga"]) {
        const resultado = await mod.executeCapability(lector, capacidad, { id: doc.id });
        expect(!resultado.ok && resultado.error.code).toBe("NOT_FOUND");
      }
    }
    const subida = {
      entidad: { tipo: "persona", id: personaId },
      nombre: "prueba.pdf",
      mime: "application/pdf",
      tamano: 100,
      sha256: doc.sha256!,
    };
    const gerente = ctx({ rol: "gerente" });
    const duplicados = await mod.executeCapability(
      gerente,
      "core.documentos.iniciar_subida",
      subida,
      { dryRun: true },
    );
    expect(
      duplicados.ok &&
        (duplicados.data as { duplicados: { id: string }[] }).duplicados.some(
          (d) => d.id === doc.id,
        ),
    ).toBe(false);
    for (const lector of [gerente, ctx()]) {
      const reemplazo = await mod.executeCapability(
        lector,
        "core.documentos.iniciar_subida",
        { ...subida, reemplazaAId: doc.id },
        { dryRun: true },
      );
      expect(!reemplazo.ok && reemplazo.error.code).toBe("NOT_FOUND");
    }
    const confirmar = await mod.executeCapability(gerente, "core.documentos.confirmar_subida", {
      id: doc.id,
    });
    expect(!confirmar.ok && confirmar.error.code).toBe("NOT_FOUND");
    for (const rol of ["owner", "admin"]) {
      const lector = ctx({ rol });
      const lista = await dato<{ items: { id: string }[] }>(lector, "core.documentos.list", {
        entidad: { tipo: "persona", id: personaId },
      });
      expect(lista.items.some((d) => d.id === doc.id)).toBe(true);
      expect((await mod.executeCapability(lector, "core.documentos.get", { id: doc.id })).ok).toBe(
        true,
      );
      expect(
        (await mod.executeCapability(lector, "core.documentos.url_descarga", { id: doc.id })).ok,
      ).toBe(true);
    }
    expect(
      !(await mod.executeCapability(ctxOtro(), "core.documentos.url_descarga", { id: doc.id })).ok,
    ).toBe(true);
    expect(doc.estado).toBe("disponible");
    expect(doc.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(doc.bitacoraSeq).toBeGreaterThan(0);
    expect(await dato(ctx(), "core.bitacora.verificar", {})).toMatchObject({ ok: true });
    const otraVez = await mod.executeCapability(ctx(), "core.anexos.aprobar", { id: a.id });
    expect(!otraVez.ok && otraVez.error.code).toBe("CONFLICT");
  });

  it("rechaza con motivo obligatorio (D14) y no genera documento", async () => {
    const a = await dato<{ id: string }>(ctx(), "core.anexos.generar", {
      personaId,
      motivoCambio: "rol",
      snapshotDespues: { nota: "rechazo" },
    });
    expect(
      (await mod.executeCapability(ctx(), "core.anexos.rechazar", { id: a.id, motivo: "" })).ok,
    ).toBe(false);
    const rechazado = await dato<{ estado: string; motivoRechazo: string | null }>(
      ctx(),
      "core.anexos.rechazar",
      { id: a.id, motivo: "No corresponde todavía" },
    );
    expect(rechazado.estado).toBe("rechazado");
    expect(rechazado.motivoRechazo).toBe("No corresponde todavía");
    expect((await mod.executeCapability(ctx(), "core.anexos.aprobar", { id: a.id })).ok).toBe(
      false,
    );
  });

  it("el cambio de capa de una persona dispara el borrador solo (ADR-029); la jornada sola no", async () => {
    await dato(ctx(), "core.estructuras.create", {
      nivel: "persona",
      personaId,
      sueldoBase: 900_000,
      colacion: 0,
      movilizacion: 0,
      gratificacion: "ninguna",
      motivo: "Excepción acordada",
      vigenteDesde: "2026-03-01",
    });
    await mod.despacharPendientes(ctx());
    const pendientes = await dato<{ motivoCambio: string; estado: string }[]>(
      ctx(),
      "core.anexos.list",
      {
        personaId,
        estado: "borrador",
      },
    );
    expect(pendientes.some((p) => p.motivoCambio === "capa" || p.motivoCambio === "monto")).toBe(
      true,
    );

    const antes = pendientes.length;
    await dato(ctx(), "core.vinculos.update", {
      id: vinculoId,
      horasSemanales: 30,
      distribucion: "Lunes a sábado",
    });
    await mod.despacharPendientes(ctx());
    const despues = await dato<unknown[]>(ctx(), "core.anexos.list", {
      personaId,
      estado: "borrador",
    });
    expect(despues.length).toBe(antes); // Jornada sola: R11 no la incluye, sin anexo nuevo.
  });
});
