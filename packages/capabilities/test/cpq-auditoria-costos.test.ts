// Brief 10 · CPQ PR 10.1 (Revisor, bloqueo 1): la auditoría no es una vía lateral para ver costos
// (R59). Quien lee el historial con `core:audit.read` pero sin `cpq:costos.ver` ve los campos de costo
// del input de `cpq.*` redactados, también dentro del lote de `cpq.cotizaciones.ajustar`.
import { beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { CARGO, N1, ctxCpq, puesto, registrarCpq, semillaCpq } from "./cpq-ayuda";

beforeEach(registrarCpq);

/** El owner crea con margen y agrega una línea con sueldo; devuelve la semilla con la auditoría. */
async function historial() {
  const { ctx, tabla } = ctxCpq();
  const c = await executeCapability(ctx, "cpq.cotizaciones.create", {
    negocioId: N1,
    margenObjetivo: 150_000,
  });
  const d = c.ok ? (c.data as { id: string; secciones: { id: string }[] }) : null;
  if (!d) throw new Error("no se creó");
  const a = await executeCapability(ctx, "cpq.cotizaciones.ajustar", {
    id: d.id,
    operaciones: [puesto(d.secciones[0]?.id ?? "", { cargoId: CARGO, sueldoBruto: 650_000 })],
  });
  expect(a.ok).toBe(true);
  return { ...semillaCpq(), auditEvent: tabla("auditEvent") };
}

const inputs = async (permisos: readonly string[]) => {
  const { ctx } = ctxCpq({ semilla: await historial(), permisos });
  const r = await executeCapability(ctx, "core.audit.list", { limite: 50 });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  const eventos = (r.data as { eventos: { capability: string; payload: { input?: unknown } }[] })
    .eventos;
  const cpq = eventos.filter((e) => e.capability.startsWith("cpq.cotizaciones."));
  expect(cpq.map((e) => e.capability).sort()).toEqual([
    "cpq.cotizaciones.ajustar",
    "cpq.cotizaciones.create",
  ]);
  return JSON.stringify(cpq.map((e) => e.payload.input));
};

describe("core.audit.list y los costos de CPQ (R59)", () => {
  it("sin cpq:costos.ver, el margen y el sueldo del input auditado salen redactados", async () => {
    const texto = await inputs(["core:audit.read"]);
    expect(texto).not.toContain("150000");
    expect(texto).not.toContain("650000");
    expect(texto).toContain("••••");
  });

  it("con cpq:costos.ver se ven (control)", async () => {
    const texto = await inputs(["core:audit.read", "cpq:costos.ver"]);
    expect(texto).toContain("150000");
    expect(texto).toContain("650000");
  });
});
