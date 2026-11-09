import { describe, expect, it } from "vitest";

import { PERMISOS_CORE } from "../permisos-catalogo";
import { clasificarCampos } from "./autorizacion";
import {
  soloAutorizados,
  valoresCuenta,
  valoresInstalacion,
  valoresContacto,
} from "./mapeo-maestros";

const claves = (l: { clave: string }[]) => l.map((c) => c.clave);

describe("clasificarCampos", () => {
  it("con permiso de cuentas e instalaciones autoriza esas entidades y deja el resto sin resolvedor", () => {
    const r = clasificarCampos("propuesta", () => true);
    expect(claves(r.autorizados)).toContain("cuenta.nombre");
    expect(claves(r.autorizados)).toContain("instalacion.mapa_url");
    expect(claves(r.sinResolvedor)).toContain("empresa.nombre");
    expect(r.sinPermiso).toEqual([]);
  });

  it("sin permiso de instalaciones no entrega sus campos, pero sí los de la cuenta", () => {
    const r = clasificarCampos("propuesta", (p) => p === PERMISOS_CORE.cuentasRead);
    expect(claves(r.autorizados)).toContain("cuenta.nombre");
    expect(claves(r.sinPermiso)).toContain("instalacion.nombre");
    expect(claves(r.autorizados)).not.toContain("instalacion.nombre");
  });

  it("sin ningún permiso no autoriza nada", () => {
    expect(clasificarCampos("documento", () => false).autorizados).toEqual([]);
  });

  it("respeta la finalidad: el RUT del cliente no sale en una propuesta", () => {
    const propuesta = claves(clasificarCampos("propuesta", () => true).autorizados);
    const contrato = claves(clasificarCampos("contrato", () => true).autorizados);
    expect(propuesta).not.toContain("cuenta.rut");
    expect(contrato).toContain("cuenta.rut");
  });

  it("los campos de una persona (solo contrato) no se resuelven aquí aunque se tengan todos los permisos", () => {
    const r = clasificarCampos("contrato", () => true);
    expect(claves(r.autorizados).some((c) => c.startsWith("persona."))).toBe(false);
    expect(claves(r.sinResolvedor).some((c) => c.startsWith("persona."))).toBe(true);
  });
});

describe("mapeo de maestros", () => {
  it("un dato ausente queda nulo y no se completa", () => {
    const v = valoresCuenta({ nombre: "Cliente Ficticio", rut: "  " });
    expect(v["cuenta.rut"]).toBeNull();
    expect(v["cuenta.giro"]).toBeNull();
    expect(v["cuenta.direccion"]).toBeNull();
  });

  it("une la dirección de la cuenta sin partes vacías", () => {
    const v = valoresCuenta({ nombre: "X", calle: "Av. Ejemplo 100", comuna: null, region: "RM" });
    expect(v["cuenta.direccion"]).toBe("Av. Ejemplo 100, RM");
  });

  it("el enlace de mapa solo existe con un lugar identificado y va con https", () => {
    expect(valoresInstalacion({ nombre: "P" })["instalacion.mapa_url"]).toBeNull();
    const url = valoresInstalacion({ nombre: "P", placeId: "ChIJ abc&x=1" })[
      "instalacion.mapa_url"
    ];
    expect(url).toBe("https://www.google.com/maps/place/?q=place_id:ChIJ%20abc%26x%3D1");
  });

  it("nombre del contacto y soloAutorizados filtra lo no autorizado", () => {
    const v = valoresContacto({ nombres: "Ana", apellidos: "Prueba", email: "ana@x.test" });
    expect(v["contacto.nombre"]).toBe("Ana Prueba");
    const f = soloAutorizados(v, new Set(["contacto.nombre"]));
    expect(Object.keys(f)).toEqual(["contacto.nombre"]);
  });
});
