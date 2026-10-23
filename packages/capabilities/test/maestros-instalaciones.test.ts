import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

async function base() {
  const p = contextoDePrueba();
  const cuenta = await dato<{ id: string }>(p.ctx, "core.cuentas.create", {
    nombre: "Logística Andina",
  });
  const cargo = await dato<{ id: string }>(p.ctx, "core.cargos.create", { nombre: "Guardia" });
  return { ...p, cuentaId: cuenta.id, cargoId: cargo.id };
}

describe("core.instalaciones.* y core.puestos.*", () => {
  it("crea sin geolocalización configurada y lo avisa sin bloquear", async () => {
    const { ctx, cuentaId, tabla } = await base();
    const i = await dato<{ lat: null; avisos: string[]; cuenta: string }>(
      ctx,
      "core.instalaciones.create",
      {
        cuentaId,
        nombre: "Planta Quilicura",
        calle: "Av. Las Industrias 4520",
        comuna: "Quilicura",
      },
    );
    expect(i).toMatchObject({ lat: null, cuenta: "Logística Andina", estado: "prospecto" });
    expect(i.avisos[0]).toMatch(/sin coordenadas/);
    expect(tabla("evento").map((e) => e["tipo"])).toContain("core.instalacion.creada");
    expect(
      await codigo(ctx, "core.instalaciones.create", { cuentaId, nombre: "Planta Quilicura" }),
    ).toBe("CONFLICT");
  });

  it("guarda coordenadas dadas y la vista previa no escribe", async () => {
    const { ctx, cuentaId, tabla } = await base();
    const entrada = { cuentaId, nombre: "CD Pudahuel", lat: -33.44, lng: -70.79, geocercaM: 300 };
    const previa = await dato<{ lat: number }>(ctx, "core.instalaciones.create", entrada, {
      dryRun: true,
    });
    expect(previa.lat).toBe(-33.44);
    expect(tabla("instalacion")).toHaveLength(0);
    expect(await dato(ctx, "core.instalaciones.create", entrada)).toMatchObject({
      lat: -33.44,
      geocercaM: 300,
    });
  });

  it("puestos: valida el patrón, describe el cruce de medianoche y bloquea archivar con puestos activos", async () => {
    const { ctx, cuentaId, cargoId } = await base();
    const { id: instalacionId } = await dato<{ id: string }>(ctx, "core.instalaciones.create", {
      cuentaId,
      nombre: "Torre",
    });
    const puesto = {
      instalacionId,
      cargoId,
      nombre: "Guardia noche",
      diasTrabajo: 4,
      diasDescanso: 4,
    };
    const p = await dato<{ id: string; horario: string }>(ctx, "core.puestos.create", {
      ...puesto,
      horaInicio: "20:00",
      horaFin: "08:00",
    });
    expect(p.horario).toBe("20:00–08:00 (+1)");
    expect(
      await codigo(ctx, "core.puestos.create", {
        ...puesto,
        diasDescanso: 0,
        horaInicio: "08:00",
        horaFin: "20:00",
      }),
    ).toBe("INVALID_INPUT");
    expect(
      await codigo(ctx, "core.puestos.create", {
        ...puesto,
        horaInicio: "25:00",
        horaFin: "08:00",
      }),
    ).toBe("INVALID_INPUT");
    await dato(ctx, "core.instalaciones.set_estado", { id: instalacionId, estado: "activa" });
    expect(await codigo(ctx, "core.instalaciones.archive", { id: instalacionId })).toBe(
      "UNPROCESSABLE",
    );
    await dato(ctx, "core.puestos.set_estado", { id: p.id, estado: "inactivo" });
    expect(await dato(ctx, "core.instalaciones.archive", { id: instalacionId })).toMatchObject({
      estado: "inactiva",
    });
    expect(await dato(ctx, "core.instalaciones.get", { id: instalacionId })).toMatchObject({
      puestos: [{ estado: "inactivo" }],
    });
  });

  it("no crea puestos con un cargo desactivado", async () => {
    const { ctx, cuentaId, cargoId } = await base();
    const { id: instalacionId } = await dato<{ id: string }>(ctx, "core.instalaciones.create", {
      cuentaId,
      nombre: "Torre",
    });
    await dato(ctx, "core.cargos.set_activo", { id: cargoId, activo: false });
    const r = await codigo(ctx, "core.puestos.create", {
      instalacionId,
      cargoId,
      nombre: "Puesto día",
      diasTrabajo: 5,
      diasDescanso: 2,
      horaInicio: "09:00",
      horaFin: "18:00",
    });
    expect(r).toBe("UNPROCESSABLE");
  });
});
