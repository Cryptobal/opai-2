import { describe, expect, it } from "vitest";

import { obtenerCapacidad } from "@opai/capabilities";

import {
  SECCIONES_LABORAL,
  type SeccionLaboral,
} from "@/app/(erp)/personas/_componentes/config-hojas-laboral";
import {
  cambiosDe,
  faltantes,
  valorDeCampo,
} from "@/app/(erp)/personas/_componentes/valores-hoja-laboral";
import { asegurarRegistro } from "../lib/registro";

asegurarRegistro();
const ID = "0190a0a0-0000-7000-8000-000000000001";
const cfg = SECCIONES_LABORAL;

describe("hojas de edición de Laboral (CAR-223)", () => {
  it("convierte el texto del formulario al valor de la capacidad", () => {
    expect(valorDeCampo("texto", "  Habitat ")).toBe("Habitat");
    expect(valorDeCampo("texto", "   ")).toBeNull();
    expect(valorDeCampo("fecha", "")).toBeNull();
    expect(valorDeCampo("entero", "2")).toBe(2);
    expect(valorDeCampo("si_no", "si")).toBe(true);
    expect(valorDeCampo("si_no", "no")).toBe(false);
  });

  it("envía solo los campos que cambiaron y permite vaciarlos", () => {
    const inicial = { afp: "Habitat", regimen: "General", planIsapre: "•••" };
    const c = cambiosDe(cfg.prevision, inicial, { ...inicial, afp: "Modelo", regimen: "" });
    expect(c).toEqual({ afp: "Modelo", regimen: null });
    expect(cambiosDe(cfg.prevision, inicial, inicial)).toEqual({});
  });

  it("la cuenta de pago envía todos los campos y exige los obligatorios", () => {
    const v = { bancoCodigo: "", tipoCuenta: "", numeroCuenta: "", rutTitular: "" };
    expect(faltantes(cfg.pago, v)).toBe(true);
    const ok = {
      bancoCodigo: "012",
      tipoCuenta: "Vista",
      numeroCuenta: "12345678",
      rutTitular: "",
    };
    expect(faltantes(cfg.pago, ok)).toBe(false);
    expect(cambiosDe(cfg.pago, v, ok)).toEqual({ ...ok, rutTitular: null });
  });

  it("rechaza texto no numérico en los campos enteros", () => {
    expect(faltantes(cfg["jornada-dt"], { plazoFijoPeriodo: "dos" })).toBe(true);
    expect(faltantes(cfg["jornada-dt"], { plazoFijoPeriodo: "2" })).toBe(false);
  });

  it("valida decimales y rangos antes de enviar", () => {
    expect(faltantes(cfg.prevision, { planUf: "abc" })).toBe(true);
    expect(faltantes(cfg.prevision, { planUf: "12,5" })).toBe(false);
    expect(valorDeCampo("decimal", "12,5")).toBe("12.5");
    expect(faltantes(cfg["jornada-dt"], { plazoFijoPeriodo: "4" })).toBe(true);
    expect(faltantes(cfg["jornada-dt"], { avisoTerminoDias: "400" })).toBe(true);
    expect(faltantes(cfg["jornada-dt"], { avisoTerminoDias: "30" })).toBe(false);
  });

  it.each(Object.keys(cfg) as SeccionLaboral[])(
    "el input armado de %s valida contra la capacidad real",
    (seccion) => {
      const c = cfg[seccion];
      const capacidad = obtenerCapacidad(c.capacidad);
      expect(capacidad).toBeDefined();
      const valores: Record<string, string> = Object.fromEntries(
        c.campos.map((f) => [
          f.clave,
          f.tipo === "fecha"
            ? "2026-12-31"
            : f.tipo === "entero"
              ? "2"
              : f.tipo === "decimal"
                ? "12.5"
                : f.tipo === "si_no"
                  ? "si"
                  : "12345678",
        ]),
      );
      if (seccion === "contacto-laboral")
        valores.telefonoSecundario = valores.emergenciaTelefono = "+56912345678";
      if (seccion === "pago") valores.rutTitular = "";
      const input = c.armar(ID, cambiosDe(c, {}, valores));
      expect(capacidad?.input.safeParse(input).error?.issues ?? []).toEqual([]);
    },
  );
});
