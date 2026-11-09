// Anexo de contrato (Brief 07b, PR 4, pendientes) contra Postgres real: aprobar con una estructura
// legítima de la persona, documento sin columnas vacías en un cambio de capa, y el documento del
// anexo fuera de matriz, vencimientos, versiones, actividad, exportación y avisos para quien no
// tiene `anexos.read` ni `estructuras.read_sensible`.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { digitoVerificador } from "@opai/domain";

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

type Fila = { concepto: string; antes: string; despues: string };
/** Intl usa espacio duro («$\u00a0700.000») según la versión de ICU del runner. */
const sinNbsp = (t: string | undefined) => (t ?? "").replace(/\u00a0/g, " ");
const normal = (f: Fila | undefined) =>
  f && { ...f, antes: sinNbsp(f.antes), despues: sinNbsp(f.despues) };

describe.skipIf(!urlPropietario)("anexo de contrato: pendientes del PR #91 en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let userId = "";
  let cargoId = "";
  let instalacionId = "";
  let n = 0;
  const almacen = almacenamientoEnMemoria();
  /** Cuerpos subidos (el HTML del documento final), para revisar lo que quedó impreso. */
  const cuerpos = new Map<string, string>();
  const almacenamiento = {
    ...almacen.almacenamiento,
    subir: async (clave: string, cuerpo: string, mime: string, sha: string) => {
      cuerpos.set(clave, cuerpo);
      return almacen.almacenamiento.subir(clave, cuerpo, mime, sha);
    },
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const s = randomUUID().slice(0, 8);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `anx-s-${s}`, nombre: `anx-s-${s}`, vertical: "seguridad" },
      })
    ).id;
    userId = (
      await e.admin.user.create({
        data: { name: "Rosa", email: `rosa-s-${s}@prueba.cl`, emailVerified: true },
      })
    ).id;
    await e.admin.membership.create({
      data: { tenantId, userId, rol: "owner", portales: ["erp"] },
    });
    cargoId = (await dato<{ id: string }>(ctx(), "core.cargos.create", { nombre: "Guardia" })).id;
    instalacionId = (await destinoVinculo(ctx())).instalacionId;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = (rol = "owner") =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "Rosa", email: "rosa@prueba.cl", platformRole: null },
      rol: rol as never,
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
      servicios: { almacenamiento },
    });

  async function dato<T>(c: ModuloCapacidades.Contexto, id: string, input: unknown): Promise<T> {
    const r = await mod.executeCapability(c, id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  /** Persona nueva con vínculo vigente en la instalación de prueba (cada test con la suya). */
  async function persona() {
    n++;
    const p = await dato<{ id: string }>(ctx(), "core.personas.create", {
      nombres: `Elena ${n}`,
      apellidos: "Ríos",
      rut: `${10_000_000 + n}-${digitoVerificador(String(10_000_000 + n))}`,
      vinculo: {
        ...(await destinoVinculo(ctx())),
        cargoId,
        tipo: "indefinido",
        inicio: "2026-01-05",
      },
    });
    const v = await e.admin.vinculoLaboral.findFirstOrThrow({
      where: { personaId: p.id, estado: "vigente" },
    });
    return { personaId: p.id, vinculoId: v.id };
  }

  const estructura = (data: Record<string, unknown>) =>
    e.admin.estructuraSueldo.create({
      data: {
        tenantId,
        colacion: 40_000,
        movilizacion: 30_000,
        gratificacion: "ninguna",
        ...data,
      } as never,
    });

  /** Anexo de instalación aprobado (documento final en `core.documentos`). */
  async function anexoAprobado(personaId: string) {
    const a = await dato<{ id: string }>(ctx(), "core.anexos.generar", {
      personaId,
      motivoCambio: "instalacion",
      snapshotDespues: { instalacionId },
    });
    return dato<{ id: string; documentoId: string }>(ctx(), "core.anexos.aprobar", { id: a.id });
  }

  it("aprueba un anexo de monto con estructuras legítimas de la persona (FOR SHARE, camino feliz)", async () => {
    const { personaId } = await persona();
    const v1 = await estructura({
      nivel: "persona",
      personaId,
      sueldoBase: 700_000,
      motivo: "Acuerdo",
      vigenteDesde: new Date("2026-02-01"),
      vigenteHasta: new Date("2026-03-31"),
    });
    const v2 = await estructura({
      nivel: "persona",
      personaId,
      sueldoBase: 800_000,
      motivo: "Acuerdo",
      vigenteDesde: new Date("2026-04-01"),
    });
    const a = await dato<{ id: string }>(ctx(), "core.anexos.generar", {
      personaId,
      motivoCambio: "monto",
      snapshotAntes: { estructuraId: v1.id },
      snapshotDespues: { estructuraId: v2.id },
    });
    const detalle = await dato<{ filas: Fila[] }>(ctx(), "core.anexos.get", { id: a.id });
    expect(normal(detalle.filas.find((f) => f.concepto === "Sueldo base"))).toEqual({
      concepto: "Sueldo base",
      antes: "$ 700.000",
      despues: "$ 800.000",
    });
    const aprobado = await dato<{ estado: string; documentoId: string }>(
      ctx(),
      "core.anexos.aprobar",
      { id: a.id },
    );
    expect(aprobado.estado).toBe("aprobado");
    const doc = await e.admin.documento.findUniqueOrThrow({ where: { id: aprobado.documentoId } });
    const html = cuerpos.get(doc.storageKey) ?? "";
    expect(sinNbsp(html)).toContain("$ 700.000");
    expect(sinNbsp(html)).toContain("$ 800.000");
  });

  it("cambio de capa sin versión previa: el «antes» es la capa que regía, no una columna de «—»", async () => {
    const { personaId } = await persona();
    await estructura({
      nivel: "instalacion",
      instalacionId,
      sueldoBase: 600_000,
      vigenteDesde: new Date("2026-01-01"),
    });
    const porRut = await estructura({
      nivel: "persona",
      personaId,
      sueldoBase: 650_000,
      motivo: "Excepción",
      vigenteDesde: new Date("2026-05-01"),
    });
    const a = await dato<{ id: string }>(ctx(), "core.anexos.generar", {
      personaId,
      motivoCambio: "capa",
      snapshotDespues: { estructuraId: porRut.id },
    });
    const { filas } = await dato<{ filas: Fila[] }>(ctx(), "core.anexos.get", { id: a.id });
    expect(normal(filas.find((f) => f.concepto === "Sueldo base"))).toEqual({
      concepto: "Sueldo base",
      antes: "$ 600.000",
      despues: "$ 650.000",
    });
    expect(filas.every((f) => f.antes !== "—" || f.despues !== "—")).toBe(true);
    // Sin ninguna estructura que mostrar, el documento no lleva filas (todas en «—»).
    const vacio = await dato<{ id: string }>(ctx(), "core.anexos.generar", {
      personaId: (await persona()).personaId,
      motivoCambio: "capa",
      snapshotDespues: { nota: "sin estructura" },
    });
    await e.admin.estructuraSueldo.updateMany({
      where: { tenantId, nivel: "instalacion" },
      data: { estado: "anulada" },
    });
    expect(
      (await dato<{ filas: Fila[] }>(ctx(), "core.anexos.get", { id: vacio.id })).filas,
    ).toEqual([]);
  });

  it("anulación: el «después» es la capa que queda al anular la versión por RUT", async () => {
    const { personaId } = await persona();
    await estructura({
      nivel: "instalacion",
      instalacionId,
      sueldoBase: 610_000,
      vigenteDesde: new Date("2026-01-01"),
    });
    const anulada = await estructura({
      nivel: "persona",
      personaId,
      sueldoBase: 690_000,
      motivo: "Excepción",
      estado: "anulada",
      vigenteDesde: new Date("2026-06-01"),
    });
    const a = await dato<{ id: string }>(ctx(), "core.anexos.generar", {
      personaId,
      motivoCambio: "capa",
      snapshotAntes: { estructuraId: anulada.id },
      snapshotDespues: { tipo: "anulacion", nivel: "persona", ref: personaId },
    });
    const { filas } = await dato<{ filas: Fila[] }>(ctx(), "core.anexos.get", { id: a.id });
    expect(normal(filas.find((f) => f.concepto === "Sueldo base"))).toEqual({
      concepto: "Sueldo base",
      antes: "$ 690.000",
      despues: "$ 610.000",
    });
    const pendientes = await dato<{ tipo: string; href: string }[]>(
      ctx(),
      "core.inicio.pendientes",
      {},
    );
    // CAR-210: «Revisar» abre el anexo concreto (el borrador más antiguo), no la lista de Personas.
    const masAntiguo = await e.admin.anexoContrato.findFirstOrThrow({
      where: { tenantId, estado: "borrador" },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, personaId: true },
    });
    expect(pendientes.find((p) => p.tipo === "anexos")?.href).toBe(
      `/personas/${masAntiguo.personaId}/anexos/${masAntiguo.id}`,
    );
  });

  it("matriz, vencimientos y versiones no muestran el documento del anexo sin anexos.read", async () => {
    const { personaId } = await persona();
    const { documentoId } = await anexoAprobado(personaId);
    const tipo = await e.admin.documentoTipo.create({
      data: {
        tenantId,
        codigo: `contrato-${randomUUID().slice(0, 6)}`,
        nombre: "Contrato",
        capa: "persona",
        obligatorio: true,
        tieneVencimiento: true,
      },
    });
    await e.admin.documento.update({
      where: { id: documentoId },
      data: { tipoId: tipo.id, venceEn: new Date(Date.now() + 5 * 86_400_000) },
    });
    const anexo = await e.admin.documento.findUniqueOrThrow({ where: { id: documentoId } });
    const nueva = await e.admin.documento.create({
      data: {
        tenantId,
        nombre: "contrato-v2.pdf",
        mime: "application/pdf",
        tamano: 10,
        storageKey: `${tenantId}/v2`,
        estado: "disponible",
        version: 2,
        reemplazaAId: anexo.id,
        creadoPorTipo: "user",
        creadoPorId: userId,
        confirmadoEn: new Date(),
      },
    });
    await e.admin.documentoVinculo.create({
      data: {
        tenantId,
        documentoId: nueva.id,
        entidadTipo: "persona",
        entidadId: personaId,
        rol: "propietario",
      },
    });
    for (const [rol, ve] of [
      ["gerente", false],
      ["owner", true],
    ] as const) {
      const matriz = await dato<{ filas: { celdas: { documentoId: string | null }[] }[] }>(
        ctx(rol),
        "core.documentos.matriz",
        {},
      );
      const celdas = matriz.filas.flatMap((f) => f.celdas.map((c) => c.documentoId));
      expect(celdas.includes(documentoId)).toBe(ve);
      const vencimientos = await dato<{ id: string }[]>(
        ctx(rol),
        "core.documentos.vencimientos",
        {},
      );
      expect(vencimientos.some((d) => d.id === documentoId)).toBe(ve);
      const get = await dato<{ versiones: { id: string }[] }>(ctx(rol), "core.documentos.get", {
        id: nueva.id,
      });
      expect(get.versiones.some((d) => d.id === documentoId)).toBe(ve);
    }
  });

  it("la actividad de la ficha y la exportación no revelan el anexo ni su documento", async () => {
    const { personaId } = await persona();
    const { documentoId } = await anexoAprobado(personaId);
    await dato(ctx(), "core.documentos.update", { id: documentoId, titulo: "Anexo sueldo Elena" });
    const actividad = async (rol: string) =>
      (
        await dato<{ items: { capability: string; entidad: { id: string } | null }[] }>(
          ctx(rol),
          "core.actividad.list",
          { entidad: { tipo: "persona", id: personaId }, limite: 100 },
        )
      ).items;
    const propia = await actividad("owner");
    expect(propia.some((i) => i.capability.startsWith("core.anexos."))).toBe(true);
    const ajena = await actividad("gerente");
    expect(ajena.some((i) => i.capability.startsWith("core.anexos."))).toBe(false);
    expect(ajena.some((i) => i.entidad?.id === documentoId)).toBe(false);
    const delDocumento = await dato<{ items: unknown[] }>(ctx("gerente"), "core.actividad.list", {
      entidad: { tipo: "documento", id: documentoId },
    });
    expect(delDocumento.items).toEqual([]);

    const { armarExportacion } = await import("../src/core/cumplimiento/exportacion-datos");
    const exportar = async (rol: string) =>
      (await armarExportacion(ctx(rol), { tipo: "persona", id: personaId } as never)) as {
        documentos: { nombre: string }[];
      };
    const doc = await e.admin.documento.findUniqueOrThrow({ where: { id: documentoId } });
    expect((await exportar("owner")).documentos.some((d) => d.nombre === doc.nombre)).toBe(true);
    expect((await exportar("gerente")).documentos.some((d) => d.nombre === doc.nombre)).toBe(false);
  });

  it("el aviso del documento del anexo solo llega a quien puede ver anexos", async () => {
    const { personaId } = await persona();
    const { documentoId } = await anexoAprobado(personaId);
    const s = randomUUID().slice(0, 8);
    const crear = async (rol: string) => {
      const u = await e.admin.user.create({
        data: { name: rol, email: `${rol}-${s}@prueba.cl`, emailVerified: true },
      });
      await e.admin.membership.create({ data: { tenantId, userId: u.id, rol, portales: ["erp"] } });
      return { id: u.id, email: u.email };
    };
    const [admin, supervisor, gerente] = [
      await crear("admin"),
      await crear("supervisor"),
      await crear("gerente"),
    ];
    const { conAccesoAnexo, esDocumentoDeAnexo } =
      await import("../src/core/comunicaciones/acceso-anexo");
    expect(await esDocumentoDeAnexo(ctx(), documentoId)).toBe(true);
    const para = await conAccesoAnexo(ctx(), [admin, supervisor, gerente]);
    expect(para.map((p) => p.id)).toEqual([admin.id]);
  });

  it("personas.list filtra por anexo en borrador solo con anexos.read", async () => {
    const { personaId } = await persona();
    await dato(ctx(), "core.anexos.generar", {
      personaId,
      motivoCambio: "instalacion",
      snapshotDespues: { instalacionId },
    });
    const lista = await dato<{ items: { id: string }[] }>(ctx(), "core.personas.list", {
      anexo: "borrador",
      limite: 100,
    });
    expect(lista.items.some((p) => p.id === personaId)).toBe(true);
    const borradores = await e.admin.anexoContrato.findMany({
      where: { tenantId, estado: "borrador" },
      select: { personaId: true },
    });
    expect(lista.items.every((p) => borradores.some((b) => b.personaId === p.id))).toBe(true);
    const gerente = await mod.executeCapability(ctx("gerente"), "core.personas.list", {
      anexo: "borrador",
    });
    expect(!gerente.ok && gerente.error.code).toBe("FORBIDDEN");
  });
});
