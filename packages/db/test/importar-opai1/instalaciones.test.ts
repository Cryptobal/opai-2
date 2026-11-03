import { describe, expect, it } from "vitest";

import { cuentaDestino, estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import { datosInstalacion } from "../../scripts/importar-opai1/instalaciones";
import { calcularPlan } from "../../scripts/importar-opai1/plan";
import { fixture } from "./memoria";

const plan = (destino = estadoVacio()) => calcularPlan(fixture(), destino);
const por = (p: ReturnType<typeof plan>, id: string) =>
  p.instalaciones.find((d) => d.idOpai1 === id);

describe("plan de instalaciones", () => {
  it("dedupe dentro de la cuenta por distancia < 50 m y por place_id", () => {
    const p = plan();
    expect(por(p, "ins-i1")).toMatchObject({ accion: "crear" });
    expect(por(p, "ins-i2")).toMatchObject({
      accion: "omitido",
      motivo: "duplicado_ubicacion",
      fusionaCon: "ins-i1",
    });
    expect(por(p, "ins-i6")).toMatchObject({ accion: "omitido", fusionaCon: "ins-i5" });
  });

  it("mismo nombre en la cuenta con otra ubicación: conflicto (único por cuenta)", () => {
    expect(por(plan(), "ins-i3")).toMatchObject({
      accion: "conflicto",
      motivo: "nombre_repetido_en_cuenta",
    });
  });

  it("instalación de un lead (sin cuenta) se omite y se reporta", () => {
    expect(por(plan(), "ins-i4")).toMatchObject({ accion: "omitido", motivo: "sin_cuenta_lead" });
  });

  it("contra 2.0: vincula por ubicación dentro de la cuenta existente", () => {
    const destino = estadoVacio();
    destino.cuentas.push(cuentaDestino({ id: "c-1", nombre: "Alfa", rut: "76111111-6" }));
    destino.instalaciones.push({
      id: "n-1",
      cuentaId: "c-1",
      nombre: "Bodega",
      calle: null,
      comuna: null,
      placeId: null,
      lat: -33.45001,
      lng: -70.65001,
      estado: "prospecto",
    });
    const d = por(plan(destino), "ins-i1");
    expect(d).toMatchObject({
      accion: "actualizar",
      motivo: "vincula_por_ubicacion",
      destinoId: "n-1",
    });
    expect(d?.campos).toContain("placeId");
    expect(d?.conflictos).toContain("nombre");
  });

  it("contra 2.0: mismo nombre con otra ubicación en la cuenta es conflicto", () => {
    const destino = estadoVacio();
    destino.cuentas.push(cuentaDestino({ id: "c-6", nombre: "Delta", rut: "76333333-7" }));
    destino.instalaciones.push({
      id: "n-6",
      cuentaId: "c-6",
      nombre: "Oficina Delta",
      calle: null,
      comuna: null,
      placeId: "place-otro",
      lat: null,
      lng: null,
      estado: "prospecto",
    });
    expect(por(plan(destino), "ins-i5")).toMatchObject({
      accion: "conflicto",
      motivo: "nombre_existente_en_cuenta",
    });
  });

  it("redondea coordenadas a 7 decimales como Decimal(10,7) de 2.0 (plan idempotente)", () => {
    const fila = { id: "x", name: "P", lat: -33.448912345678, lng: -70.669265432198 };
    const d = datosInstalacion(fila as Parameters<typeof datosInstalacion>[0], "c");
    expect(d.lat).toBe(-33.4489123);
    expect(d.lng).toBe(-70.6692654);
  });
});
