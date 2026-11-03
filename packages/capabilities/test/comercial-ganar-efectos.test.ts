import { beforeEach, describe, expect, it } from "vitest";

import { consumidorNegocioGanado } from "../src/comercial/consumidor-ganado";
import { versionAAceptar, type EfectosGanar } from "../src/comercial/ganar-efectos";
import type { EventoPublicado } from "../src/eventos/consumidores";
import { TENANT_DE_PRUEBA } from "../src/testing";
import { dato } from "./maestros-ayuda";
import { CU, I1, N1, ctxComercial, reiniciarComercial } from "./comercial-ayuda";

beforeEach(reiniciarComercial);

const I3 = "0192f3a0-0000-7000-8000-0000000000f3";

type Ganado = { estado: string; efectos: EfectosGanar };

function conSegundaInstalacion(ctx: ReturnType<typeof ctxComercial>) {
  const t = ctx.tabla("instalacion") ?? [];
  t.push({ id: I3, tenantId: TENANT_DE_PRUEBA, cuentaId: CU, nombre: "Bodega", estado: "activa" });
  (ctx.tabla("negocioInstalacion") ?? []).push({
    id: "0192f3a0-0000-7000-8000-0000000000b5",
    tenantId: TENANT_DE_PRUEBA,
    negocioId: N1,
    instalacionId: I3,
    tipo: "ampliacion",
  });
}

async function preparar(ctx: ReturnType<typeof ctxComercial>["ctx"]) {
  await dato(ctx, "comercial.negocios.update", { id: N1, inicioServicioEstimado: "2026-12-01" });
}

function eventoGanado(): EventoPublicado {
  return {
    id: "0192f3a0-0000-7000-8000-00000000eee1",
    tipo: "comercial.negocio.ganado",
    entidadTipo: "negocio",
    entidadId: N1,
    payload: {},
    actorTipo: "user",
    actorId: null,
    viaUserId: null,
    createdAt: new Date(),
  };
}

describe("comercial · ganar con efectos (R18)", () => {
  it("la vista previa lista los efectos sin aplicarlos", async () => {
    const c = ctxComercial({ conNegocio: true });
    conSegundaInstalacion(c);
    await preparar(c.ctx);
    const r = await dato<Ganado>(c.ctx, "comercial.negocios.ganar", { id: N1 }, { dryRun: true });
    expect(r.efectos.cuenta).toMatchObject({ id: CU, desde: "prospecto", hacia: "cliente_activo" });
    // Ampliación: solo la instalación en prospecto se activa; la ya activa queda fuera.
    expect(r.efectos.instalaciones.map((i) => i.id)).toEqual([I1]);
    expect(r.efectos.cotizacion).toBeNull();
    expect(c.tabla("cuenta")?.find((x) => x["id"] === CU)?.["estado"]).toBe("prospecto");
  });

  it("el consumidor activa cuenta e instalaciones, con eventos, y repetir no duplica", async () => {
    const c = ctxComercial({ conNegocio: true });
    await preparar(c.ctx);
    await dato(c.ctx, "comercial.negocios.ganar", { id: N1 });
    const antes = (c.tabla("evento") ?? []).length;
    await consumidorNegocioGanado.handler(c.ctx, eventoGanado());
    const cuenta = c.tabla("cuenta")?.find((x) => x["id"] === CU);
    expect(cuenta?.["estado"]).toBe("cliente_activo");
    expect(cuenta?.["clienteDesde"]).toBeInstanceOf(Date);
    expect(c.tabla("instalacion")?.find((x) => x["id"] === I1)?.["estado"]).toBe("activa");
    const nuevos = (c.tabla("evento") ?? []).slice(antes).map((e) => e["tipo"]);
    expect(nuevos).toEqual(["core.cuenta.estado_cambiado", "core.instalacion.estado_cambiado"]);
    await consumidorNegocioGanado.handler(c.ctx, eventoGanado());
    expect((c.tabla("evento") ?? []).length).toBe(antes + 2);
  });

  it("si el negocio ya no está ganado, el consumidor no toca nada", async () => {
    const c = ctxComercial({ conNegocio: true });
    await consumidorNegocioGanado.handler(c.ctx, eventoGanado());
    expect(c.tabla("cuenta")?.find((x) => x["id"] === CU)?.["estado"]).toBe("prospecto");
  });

  it("acepta la enviada más reciente de la cotización vigente (R45)", () => {
    const v = (id: string, numero: number, estado: string, cotizacionId = "q1") => ({
      id,
      numero,
      estado,
      cotizacionId,
    });
    const versiones = [v("a", 1, "reemplazada"), v("b", 2, "enviada"), v("c", 1, "enviada", "q2")];
    expect(versionAAceptar("q1", versiones)?.id).toBe("b");
    expect(versionAAceptar("q1", [v("a", 1, "borrador")])).toBeNull();
    expect(versionAAceptar(null, versiones)).toBeNull();
  });
});
