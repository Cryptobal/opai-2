import { beforeEach, describe, expect, it } from "vitest";

import { trabajoTareasVencidas } from "../src/core/crm/actividades-vencidas";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { CU, I1, N1, reiniciarComercial, semillaComercial } from "./comercial-ayuda";
import { dato } from "./maestros-ayuda";

// CAR-162 · Actividad y tareas: nombres en la salida, tareas por ficha y del equipo, aviso de vencida.
beforeEach(reiniciarComercial);

const OTRO = "0192f3a0-0000-7000-8000-0000000000bc";
const miembro = (id: string, userId: string) => ({
  id,
  tenantId: TENANT_DE_PRUEBA,
  userId,
  estado: "activa",
  rol: "owner",
});

function entorno() {
  const semilla = semillaComercial({ conNegocio: true });
  return contextoDePrueba({
    modulosActivos: ["comercial"],
    semilla: {
      ...semilla,
      user: [...semilla.user, { id: OTRO, name: "Bea Otra", email: "bea@prueba.cl" }],
      membership: [
        miembro("0192f3a0-0000-7000-8000-0000000000m1", USUARIO_DE_PRUEBA.id),
        miembro("0192f3a0-0000-7000-8000-0000000000m2", OTRO),
      ],
    },
    rol: "owner",
  });
}

type Item = {
  id: string;
  creadaPorNombre: string | null;
  responsablesDetalle: { nombre: string }[];
  vinculosDetalle: { tipo: string; nombre: string }[];
};
type Lista = { items: Item[] };

const tarea = (extra: Record<string, unknown> = {}) => ({
  tipo: "tarea",
  titulo: "Enviar propuesta",
  vencimiento: "2026-11-01T15:00:00Z",
  vinculos: [
    { tipo: "negocio", id: N1 },
    { tipo: "cuenta", id: CU },
  ],
  ...extra,
});

describe("actividades · nombres y filtros de tareas", () => {
  it("el timeline trae quién la creó, responsables y fichas con nombre", async () => {
    const { ctx } = entorno();
    await dato(ctx, "core.actividades.create", tarea());
    const t = await dato<Lista>(ctx, "core.actividades.timeline", {
      entidadTipo: "negocio",
      entidadId: N1,
    });
    expect(t.items[0]).toMatchObject({
      creadaPorNombre: "Ana",
      responsablesDetalle: [{ nombre: "Ana" }],
    });
    expect(t.items[0]?.vinculosDetalle.map((v) => v.nombre).sort()).toEqual(
      ["Cuenta 1", "Guardias · Planta 1"].sort(),
    );
  });

  it("filtra por ficha y por equipo, además de las propias", async () => {
    const { ctx } = entorno();
    const mia = await dato<{ id: string }>(ctx, "core.actividades.create", tarea());
    const ajena = await dato<{ id: string }>(
      ctx,
      "core.actividades.create",
      tarea({ responsables: [OTRO], vinculos: [{ tipo: "instalacion", id: I1 }] }),
    );
    const propias = await dato<Lista>(ctx, "core.actividades.tareas", {});
    expect(propias.items.map((i) => i.id)).toEqual([mia.id]);
    const equipo = await dato<Lista>(ctx, "core.actividades.tareas", { equipo: true });
    expect(equipo.items.map((i) => i.id).sort()).toEqual([mia.id, ajena.id].sort());
    const ficha = await dato<Lista>(ctx, "core.actividades.tareas", {
      entidad: { tipo: "instalacion", id: I1 },
    });
    expect(ficha.items.map((i) => i.id)).toEqual([ajena.id]);
  });
});

describe("actividades · aviso de tarea vencida", () => {
  it("emite una vez por vencimiento y posponer lo rearma", async () => {
    const { ctx, tabla } = entorno();
    const t = await dato<{ id: string }>(ctx, "core.actividades.create", tarea());
    await dato(ctx, "core.actividades.create", tarea({ vencimiento: "2099-01-01T12:00:00Z" }));
    const avisos = () => tabla("evento").filter((e) => e["tipo"] === "core.actividad.tarea_vencida");
    expect(await trabajoTareasVencidas.ejecutar(ctx, { dia: "2026-11-03" })).toMatchObject({
      avisos: 1,
    });
    expect(avisos()).toHaveLength(1);
    expect(avisos()[0]).toMatchObject({ entidadId: t.id });
    await trabajoTareasVencidas.ejecutar(ctx, { dia: "2026-11-04" });
    expect(avisos()).toHaveLength(1);
    await dato(ctx, "core.actividades.update", { id: t.id, vencimiento: "2026-11-02T15:00:00Z" });
    await trabajoTareasVencidas.ejecutar(ctx, { dia: "2026-11-05" });
    expect(avisos()).toHaveLength(2);
  });

  it("una tarea hecha no avisa", async () => {
    const { ctx, tabla } = entorno();
    const t = await dato<{ id: string }>(ctx, "core.actividades.create", tarea());
    await dato(ctx, "core.actividades.completar", { id: t.id });
    await trabajoTareasVencidas.ejecutar(ctx, { dia: "2026-11-03" });
    expect(tabla("evento").filter((e) => e["tipo"] === "core.actividad.tarea_vencida")).toHaveLength(
      0,
    );
  });
});
