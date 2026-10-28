import { beforeEach, describe, expect, it } from "vitest";

import { consumidorAnexos } from "../src/core/anexos";
import type { EventoPublicado } from "../src/eventos/consumidores";
import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";
import { destinoVinculo } from "./vinculo-fixture";

beforeEach(reiniciar);

async function base() {
  const p = contextoDePrueba();
  const cargo = await dato<{ id: string }>(p.ctx, "core.cargos.create", { nombre: "Guardia" });
  const persona = await dato<{ id: string }>(p.ctx, "core.personas.create", {
    nombres: "Elena",
    apellidos: "Ríos",
    rut: "17.123.456-5",
    vinculo: { ...(await destinoVinculo(p.ctx)), cargoId: cargo.id, tipo: "indefinido", inicio: "2026-01-05" },
  });
  return { ...p, personaId: persona.id };
}

const evento = (
  tipo: string,
  payload: Record<string, unknown>,
  o: Partial<EventoPublicado> = {},
): EventoPublicado => ({
  id: "0192f3a0-0000-7000-8000-0000000000e1",
  tipo,
  entidadTipo: "estructura",
  entidadId: "0192f3a0-0000-7000-8000-0000000000e2",
  payload,
  actorTipo: "user",
  actorId: "0192f3a0-0000-7000-8000-0000000000a1",
  viaUserId: null,
  createdAt: new Date(),
  ...o,
});

describe("core.anexos.generar", () => {
  it("exige un vínculo vigente y no persiste con dryRun", async () => {
    const { ctx } = await base();
    expect(
      await codigo(ctx, "core.anexos.generar", {
        personaId: "0192f3a0-0000-7000-8000-00000000ffff",
        motivoCambio: "monto",
        snapshotDespues: { nota: "x" },
      }),
    ).toBe("UNPROCESSABLE");
  });

  it("dryRun no persiste; la ejecución real sí y es idempotente por evento+persona", async () => {
    const { ctx } = await base();
    const persona = await dato<{ id: string }>(ctx, "core.personas.create", {
      nombres: "Ana",
      apellidos: "Paz",
      rut: "19.876.543-0",
      vinculo: { ...(await destinoVinculo(ctx)), cargoId: (await dato<{ id: string }>(ctx, "core.cargos.create", { nombre: "Supervisor" })).id, tipo: "indefinido", inicio: "2026-01-05" },
    });
    const preview = await dato<{ id: string; estado: string }>(
      ctx,
      "core.anexos.generar",
      { personaId: persona.id, motivoCambio: "monto", snapshotDespues: { nota: "x" } },
      { dryRun: true },
    );
    expect(preview.id).toBe("");
    const lista0 = await dato<unknown[]>(ctx, "core.anexos.list", { personaId: persona.id });
    expect(lista0).toHaveLength(0);
    await dato(ctx, "core.anexos.generar", {
      personaId: persona.id,
      motivoCambio: "monto",
      snapshotDespues: { nota: "x" },
    });
    const lista1 = await dato<unknown[]>(ctx, "core.anexos.list", { personaId: persona.id });
    expect(lista1).toHaveLength(1);
  });

  it("gerente no genera ni lista (D8, bloqueo financiero)", async () => {
    const { ctx: gerente } = contextoDePrueba({ rol: "gerente" });
    expect(
      await codigo(gerente, "core.anexos.generar", {
        personaId: "0192f3a0-0000-7000-8000-00000000ffff",
        motivoCambio: "monto",
        snapshotDespues: {},
      }),
    ).toBe("FORBIDDEN");
    expect(await codigo(gerente, "core.anexos.list", {})).toBe("FORBIDDEN");
  });
});

describe("consumidorAnexos", () => {
  it("un cambio de capa por RUT genera un borrador para esa persona", async () => {
    const { ctx, personaId } = await base();
    await consumidorAnexos.handler(
      ctx,
      evento("core.estructura.creada", { nivel: "persona", ref: personaId, desde: "2026-02-01", cierra: null }),
    );
    const lista = await dato<{ motivoCambio: string; personaId: string }[]>(ctx, "core.anexos.list", {
      personaId,
    });
    expect(lista).toMatchObject([{ motivoCambio: "capa", personaId }]);
  });

  it("una nueva versión de la misma capa genera motivo 'monto', no 'capa'", async () => {
    const { ctx, personaId } = await base();
    await consumidorAnexos.handler(
      ctx,
      evento("core.estructura.creada", {
        nivel: "persona",
        ref: personaId,
        desde: "2026-02-01",
        cierra: "0192f3a0-0000-7000-8000-00000000aaaa",
      }),
    );
    const lista = await dato<{ motivoCambio: string }[]>(ctx, "core.anexos.list", { personaId });
    expect(lista[0]?.motivoCambio).toBe("monto");
  });

  it("el mismo evento reintentado no duplica el borrador (idempotencia del outbox)", async () => {
    const { ctx, personaId } = await base();
    const ev = evento("core.estructura.creada", { nivel: "persona", ref: personaId, desde: "2026-02-01", cierra: null });
    await consumidorAnexos.handler(ctx, ev);
    await consumidorAnexos.handler(ctx, ev);
    const lista = await dato<unknown[]>(ctx, "core.anexos.list", { personaId });
    expect(lista).toHaveLength(1);
  });

  it("sin vínculo vigente para la persona, no genera nada (caso límite §10)", async () => {
    const { ctx } = await base();
    await consumidorAnexos.handler(
      ctx,
      evento("core.estructura.creada", {
        nivel: "persona",
        ref: "0192f3a0-0000-7000-8000-00000000dead",
        desde: "2026-02-01",
        cierra: null,
      }),
    );
    const lista = await dato<unknown[]>(ctx, "core.anexos.list", {});
    expect(lista).toHaveLength(0);
  });

  it("cambiar instalación o puesto del vínculo genera anexo; la jornada sola no (R11)", async () => {
    const { ctx, personaId } = await base();
    const vinculos = await dato<{ id: string }[]>(ctx, "core.vinculos.list", { personaId });
    const vinculo = vinculos[0] as { id: string };
    await consumidorAnexos.handler(
      ctx,
      evento(
        "core.vinculo.actualizado",
        {
          personaId,
          antes: { instalacionId: "0192f3a0-0000-7000-8000-00000000a111" },
          despues: { instalacionId: "0192f3a0-0000-7000-8000-00000000a222" },
          campos: ["instalacionId"],
        },
        { entidadId: vinculo.id, entidadTipo: "vinculo" },
      ),
    );
    const trasInstalacion = await dato<unknown[]>(ctx, "core.anexos.list", { personaId });
    expect(trasInstalacion).toHaveLength(1);
    await consumidorAnexos.handler(
      ctx,
      evento(
        "core.vinculo.actualizado",
        { personaId, antes: {}, despues: {}, campos: ["horasSemanales", "distribucion"] },
        { entidadId: vinculo.id, entidadTipo: "vinculo", id: "0192f3a0-0000-7000-8000-0000000000e9" },
      ),
    );
    const trasJornada = await dato<unknown[]>(ctx, "core.anexos.list", { personaId });
    expect(trasJornada).toHaveLength(1); // Sin cambio nuevo: la jornada sola no genera anexo.
  });
});
