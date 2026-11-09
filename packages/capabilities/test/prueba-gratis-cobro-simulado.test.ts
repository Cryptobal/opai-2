// CAR-222 PR 2 · Casos sintéticos de cierre (2/2): la prueba gratis nunca factura (cobro simulado).
// Solo datos de prueba en memoria; no toca producción, aliases ni cobros reales.
import { describe, expect, it } from "vitest";

import { executeCapability } from "../src/execute";
import { TENANT_DE_PRUEBA, contextoDePrueba } from "../src/testing";
import { semillaTenant } from "./semilla";
import {
  dia,
  extender,
  fecha,
  modCpq,
  plataforma,
  prueba,
  registrarEntorno,
  rut,
} from "./prueba-gratis-comun";

registrarEntorno();

describe("cobro simulado: la prueba gratis nunca factura", () => {
  it("activar y extender no crean condiciones ni cargos; el resumen no la factura", async () => {
    // 1) La empresa activa su prueba.
    const empresa = contextoDePrueba({ semilla: { ...semillaTenant(), perfilEmpresa: rut } });
    const act = await executeCapability(empresa.ctx, "core.modules.probar", { moduloId: "cpq" });
    expect(act.ok).toBe(true);
    expect(empresa.tabla("cobroCondicion")).toHaveLength(0);
    expect(empresa.tabla("cobroCargo")).toHaveLength(0);

    // 2) Plataforma ve la misma situación y la extiende.
    const { ctx, tabla } = plataforma({
      pruebaGratis: [prueba(TENANT_DE_PRUEBA, fecha(2))],
      tenantModule: [modCpq(TENANT_DE_PRUEBA, "trial")],
    });
    await executeCapability(ctx, "platform.cobros.prueba_gratis_extender", extender());
    expect(tabla("cobroCondicion")).toHaveLength(0);
    expect(tabla("cobroCargo")).toHaveLength(0);

    // 3) El resumen del mes: el módulo en prueba sin condición comercial no se factura.
    const resumen = await executeCapability(ctx, "platform.cobros.resumen", {
      periodo: dia(0).slice(0, 7),
      tenantId: TENANT_DE_PRUEBA,
    });
    if (!resumen.ok) throw new Error(resumen.error.message);
    const cpq = (
      resumen.data as {
        empresas: { modulos: { moduloId: string; calculo: { facturable: boolean } }[] }[];
      }
    ).empresas[0]?.modulos.find((m) => m.moduloId === "cpq");
    expect(cpq?.calculo.facturable).toBe(false);
    expect(tabla("cobroCargo")).toHaveLength(0);
  });
});
