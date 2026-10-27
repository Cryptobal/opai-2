import { beforeEach, expect, it, vi } from "vitest";
import { limpiarRegistro } from "@opai/capabilities";

import { prepararTurno } from "./bucle";
import { entornoBucle, llamada, respuesta } from "./bucle-fixtures";
import { confirmarPlan, firmarPlan } from "./planes";

const secreto = "prueba-local-de-firma-sin-credenciales-0000";
beforeEach(() => limpiarRegistro());
async function preparar(nivel: "aprobar_todo" | "paso_a_paso" = "aprobar_todo") {
  const e = entornoBucle("escritura");
  let n = 0;
  const plan = await prepararTurno(e.ctx, "Dos escrituras", {
    conversar: async () => respuesta(n++ ? [] : [llamada, { ...llamada, id: "dos" }]),
  });
  const humano = e.sesion;
  return { ...e, humano, planId: plan.id, token: firmarPlan(e.ctx, plan, nivel, secreto) };
}

it("aprobar todo ejecuta el plan una sola vez, incluso con dos confirmaciones concurrentes", async () => {
  const e = await preparar();
  await Promise.allSettled(
    Array.from({ length: 2 }, () => confirmarPlan(e.humano, e.ctx, e.token, true, secreto)),
  );
  expect(e.escrituras()).toBe(2);
});
it("paso a paso requiere un nuevo token firmado para la segunda escritura", async () => {
  const e = await preparar("paso_a_paso");
  const r = (await confirmarPlan(e.humano, e.ctx, e.token, true, secreto)) as { siguiente: string };
  expect(e.escrituras()).toBe(1);
  await confirmarPlan(e.humano, e.ctx, r.siguiente, true, secreto);
  expect(e.escrituras()).toBe(2);
});
it("rechazar impide ejecutar después con el mismo token", async () => {
  const e = await preparar();
  await confirmarPlan(e.humano, e.ctx, e.token, false, secreto);
  await expect(confirmarPlan(e.humano, e.ctx, e.token, true, secreto)).rejects.toThrow();
  expect(e.escrituras()).toBe(0);
});
it("devuelve y conserva el identificador de la aprobación pendiente por paso", async () => {
  const e = entornoBucle("irreversible");
  let n = 0;
  const plan = await prepararTurno(e.ctx, "Propón la acción", {
    conversar: async () => respuesta(n++ ? [] : [llamada]),
  });
  const token = firmarPlan(e.ctx, plan, "aprobar_todo", secreto);
  const r = await confirmarPlan(e.sesion, e.ctx, token, true, secreto);
  expect(r).toMatchObject({
    estado: "aprobacion",
    resultados: [
      { paso: 0, ok: false, code: "APPROVAL_REQUIRED", aprobacionId: expect.any(String) },
    ],
  });
  expect(await confirmarPlan(e.sesion, e.ctx, token, true, secreto)).toEqual(r);
});
it("mismo usuario en otra empresa, otro alcance y un token alterado no confirman", async () => {
  const e = await preparar();
  for (const ctx of [
    { ...e.ctx, tenantId: "otro" },
    { ...e.ctx, alcance: { instalaciones: [] } },
  ]) {
    await expect(
      confirmarPlan({ ...e.humano, tenantId: ctx.tenantId }, ctx, e.token, true, secreto),
    ).rejects.toThrow(/Plan no disponible/);
  }
  await expect(confirmarPlan(e.humano, e.ctx, `${e.token}x`, true, secreto)).rejects.toThrow();
  expect(e.escrituras()).toBe(0);
});

it("un corte tras efectos no recupera la reserva del plan al pasar diez minutos", async () => {
  const e = await preparar();
  vi.spyOn(e.humano.idempotencia, "completar").mockRejectedValueOnce(new Error("corte"));
  await expect(confirmarPlan(e.humano, e.ctx, e.token, true, secreto)).rejects.toThrow("corte");
  const reloj = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 11 * 60_000);
  try {
    expect(
      await e.humano.idempotencia.reservar("otra.capacidad", `plan:${e.planId}:0`, {}),
    ).not.toMatchObject({ estado: "nueva" });
    await expect(confirmarPlan(e.humano, e.ctx, e.token, true, secreto)).rejects.toThrow(
      /resolviendo/,
    );
    expect(e.escrituras()).toBe(2);
  } finally {
    reloj.mockRestore();
  }
});
