import { destinoVinculo } from "./vinculo-fixture";
import { PERMISOS_CORE } from "@opai/domain";
import { beforeEach, describe, expect, it } from "vitest";

import { autorizador } from "../src/contexto";
import { contextoDePrueba } from "../src/testing";
import type { Contexto } from "../src/types";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

/**
 * Las lecturas de maestros que el PR #53 colapsó en una sola consulta (`include` del vínculo y la
 * cuenta, `_count` de instalaciones/vínculos/puestos, `count` del total y la lista de cargos del
 * filtro) siguen detrás del permiso EFECTIVO del #47: rol base o personalizado + excepciones, con
 * «denegar gana». Se comparte la misma base en memoria y solo cambia `autorizar` con el acceso real
 * (`autorizador`), para ejercitar `tienePermisoEfectivo` de punta a punta, no un `autorizar` simulado.
 */
function conAcceso(ctx: Contexto, acceso: Parameters<typeof autorizador>[0]): Contexto {
  return { ...ctx, autorizar: autorizador(acceso, ctx.usuario) };
}

type FilaCargo = {
  nombre: string;
  sueldoVigente: { sueldoBase: number | null; sensible: boolean } | null;
};

const admin = (l: FilaCargo[]) => l.find((f) => f.nombre === "Administrativo")?.sueldoVigente;

describe("#47 · el include/_count del #53 respeta el permiso efectivo", () => {
  it("el sueldo sensible de cargos.list sigue el rol base y sus excepciones", async () => {
    const { ctx } = contextoDePrueba();
    const c = await dato<{ id: string }>(ctx, "core.cargos.create", {
      nombre: "Administrativo",
      sueldoSensible: true,
    });
    await dato(ctx, "core.estructuras.create", {
      nivel: "cargo",
      cargoId: c.id,
      sueldoBase: 900_000,
      vigenteDesde: "2026-01-01",
    });
    // `gerente` lee estructuras pero no el monto sensible (patrón del #47): montos ocultos.
    const gerente = conAcceso(ctx, { rol: "gerente" });
    expect(admin(await dato<FilaCargo[]>(gerente, "core.cargos.list", {}))).toMatchObject({
      sueldoBase: null,
      sensible: true,
    });
    // Una excepción que concede el monto sensible sobre ese mismo rol: montos visibles.
    const gerentePlus = conAcceso(ctx, {
      rol: "gerente",
      excepciones: [{ permiso: PERMISOS_CORE.estructurasReadSensible, conceder: true }],
    });
    expect(admin(await dato<FilaCargo[]>(gerentePlus, "core.cargos.list", {}))).toMatchObject({
      sueldoBase: 900_000,
      sensible: false,
    });
    // Denegar gana incluso sobre owner, que lo tendría por su rol.
    const ownerMenos = conAcceso(ctx, {
      rol: "owner",
      excepciones: [{ permiso: PERMISOS_CORE.estructurasReadSensible, conceder: false }],
    });
    expect(admin(await dato<FilaCargo[]>(ownerMenos, "core.cargos.list", {}))).toMatchObject({
      sueldoBase: null,
      sensible: true,
    });
  });

  it("el total/cargos/vínculo de personas.list exige personas.read efectivo", async () => {
    const { ctx } = contextoDePrueba();
    const { id: cargoId } = await dato<{ id: string }>(ctx, "core.cargos.create", {
      nombre: "Guardia",
    });
    await dato(ctx, "core.personas.create", {
      nombres: "María",
      apellidos: "Soto",
      rut: "16.234.567-2",
      vinculo: { ...(await destinoVinculo(ctx)), cargoId, tipo: "indefinido", inicio: "2025-03-03" },
    });
    type Lista = {
      items: { vinculoVigente: { cargo: string } | null }[];
      total: number;
      cargos?: { nombre: string }[];
    };
    // Rol base `gerente` (tiene personas.read): ve el total, el vínculo y los cargos del filtro.
    const lista = await dato<Lista>(conAcceso(ctx, { rol: "gerente" }), "core.personas.list", {
      incluirFiltros: true,
    });
    expect(lista.total).toBe(1);
    expect(lista.items[0]?.vinculoVigente?.cargo).toBe("Guardia");
    expect(lista.cargos?.map((x) => x.nombre)).toEqual(["Guardia"]);
    // Rol personalizado sin personas.read (solo lee estructuras): prohibido, no filtra solo por id.
    const sinPersonas = conAcceso(ctx, { rol: null, permisosRol: [PERMISOS_CORE.estructurasRead] });
    expect(await codigo(sinPersonas, "core.personas.list", {})).toBe("FORBIDDEN");
    // Una excepción que deniega personas.read sobre owner también prohíbe (denegar gana).
    const ownerMenos = conAcceso(ctx, {
      rol: "owner",
      excepciones: [{ permiso: PERMISOS_CORE.personasRead, conceder: false }],
    });
    expect(await codigo(ownerMenos, "core.personas.list", {})).toBe("FORBIDDEN");
  });

  it("personas.list no expone el catálogo de cargos sin estructuras.read efectivo", async () => {
    const { ctx } = contextoDePrueba();
    await dato(ctx, "core.cargos.create", { nombre: "Cargo sin personas asignadas" });
    const sinCargos = conAcceso(ctx, {
      rol: "owner",
      excepciones: [{ permiso: PERMISOS_CORE.estructurasRead, conceder: false }],
    });
    expect(await codigo(sinCargos, "core.cargos.list", {})).toBe("FORBIDDEN");
    const lista = await dato<{ cargos?: unknown[] }>(sinCargos, "core.personas.list", {
      incluirFiltros: true,
    });
    expect(lista.cargos).toBeUndefined();
  });

  it("cada conteo de resumen.contadores va en null sin el permiso efectivo", async () => {
    const { ctx } = contextoDePrueba();
    const { id: cuentaId } = await dato<{ id: string }>(ctx, "core.cuentas.create", {
      nombre: "Logística Andina",
    });
    await dato(ctx, "core.instalaciones.create", { cuentaId, nombre: "CD Pudahuel" });
    await dato(ctx, "core.personas.create", {
      nombres: "Juan",
      apellidos: "Pérez",
      rut: "12.345.678-5",
    });
    type Conteos = { cuentas: number | null; personas: number | null };
    // `gerente` lee cuentas y personas: ambos conteos salen.
    const gerente = await dato<Conteos>(
      conAcceso(ctx, { rol: "gerente" }),
      "core.resumen.contadores",
      {},
    );
    expect(gerente).toMatchObject({ cuentas: 1, personas: 1 });
    // Una excepción que deniega personas.read deja ese conteo en null aunque se pida.
    const sinPersonas = conAcceso(ctx, {
      rol: "gerente",
      excepciones: [{ permiso: PERMISOS_CORE.personasRead, conceder: false }],
    });
    const r = await dato<Conteos>(sinPersonas, "core.resumen.contadores", {
      campos: ["cuentas", "personas"],
    });
    expect(r).toMatchObject({ cuentas: 1, personas: null });
  });
});
