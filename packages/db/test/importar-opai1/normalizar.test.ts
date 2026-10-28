import { describe, expect, it } from "vitest";

import {
  correo,
  distanciaMetros,
  nombreCanonico,
  rut,
  telefono,
  textoLimpio,
} from "../../scripts/importar-opai1/normalizar";
import { mismaUbicacion } from "../../scripts/importar-opai1/instalaciones";

describe("normalización de la importación desde 1.0", () => {
  it("RUT a forma canónica con dígito verificador (RUT de prueba)", () => {
    expect(rut("76.111.111-6")).toBe("76111111-6");
    expect(rut("761111116")).toBe("76111111-6");
    expect(rut("77.444.444-0")).toBe("77444444-0");
    expect(rut("76.222.222-0")).toBeNull();
    expect(rut("")).toBeNull();
    expect(rut(null)).toBeNull();
  });

  it("correo en minúsculas, sin espacios; sin forma de correo → null", () => {
    expect(correo(" Ana.Prueba@Ejemplo.TEST ")).toBe("ana.prueba@ejemplo.test");
    expect(correo("sin-arroba")).toBeNull();
    expect(correo(undefined)).toBeNull();
  });

  it("teléfono a E.164 de Chile", () => {
    expect(telefono("9 8765 4321")).toBe("+56987654321");
    expect(telefono("+56 9 1111 2222")).toBe("+56911112222");
    expect(telefono("123")).toBeNull();
  });

  it("nombre canónico: tildes, puntuación y sufijos societarios", () => {
    expect(nombreCanonico("Comercial Ñuble S.A.")).toBe("comercial nuble");
    expect(nombreCanonico("Inmobiliaria Beta Ltda.")).toBe("inmobiliaria beta");
    expect(nombreCanonico("  Inmobiliaria   BETA ")).toBe("inmobiliaria beta");
    expect(nombreCanonico("Alfa SpA")).toBe(nombreCanonico("ALFA S.p.A."));
    expect(nombreCanonico("SpA")).toBe("spa");
    expect(nombreCanonico("Alfa S.p.A.")).toBe("alfa");
  });

  it("texto limpio colapsa espacios y vacío → null", () => {
    expect(textoLimpio("  a   b ")).toBe("a b");
    expect(textoLimpio("   ")).toBeNull();
  });

  it("distancia y misma ubicación (< 50 m o mismo place_id)", () => {
    const a = { lat: -33.45, lng: -70.65 };
    expect(distanciaMetros(a, a)).toBe(0);
    expect(distanciaMetros(a, { lat: -33.4502, lng: -70.6501 })).toBeLessThan(50);
    expect(distanciaMetros(a, { lat: -33.4505, lng: -70.65 })).toBeGreaterThan(50);
    const u = (lat: number | null, lng: number | null, placeId: string | null = null) => ({
      lat,
      lng,
      placeId,
    });
    expect(mismaUbicacion(u(-33.45, -70.65), u(-33.4502, -70.6501))).toBe(true);
    expect(mismaUbicacion(u(-33.45, -70.65), u(-33.5, -70.7))).toBe(false);
    expect(mismaUbicacion(u(null, null, "p"), u(null, null, "p"))).toBe(true);
    expect(mismaUbicacion(u(null, null), u(null, null))).toBe(false);
  });
});
