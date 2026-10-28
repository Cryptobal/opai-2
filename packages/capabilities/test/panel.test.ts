import { destinoVinculo } from "./vinculo-fixture";
import { beforeEach, describe, expect, it } from "vitest";

import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "../src";
import { contextoDePrueba } from "../src/testing";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const ok = <T>(r: { ok: boolean; data?: unknown }) => {
  if (!r.ok) throw new Error(JSON.stringify(r));
  return r.data as T;
};

type Actividad = { items: { accion: string; actor: { agente: boolean }; cambios: unknown[] }[] };

describe("pantallas de la sesión C: actividad, contadores y pendientes", () => {
  it("la actividad de una cuenta incluye sus escrituras y las de sus contactos", async () => {
    const { ctx } = contextoDePrueba();
    const c = ok<{ id: string }>(
      await executeCapability(ctx, "core.cuentas.create", { nombre: "Logística Andina" }),
    );
    await executeCapability(ctx, "core.contactos.create", {
      cuentaId: c.id,
      nombres: "Paula",
      apellidos: "Riquelme",
      email: "paula@logandina.cl",
    });
    await executeCapability(ctx, "core.cuentas.create", { nombre: "Otra cuenta" });
    const a = ok<Actividad>(
      await executeCapability(ctx, "core.actividad.list", {
        entidad: { tipo: "cuenta", id: c.id },
      }),
    );
    expect(a.items.map((i) => i.accion)).toEqual([
      "creó el contacto Paula Riquelme",
      "creó la cuenta Logística Andina",
    ]);
    expect(a.items[0]?.actor.agente).toBe(false);
  });

  it("la actividad de toda la empresa exige permiso de auditoría", async () => {
    const { ctx } = contextoDePrueba({ rol: "supervisor" });
    const r = await executeCapability(ctx, "core.actividad.list", {});
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("los contadores devuelven null donde no hay permiso", async () => {
    const { ctx } = contextoDePrueba({ rol: "supervisor" });
    const n = ok<Record<string, number | null>>(
      await executeCapability(ctx, "core.resumen.contadores", {}),
    );
    expect(n["cuentas"]).toBe(0);
    expect(n["aprobacionesPendientes"]).toBeNull();
  });

  it("sin permiso de documentos o personas no revela vencimientos", async () => {
    for (const permiso of ["core:documentos.read", "core:personas.read"]) {
      const { ctx } = contextoDePrueba();
      const limitado = { ...ctx, autorizar: (p: string) => p !== permiso && ctx.autorizar(p) };
      const items = ok<{ tipo: string }[]>(
        await executeCapability(limitado, "core.inicio.pendientes", {}),
      );
      expect(items.some((item) => item.tipo === "documentos")).toBe(false);
      const matriz = await executeCapability(limitado, "core.documentos.matriz", {});
      expect(matriz).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    }
  });

  it("Inicio usa los vencimientos de la misma matriz de personas", async () => {
    const { ctx } = contextoDePrueba({
      semilla: {
        persona: [
          {
            id: "persona-1",
            nombres: "Persona",
            apellidos: "Prueba",
            archivadaEn: null,
            estado: "activa",
          },
        ],
        documentoTipo: [
          {
            id: "tipo-1",
            capa: "persona",
            activo: true,
            obligatorio: false,
            tieneVencimiento: true,
            diasAlerta: 30,
            nombre: "Documento",
            orden: 0,
          },
        ],
        documentoVinculo: [
          {
            documentoId: "doc-1",
            entidadTipo: "persona",
            entidadId: "persona-1",
            rol: "propietario",
          },
        ],
        documento: [
          {
            id: "doc-1",
            tipoId: "tipo-1",
            estado: "disponible",
            venceEn: new Date("2020-01-01"),
            version: 1,
          },
        ],
      },
    });
    const matriz = ok<{ resumen: { vencidos: number; porVencer: number } }>(
      await executeCapability(ctx, "core.documentos.matriz", {}),
    );
    expect(matriz.resumen.vencidos).toBe(1);
    const items = ok<{ tipo: string; titulo: string }[]>(
      await executeCapability(ctx, "core.inicio.pendientes", {}),
    );
    expect(items).toContainEqual(
      expect.objectContaining({
        tipo: "documentos",
        titulo: "1 documento vencido · 0 vencen pronto",
      }),
    );
  });

  it("avisa cuando la matriz supera las 2.000 personas accesibles", async () => {
    const personas = Array.from({ length: 2001 }, (_, i) => ({
      id: `persona-${i}`,
      nombres: "Persona",
      apellidos: String(i),
      archivadaEn: null,
      estado: "activa",
    }));
    const { ctx } = contextoDePrueba({ semilla: { persona: personas } });
    const matriz = ok<{ limiteExcedido: boolean; resumen: { personas: number } }>(
      await executeCapability(ctx, "core.documentos.matriz", {}),
    );
    expect(matriz.limiteExcedido).toBe(true);
    expect(matriz.resumen.personas).toBe(2000);
    const items = ok<{ tipo: string; titulo: string }[]>(
      await executeCapability(ctx, "core.inicio.pendientes", {}),
    );
    expect(items).toContainEqual(
      expect.objectContaining({ tipo: "documentos", titulo: "Vencimientos sin conteo completo" }),
    );
  });

  it("sin nada pendiente, Inicio no muestra decisiones", async () => {
    const { ctx } = contextoDePrueba();
    expect(ok<unknown[]>(await executeCapability(ctx, "core.inicio.pendientes", {}))).toEqual([]);
  });
});

describe("la actividad no muestra sueldos sin el permiso sensible", () => {
  it("una excepción de sueldo aparece en la ficha de la persona con los montos ocultos", async () => {
    const { ctx } = contextoDePrueba();
    const cargo = ok<{ id: string }>(
      await executeCapability(ctx, "core.cargos.create", { nombre: "Guardia" }),
    );
    await executeCapability(ctx, "core.estructuras.create", {
      nivel: "cargo",
      cargoId: cargo.id,
      sueldoBase: 560_000,
      vigenteDesde: "2026-01-01",
    });
    const p = ok<{ id: string }>(
      await executeCapability(ctx, "core.personas.create", {
        nombres: "María",
        apellidos: "Soto",
        rut: "16.234.567-2",
        vinculo: { ...(await destinoVinculo(ctx)), cargoId: cargo.id, tipo: "indefinido", inicio: "2026-01-05" },
      }),
    );
    ok(
      await executeCapability(ctx, "core.estructuras.create", {
        nivel: "persona",
        personaId: p.id,
        sueldoBase: 1_250_000,
        colacion: 0,
        movilizacion: 0,
        gratificacion: "ninguna",
        motivo: "Excepción acordada",
        vigenteDesde: "2026-02-01",
      }),
    );
    const sinPermiso = { ...ctx, autorizar: (x: string) => x !== "core:estructuras.read_sensible" };
    const a = ok<{ items: { capability: string; detalle: unknown; cambios: unknown[] }[] }>(
      await executeCapability(sinPermiso, "core.actividad.list", {
        entidad: { tipo: "persona", id: p.id },
      }),
    );
    const texto = JSON.stringify(
      a.items.filter((i) => i.capability.startsWith("core.estructuras")),
    );
    expect(texto).toContain("••••");
    expect(texto).not.toContain("1250000");
    const owner = ok<{ items: { detalle: unknown }[] }>(
      await executeCapability(ctx, "core.actividad.list", {
        entidad: { tipo: "persona", id: p.id },
      }),
    );
    expect(JSON.stringify(owner.items)).toContain("1250000");
  });
});
