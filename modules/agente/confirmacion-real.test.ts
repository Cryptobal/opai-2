import { randomUUID } from "node:crypto";

import {
  capacidadesDelNucleo,
  comoAgenteInterno,
  limpiarRegistro,
  registrarCapacidades,
} from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ejecutarPaso, prepararTurno } from "./bucle";
import { respuesta } from "./bucle-fixtures";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});
afterEach(() => vi.useRealTimers());

async function prepararArchivo() {
  const id = randomUUID();
  const e = contextoDePrueba({
    modulosActivos: ["agente"],
    semilla: {
      cuenta: [{ id, nombre: "Cuenta ficticia", estado: "prospecto", createdAt: new Date() }],
    },
  });
  const ctx = { ...comoAgenteInterno(e.ctx), medidor: e.ctx.medidor };
  let n = 0;
  const plan = await prepararTurno(ctx, "Archiva la cuenta", {
    conversar: async () =>
      respuesta(
        n++ ? [] : [{ id: "archivar", nombre: "core_cuentas_archive", argumentos: { id } }],
      ),
  });
  expect(plan.pasos).toHaveLength(1);
  return { ...e, ctx, id, paso: plan.pasos[0]! };
}

it("confirma el archivo real aunque la fecha calculada del dryRun haya avanzado", async () => {
  vi.useFakeTimers();
  const e = await prepararArchivo();
  vi.advanceTimersByTime(25);
  expect(await ejecutarPaso(e.ctx, e.paso)).toMatchObject({ ok: true });
  expect(e.tabla("cuenta")[0]?.["archivadaEn"]).toBeInstanceOf(Date);
});

it("rechaza si un cambio real invalida las reglas del archivo aprobado", async () => {
  const e = await prepararArchivo();
  await e.ctx.db.instalacion.create({
    data: { tenantId: e.ctx.tenantId, cuentaId: e.id, nombre: "Nueva", estado: "activa" },
  });
  expect(await ejecutarPaso(e.ctx, e.paso)).toMatchObject({ ok: false });
  expect(e.tabla("cuenta")[0]?.["archivadaEn"]).toBeUndefined();
});
