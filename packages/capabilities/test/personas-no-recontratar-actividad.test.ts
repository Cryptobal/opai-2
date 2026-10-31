import { beforeEach, describe, expect, it } from "vitest";

import type { Rol } from "@opai/domain";

import { contextoDePrueba } from "../src/testing";
import { dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

const maria = { nombres: "María Fernanda", apellidos: "Soto", rut: "16.234.567-2" };
const VENCE = "2030-01-01";
const CAP_MARCAR = "core.personas.marcar_no_recontratar";

type Item = { capability: string; detalle: { motivo?: string } };

/** Mismo tenant y la misma base en memoria, con otro actor (mismo patrón que inspector-sensibles.test.ts). */
function comoRol(base: ReturnType<typeof contextoDePrueba>, rol: Rol) {
  const otro = contextoDePrueba({ rol });
  return { ...base.ctx, rol, actor: otro.ctx.actor, autorizar: otro.ctx.autorizar };
}

async function marcar() {
  const base = contextoDePrueba({ rol: "owner" });
  const { id } = await dato<{ id: string }>(base.ctx, "core.personas.create", maria);
  await dato(base.ctx, CAP_MARCAR, { id, motivo: "Abandono de turno", venceEn: VENCE });
  return { base, id };
}

describe("Actividad y auditoría: la marca P1 es un dato reservado (art. 154 ter CT)", () => {
  it("core.actividad.list: viewer, supervisor y gerente no ven la fila ni el motivo", async () => {
    const { base, id } = await marcar();
    for (const rol of ["viewer", "supervisor", "gerente"] as const) {
      const ctx = comoRol(base, rol);
      const r = await dato<{ items: Item[] }>(ctx, "core.actividad.list", {
        entidad: { tipo: "persona", id },
      });
      expect(r.items.some((i) => i.capability === CAP_MARCAR), rol).toBe(false);
      expect(JSON.stringify(r)).not.toContain("Abandono de turno");
    }
  });

  it("core.actividad.list: owner y admin ven la fila, pero nunca el motivo en claro", async () => {
    const { base, id } = await marcar();
    for (const rol of ["owner", "admin"] as const) {
      const ctx = comoRol(base, rol);
      const r = await dato<{ items: Item[] }>(ctx, "core.actividad.list", {
        entidad: { tipo: "persona", id },
      });
      const fila = r.items.find((i) => i.capability === CAP_MARCAR);
      expect(fila, rol).toBeTruthy();
      expect(fila?.detalle.motivo, rol).toBe("[oculto]");
    }
  });

  it("core.audit.list: gerente ve la auditoría global, pero no la fila de la marca", async () => {
    const { base } = await marcar();
    const gerente = comoRol(base, "gerente");
    const r = await dato<{ eventos: { capability: string }[] }>(gerente, "core.audit.list", {});
    expect(r.eventos.some((e) => e.capability === CAP_MARCAR)).toBe(false);
  });

  it("core.audit.list: admin ve la fila, con el motivo oculto", async () => {
    const { base } = await marcar();
    const admin = comoRol(base, "admin");
    const r = await dato<{ eventos: { capability: string; payload: unknown }[] }>(
      admin,
      "core.audit.list",
      {},
    );
    const fila = r.eventos.find((e) => e.capability === CAP_MARCAR);
    expect(fila).toBeTruthy();
    const payload = fila?.payload as { input?: { motivo?: string } } | undefined;
    expect(payload?.input?.motivo).toBe("[oculto]");
  });
});
