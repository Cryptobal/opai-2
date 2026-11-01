import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { manejarCapacidadHttp } from "@opai/capabilities/http";
import { ejecutarHerramienta, herramientasMcp } from "@opai/capabilities/mcp";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { itemPrueba, modeloPrueba, parametrosPrueba, puestoPrueba, versionPrueba } from "../domain/motor/fixtures";
import { motorSimular } from "./motor";
import { ACTIVOS } from "./fixtures";

beforeAll(() => registrarCapacidades([motorSimular]));
const entrada = () => ({ version: { ...versionPrueba([itemPrueba(123_457)]), margenPct: 210_000 },
  modelo: modeloPrueba(), parametros: parametrosPrueba });
function contexto(costos: boolean, tenantId?: string) {
  const h = contextoDePrueba({ modulosActivos: ACTIVOS });
  return { ...h.ctx, ...(tenantId ? { tenantId } : {}),
    autorizar: (p: string) => p === "cpq:cotizaciones.read" || (costos && p === "cpq:costos.ver") };
}

describe("cpq.motor.simular: capacidad / API / MCP", () => {
  it("con costos devuelve traza; sin costos la lista permitida excluye operandos y margen en los tres canales", async () => {
    for (const costos of [true, false]) {
      const ctx = contexto(costos), input = entrada();
      const capacidad = await executeCapability(ctx, motorSimular.id, input);
      const http = await manejarCapacidadHttp(new Request("https://ejemplo.test/api/v1/cpq/motor/simular", {
        method: "POST", body: JSON.stringify({ input }), headers: { "content-type": "application/json" },
      }), ["cpq", "motor", "simular"], async () => ctx);
      const herramienta = herramientasMcp(ctx).find((h) => h.nombre === "cpq_motor_simular");
      if (!herramienta) throw new Error("Falta herramienta MCP");
      const mcp = await ejecutarHerramienta(ctx, herramienta, input);
      const api: unknown = await http.json();
      expect(http.status).toBe(200); expect(api).toEqual(capacidad); expect(mcp).toEqual(capacidad);
      expect(capacidad.ok).toBe(true);
      if (!capacidad.ok) throw new Error("fixture");
      const texto = JSON.stringify(capacidad.data);
      if (costos) expect(texto).toContain('"traza"');
      else {
        expect(Object.keys(capacidad.data as object).sort()).toEqual([
          "ventaMensual", "pagosUnicos", "dotacion", "uf", "fecha", "estado", "advertencias", "noEnviable",
        ].sort());
        for (const prohibido of ["123457", "210000", "costo", "margen", "traza", "semaforo", "instrumentos", "variables"])
          expect(texto).not.toContain(prohibido);
      }
    }
  });
  it("sin permiso read o módulo/scopes está prohibido; lectura sin preview ni auditoría", async () => {
    const h = contextoDePrueba({ modulosActivos: ACTIVOS });
    const sin = { ...h.ctx, autorizar: () => false };
    expect(await executeCapability(sin, motorSimular.id, entrada())).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const ctx = contexto(false);
    expect(herramientasMcp(ctx).filter((h) => h.nombre.includes("motor_simular")).map((h) => h.nombre)).toEqual(["cpq_motor_simular"]);
    await executeCapability(h.ctx, motorSimular.id, entrada()); expect(h.eventos).toEqual([]);
  });
  it("otro tenant no altera la simulación: no lee base ni resuelve IDs persistidos", async () => {
    const ctx = contexto(true), consulta = vi.fn(() => { throw new Error("No debe consultar base"); });
    const db = new Proxy(ctx.db, { get: consulta });
    const enLectura = vi.fn(() => { throw new Error("No debe abrir transacción"); });
    const uno = await executeCapability({ ...ctx, db, enLectura }, motorSimular.id, entrada());
    const otro = await executeCapability({ ...ctx, db, tenantId: "0192f3a0-0000-7000-8000-0000000000ff" }, motorSimular.id, entrada());
    expect(uno).toEqual(otro); expect(consulta).not.toHaveBeenCalled(); expect(enLectura).not.toHaveBeenCalled();
  });
  it("sin 07e no admite costo empleador manual y deja venta pendiente/no enviable", async () => {
    const input = entrada(); input.version.lineas = [puestoPrueba()];
    const r = await executeCapability(contexto(false), motorSimular.id, input);
    expect(r).toMatchObject({ ok: true, data: { ventaMensual: null, noEnviable: true,
      advertencias: ["costo laboral pendiente: motor de sueldos"] } });
  });
});
