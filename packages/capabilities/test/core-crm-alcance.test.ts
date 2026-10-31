import { beforeEach, describe, expect, it } from "vitest";

import type { Rol } from "@opai/domain";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import type { Alcance } from "../src/types";
import { CU, CU2, I1, N1, reiniciarComercial, semillaComercial } from "./comercial-ayuda";
import { codigo, dato } from "./maestros-ayuda";

// CRM PR 2a (CAR-26), correcciones del Revisor: el negocio exige el permiso de Comercial y la
// actividad respeta el alcance (propias / equipo / todas, ADR-022) y decide por permiso, no por rol.
beforeEach(reiniciarComercial);

const U2 = {
  id: "0192f3a0-0000-7000-8000-0000000000c9",
  nombre: "Leo",
  email: "leo@prueba.cl",
  platformRole: null,
};
const member = (id: string, userId: string) => ({
  id,
  tenantId: TENANT_DE_PRUEBA,
  userId,
  estado: "activa",
  rol: "owner",
});

const BASE = [
  "core:actividades.read",
  "core:actividades.manage",
  "core:etiquetas.read",
  "core:etiquetas.manage",
  "core:cuentas.read",
];
const DUENO_ID = USUARIO_DE_PRUEBA.id;

const id = (n: number) => `0192f3a0-0000-7000-8000-00000000${String(n).padStart(4, "0")}`;
const A_NEG = id(1); // nota ligada a un negocio y a CU, creada por el dueño
const A_CU = id(2); // nota ligada a CU, creada por el dueño
const A_CU2 = id(3); // nota ligada a CU2 (fuera del equipo de I1), creada por el dueño
const T_CU = id(4); // tarea de CU asignada a U2
const T_CU2 = id(5); // tarea de CU2 del dueño
const T_PROPIA = id(6); // tarea de CU2 asignada a U2
type FilaAct = [string, string, string | null, string, string[]]; // id, tipo, negocio, cuenta, responsables
const FILAS: FilaAct[] = [
  [A_NEG, "nota", N1, CU, []],
  [A_CU, "nota", null, CU, []],
  [A_CU2, "nota", null, CU2, []],
  [T_CU, "tarea", null, CU, [U2.id]],
  [T_CU2, "tarea", null, CU2, [DUENO_ID]],
  [T_PROPIA, "tarea", null, CU2, [U2.id]],
];
const vinculo = (
  n: number,
  actividadId: string,
  negocioId: string | null,
  cuentaId: string | null,
) => ({
  id: id(n),
  tenantId: TENANT_DE_PRUEBA,
  actividadId,
  negocioId,
  cuentaId,
  contactoId: null,
  instalacionId: null,
});
function actividades() {
  const base = {
    tenantId: TENANT_DE_PRUEBA,
    detalle: null,
    todoElDia: false,
    asistentes: [],
    acuerdos: null,
    proximoPaso: null,
    completadaEn: null,
    completadaPorId: null,
    vencimiento: null,
    ocurrioEn: new Date("2026-01-01T00:00:00Z"),
    creadaPorId: DUENO_ID,
  };
  return {
    actividad: FILAS.map(([i, tipo]) => ({
      ...base,
      id: i,
      tipo,
      titulo: `Actividad ${i.slice(-2)}`,
      prioridad: tipo === "tarea" ? "media" : null,
      estado: tipo === "tarea" ? "pendiente" : null,
    })),
    // Una fila de vínculo por entidad: la actividad con negocio tiene además su cuenta.
    actividadVinculo: FILAS.flatMap(([i, , neg, cu], n) => [
      vinculo(100 + n, i, null, cu),
      ...(neg ? [vinculo(200 + n, i, neg, null)] : []),
    ]),
    actividadResponsable: FILAS.flatMap(([i, , , , resp], n) =>
      resp.map((u, k) => ({
        id: id(300 + n * 10 + k),
        tenantId: TENANT_DE_PRUEBA,
        actividadId: i,
        usuarioId: u,
      })),
    ),
  };
}

function actor(
  o: { rol?: Rol | null; permisos?: string[]; alcance?: Alcance; yo?: typeof U2 } = {},
) {
  return contextoDePrueba({
    semilla: {
      ...semillaComercial({ conNegocio: true }),
      ...actividades(),
      membership: [
        member("0192f3a0-0000-7000-8000-0000000000d1", USUARIO_DE_PRUEBA.id),
        member("0192f3a0-0000-7000-8000-0000000000d2", U2.id),
      ],
    },
    modulosActivos: ["comercial"],
    ...(o.rol !== undefined ? { rol: o.rol } : {}),
    ...(o.permisos ? { permisos: o.permisos } : {}),
    ...(o.alcance ? { alcance: o.alcance } : {}),
    ...(o.yo ? { usuario: o.yo } : {}),
  });
}

const sinComercial = () => actor({ rol: null, permisos: BASE });
const conComercial = () => actor({ rol: null, permisos: [...BASE, "comercial:negocios.read"] });
const nota = (vinculos: { tipo: string; id: string }[], extra: Record<string, unknown> = {}) => ({
  tipo: "nota",
  titulo: "Seguimiento",
  vinculos,
  ...extra,
});
const ids = (r: { items: { id: string }[] }) => r.items.map((i) => i.id).sort();

describe("el negocio exige el permiso de lectura de Comercial", () => {
  it("sin el permiso no se acepta en actividades ni etiquetas, ni en vista previa", async () => {
    const { ctx } = sinComercial();
    for (const dryRun of [false, true]) {
      const o = { dryRun };
      expect(
        await codigo(ctx, "core.actividades.create", nota([{ tipo: "negocio", id: N1 }]), o),
      ).toBe("FORBIDDEN");
      const e = { entidadTipo: "negocio", entidadIds: [N1], etiquetaIds: [N1] };
      expect(await codigo(ctx, "core.etiquetas.asignar", e, o)).toBe("FORBIDDEN");
      expect(await codigo(ctx, "core.etiquetas.quitar", e, o)).toBe("FORBIDDEN");
    }
  });

  it("sin el permiso no se devuelve: timeline y etiquetas de un negocio dan FORBIDDEN", async () => {
    const { ctx } = sinComercial();
    expect(
      await codigo(ctx, "core.actividades.timeline", { entidadTipo: "negocio", entidadId: N1 }),
    ).toBe("FORBIDDEN");
    expect(
      await codigo(ctx, "core.etiquetas.de_entidad", { entidadTipo: "negocio", entidadId: N1 }),
    ).toBe("FORBIDDEN");
  });

  it("una actividad ligada a un negocio no se ve ni se edita sin el permiso", async () => {
    const con = await dato<{ items: { id: string }[] }>(
      conComercial().ctx,
      "core.actividades.timeline",
      { entidadTipo: "cuenta", entidadId: CU },
    );
    expect(ids(con)).toEqual([A_CU, A_NEG, T_CU].sort());
    const { ctx } = sinComercial();
    const sin = await dato<{ items: { id: string }[] }>(ctx, "core.actividades.timeline", {
      entidadTipo: "cuenta",
      entidadId: CU,
    });
    expect(ids(sin)).toEqual([A_CU, T_CU].sort());
    expect(await codigo(ctx, "core.actividades.update", { id: A_NEG, titulo: "x" })).toBe(
      "NOT_FOUND",
    );
  });

  it("con el permiso se acepta y se devuelve el negocio", async () => {
    const { ctx } = conComercial();
    expect(await codigo(ctx, "core.actividades.create", nota([{ tipo: "negocio", id: N1 }]))).toBe(
      "OK",
    );
    const t = await dato<{ items: { vinculos: { tipo: string }[] }[] }>(
      ctx,
      "core.actividades.timeline",
      { entidadTipo: "negocio", entidadId: N1 },
    );
    expect(t.items.length).toBeGreaterThan(0);
  });
});

describe("la actividad respeta el alcance (propias / equipo / todas)", () => {
  const equipo = () =>
    actor({ rol: null, permisos: BASE, alcance: { instalaciones: [I1] }, yo: U2 });

  it("fuera del alcance, las mutaciones por id responden como si no existiera", async () => {
    const { ctx } = equipo();
    for (const dryRun of [false, true]) {
      expect(
        await codigo(ctx, "core.actividades.update", { id: A_CU2, titulo: "x" }, { dryRun }),
      ).toBe("NOT_FOUND");
      expect(await codigo(ctx, "core.actividades.delete", { id: A_CU2 }, { dryRun })).toBe(
        "NOT_FOUND",
      );
      expect(await codigo(ctx, "core.actividades.completar", { id: T_CU2 }, { dryRun })).toBe(
        "NOT_FOUND",
      );
    }
  });

  it("las tareas fuera del equipo no se listan, ni pidiendo al responsable", async () => {
    const { ctx } = equipo();
    const mias = await dato<{ items: { id: string }[] }>(ctx, "core.actividades.tareas", {});
    expect(ids(mias)).toEqual([T_CU, T_PROPIA].sort());
    const delDueno = await dato<{ items: { id: string }[] }>(ctx, "core.actividades.tareas", {
      responsableId: DUENO_ID,
    });
    expect(ids(delDueno)).toEqual([]);
  });

  it("dentro del alcance edita, y lo propio se ve aunque apunte fuera", async () => {
    const { ctx } = equipo();
    expect(await codigo(ctx, "core.actividades.update", { id: A_CU, titulo: "Editada" })).toBe(
      "OK",
    );
    expect(await codigo(ctx, "core.actividades.completar", { id: T_PROPIA })).toBe("OK");
  });

  it("sin alcance acotado (todas) ve y edita cualquiera", async () => {
    const { ctx } = actor({ rol: null, permisos: BASE, yo: U2 });
    expect(await codigo(ctx, "core.actividades.update", { id: A_CU2, titulo: "x" })).toBe("OK");
    const todas = await dato<{ items: { id: string }[] }>(ctx, "core.actividades.tareas", {
      responsableId: DUENO_ID,
    });
    expect(ids(todas)).toEqual([T_CU2]);
  });
});

describe("eliminar decide por permiso, no por rol (rol personalizado)", () => {
  it("otro con rol personalizado no elimina lo ajeno, ni en vista previa, salvo con el permiso de administrar", async () => {
    const otro = actor({ rol: null, permisos: BASE, yo: U2 }).ctx;
    expect(await codigo(otro, "core.actividades.delete", { id: A_CU }, { dryRun: true })).toBe(
      "FORBIDDEN",
    );
    expect(await codigo(otro, "core.actividades.delete", { id: A_CU })).toBe("FORBIDDEN");
    const admin = actor({ rol: null, permisos: [...BASE, "core:actividades.admin"], yo: U2 }).ctx;
    expect(await codigo(admin, "core.actividades.delete", { id: A_CU })).toBe("OK");
  });

  it("quien la creó la elimina aunque su rol sea personalizado", async () => {
    const { ctx } = actor({ rol: null, permisos: BASE });
    expect(await codigo(ctx, "core.actividades.delete", { id: A_CU })).toBe("OK");
  });

  it("owner y admin tienen el permiso; gerente no", async () => {
    for (const [rol, esperado] of [
      ["owner", "OK"],
      ["admin", "OK"],
      ["gerente", "FORBIDDEN"],
    ] as const) {
      const { ctx } = actor({ rol, yo: U2 });
      expect(await codigo(ctx, "core.actividades.delete", { id: A_CU })).toBe(esperado);
    }
  });
});
