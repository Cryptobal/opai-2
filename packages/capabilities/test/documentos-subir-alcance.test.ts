import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import { type Excepcion, tienePermisoEfectivo } from "@opai/domain";

import { herramientasMcp } from "../src/mcp";
import { contextoDePrueba } from "../src/testing";
import type { Contexto } from "../src/types";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

// CAR-182 (decisión de Carlos, 4-nov-2026): el supervisor sube documentos SOLO a instalaciones que
// tiene a cargo. Permiso nuevo `core:documentos.subir_alcance`; `core:documentos.manage` no cambia.
beforeEach(reiniciar);

const SHA = "2".repeat(64);
const subida = (entidad: unknown, extra: Record<string, unknown> = {}) => ({
  entidad,
  nombre: "acta.pdf",
  mime: "application/pdf",
  tamano: 10,
  sha256: SHA,
  ...extra,
});

async function escenario() {
  const p = contextoDePrueba();
  const { ctx } = p;
  const cuenta = await dato<{ id: string }>(ctx, "core.cuentas.create", { nombre: "Andina" });
  const propia = await dato<{ id: string }>(ctx, "core.instalaciones.create", {
    cuentaId: cuenta.id,
    nombre: "Planta Norte",
  });
  const ajena = await dato<{ id: string }>(ctx, "core.instalaciones.create", {
    cuentaId: cuenta.id,
    nombre: "Planta Sur",
  });
  const persona = await dato<{ id: string }>(ctx, "core.personas.create", {
    nombres: "Ana",
    apellidos: "Rojas",
    rut: "19.876.543-0",
  });
  const tipo = (capa: string, portales: string[] = []) =>
    dato<{ id: string }>(ctx, "core.documento_tipos.create", {
      codigo: `t_${capa}`,
      capa,
      nombre: `Tipo ${capa}`,
      tieneVencimiento: false,
      visiblePortalDefault: portales,
    });
  const tipos = {
    empresa: (await tipo("empresa")).id,
    cuenta: (await tipo("cuenta")).id,
    instalacion: (await tipo("instalacion", ["cliente", "trabajador"])).id,
    persona: (await tipo("persona")).id,
  };
  // Mismo contexto (misma base en memoria) con la autorización real del rol supervisor.
  const como = (
    usuarioId: string,
    instalaciones: string[],
    excepciones: Excepcion[] = [],
  ): Contexto => ({
    ...ctx,
    rol: "supervisor",
    actor: { tipo: "user", id: usuarioId },
    alcance: { instalaciones },
    autorizar: (permiso) => tienePermisoEfectivo({ rol: "supervisor", excepciones }, permiso),
  });
  return { ...p, cuenta, propia, ajena, persona, tipos, como };
}

describe("el supervisor sube solo a instalaciones de su alcance", () => {
  it("sube a una instalación a su cargo: la vista previa y la subida real quedan sin visibilidad en portales", async () => {
    const { ctx, tabla, propia, tipos, como } = await escenario();
    const sup = como("sup-1", [propia.id]);
    const entrada = subida({ tipo: "instalacion", id: propia.id }, { tipoId: tipos.instalacion });
    expect(await codigo(sup, "core.documentos.iniciar_subida", entrada, { dryRun: true })).toBe(
      "OK",
    );
    const previa = await dato<{ documento: { visibleEn: string[] } }>(
      sup,
      "core.documentos.iniciar_subida",
      entrada,
      { dryRun: true },
    );
    expect(previa.documento.visibleEn).toEqual([]);
    await dato(sup, "core.documentos.iniciar_subida", entrada);
    const fila = tabla("documento")[0] as { visibleEn: string[]; creadoPorId: string };
    // El tipo trae «cliente» y «trabajador» por defecto: un supervisor no publica a portales.
    expect(fila.visibleEn).toEqual([]);
    expect(fila.creadoPorId).toBe("sup-1");
    // Quien gestiona documentos sí hereda la visibilidad por defecto del tipo (sin cambios).
    await dato(ctx, "core.documentos.iniciar_subida", entrada);
    const dueno = tabla("documento").find((d) => d["creadoPorId"] !== "sup-1") as {
      visibleEn: string[];
    };
    expect(dueno.visibleEn).toEqual(["cliente", "trabajador"]);
  });

  it("no sube a una instalación fuera de su alcance (ni a una que no existe: mismo error)", async () => {
    const { ajena, propia, tipos, como } = await escenario();
    const sup = como("sup-1", [propia.id]);
    for (const id of [ajena.id, randomUUID()]) {
      const r = await codigo(
        sup,
        "core.documentos.iniciar_subida",
        subida({ tipo: "instalacion", id }, { tipoId: tipos.instalacion }),
        { dryRun: true },
      );
      expect(r, id).toBe("NOT_FOUND");
    }
  });

  it("no sube a la empresa, a una cuenta, a una persona ni a un puesto", async () => {
    const { ctx, cuenta, persona, propia, tipos, como } = await escenario();
    const sup = como("sup-1", [propia.id]);
    const destinos = [
      [{ tipo: "tenant", id: ctx.tenantId }, tipos.empresa],
      [{ tipo: "cuenta", id: cuenta.id }, tipos.cuenta],
      [{ tipo: "persona", id: persona.id }, tipos.persona],
      [{ tipo: "puesto", id: randomUUID() }, undefined],
    ] as const;
    for (const [entidad, tipoId] of destinos) {
      const r = await codigo(
        sup,
        "core.documentos.iniciar_subida",
        subida(entidad, tipoId ? { tipoId } : {}),
        { dryRun: true },
      );
      expect(r, entidad.tipo).toBe("FORBIDDEN");
    }
  });

  it("no versiona un documento existente (nueva versión es de quien gestiona)", async () => {
    const { propia, tipos, como } = await escenario();
    const sup = como("sup-1", [propia.id]);
    const r = await codigo(
      sup,
      "core.documentos.iniciar_subida",
      subida({ tipo: "instalacion", id: propia.id }, { reemplazaAId: randomUUID() }),
      { dryRun: true },
    );
    expect(r).toBe("FORBIDDEN");
    expect(tipos.instalacion).toBeTruthy();
  });

  it("sin alcance (ve todo el tenant) y sin gestionar, el permiso no sirve para subir", async () => {
    const { ctx, propia, como } = await escenario();
    const sinAlcance: Contexto = { ...como("sup-1", []), alcance: null };
    const r = await codigo(
      sinAlcance,
      "core.documentos.iniciar_subida",
      subida({ tipo: "instalacion", id: propia.id }),
      { dryRun: true },
    );
    expect(r).toBe("NOT_FOUND");
    expect(ctx.tenantId).toBeTruthy();
  });

  it("un tipo de otra capa sigue rechazándose", async () => {
    const { propia, tipos, como } = await escenario();
    const sup = como("sup-1", [propia.id]);
    const r = await codigo(
      sup,
      "core.documentos.iniciar_subida",
      subida({ tipo: "instalacion", id: propia.id }, { tipoId: tipos.empresa }),
      { dryRun: true },
    );
    expect(r).toBe("UNPROCESSABLE");
  });

  it("sin el permiso (viewer) o con el permiso denegado por excepción, no sube a nada", async () => {
    const { ctx, propia, como } = await escenario();
    const entrada = subida({ tipo: "instalacion", id: propia.id });
    const viewer: Contexto = {
      ...ctx,
      rol: "viewer",
      alcance: null,
      autorizar: (p) => tienePermisoEfectivo({ rol: "viewer" }, p),
    };
    expect(await codigo(viewer, "core.documentos.iniciar_subida", entrada, { dryRun: true })).toBe(
      "FORBIDDEN",
    );
    const sup = como(
      "sup-1",
      [propia.id],
      [{ permiso: "core:documentos.subir_alcance", conceder: false }],
    );
    expect(await codigo(sup, "core.documentos.iniciar_subida", entrada, { dryRun: true })).toBe(
      "FORBIDDEN",
    );
  });

  it("quien gestiona documentos conserva todo (empresa, cuenta, persona, versión)", async () => {
    const { ctx, cuenta, persona, tipos } = await escenario();
    const destinos = [
      [{ tipo: "tenant", id: ctx.tenantId }, tipos.empresa],
      [{ tipo: "cuenta", id: cuenta.id }, tipos.cuenta],
      [{ tipo: "persona", id: persona.id }, tipos.persona],
    ] as const;
    for (const [entidad, tipoId] of destinos) {
      expect(
        await codigo(ctx, "core.documentos.iniciar_subida", subida(entidad, { tipoId }), {
          dryRun: true,
        }),
        entidad.tipo,
      ).toBe("OK");
    }
  });
});

describe("confirmar la subida: el supervisor solo confirma lo que subió él", () => {
  it("confirma el suyo; el de otro supervisor o el de quien gestiona no existe para él", async () => {
    const { ctx, tabla, almacen, propia, como } = await escenario();
    const yo = como("sup-1", [propia.id]);
    const otro = como("sup-2", [propia.id]);
    const entrada = subida({ tipo: "instalacion", id: propia.id });
    const mio = await dato<{ documento: { id: string } }>(
      yo,
      "core.documentos.iniciar_subida",
      entrada,
    );
    const delDueno = await dato<{ documento: { id: string } }>(
      ctx,
      "core.documentos.iniciar_subida",
      subida(
        { tipo: "instalacion", id: propia.id },
        { nombre: "otro.pdf", sha256: "3".repeat(64) },
      ),
    );
    for (const f of tabla("documento") as { storageKey: string; sha256: string }[])
      almacen.subir(f.storageKey, 10, "application/pdf", f.sha256);
    expect(await codigo(otro, "core.documentos.confirmar_subida", { id: mio.documento.id })).toBe(
      "NOT_FOUND",
    );
    expect(
      await codigo(yo, "core.documentos.confirmar_subida", { id: delDueno.documento.id }),
    ).toBe("NOT_FOUND");
    expect(await codigo(yo, "core.documentos.confirmar_subida", { id: mio.documento.id })).toBe(
      "OK",
    );
  });
});

describe("paridad: la misma capacidad, ahora visible para quien tiene el permiso nuevo", () => {
  it("el MCP ofrece la subida al supervisor y no a un viewer", async () => {
    const { ctx, propia, como } = await escenario();
    const nombres = (c: Contexto) => herramientasMcp(c).map((h) => h.nombre);
    expect(nombres(como("sup-1", [propia.id]))).toContain("core_documentos_iniciar_subida");
    const viewer: Contexto = {
      ...ctx,
      rol: "viewer",
      autorizar: (p) => tienePermisoEfectivo({ rol: "viewer" }, p),
    };
    expect(nombres(viewer)).not.toContain("core_documentos_iniciar_subida");
  });
});
