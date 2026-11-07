import { describe, expect, it } from "vitest";

import { variablesUsadas } from "../plantillas";
import {
  CATALOGO_CAMPOS,
  COLECCIONES_CAMPO,
  ENTIDADES_CAMPO,
  FINALIDADES_CAMPO,
  VERSION_CATALOGO_CAMPOS,
  campoPorClave,
  camposPara,
  validarPlantillaCampos,
} from "./index";

describe("catálogo único de campos · integridad", () => {
  it("tiene versión y cada clave (y alias) es única y con forma entidad.campo", () => {
    expect(VERSION_CATALOGO_CAMPOS).toBe(1);
    const vistas = new Set<string>();
    for (const c of CATALOGO_CAMPOS) {
      expect(c.clave).toMatch(/^[a-z]+\.[a-z0-9_]+$/);
      expect(ENTIDADES_CAMPO).toContain(c.clave.split(".")[0]);
      for (const k of [c.clave, ...(c.alias ?? [])]) {
        expect(vistas.has(k), `clave repetida: ${k}`).toBe(false);
        vistas.add(k);
      }
      expect(c.finalidades.length).toBeGreaterThan(0);
      for (const f of c.finalidades) expect(FINALIDADES_CAMPO).toContain(f);
      expect(c.ejemplo.length).toBeGreaterThan(0);
    }
  });

  it("el dinero sale solo de CPQ y las colecciones apuntan a una entidad real", () => {
    for (const c of CATALOGO_CAMPOS.filter((x) => x.tipo === "clp")) expect(c.fuente).toBe("cpq");
    for (const col of COLECCIONES_CAMPO) expect(ENTIDADES_CAMPO).toContain(col.entidad);
  });

  it("los datos de personas y los sensibles no están disponibles en propuestas ni correos", () => {
    for (const c of CATALOGO_CAMPOS.filter((x) => x.clave.startsWith("persona."))) {
      expect(c.finalidades).toEqual(["contrato"]);
    }
    for (const c of CATALOGO_CAMPOS.filter((x) => x.sensibilidad === "sensible")) {
      expect(c.finalidades).not.toContain("propuesta");
      expect(c.finalidades).not.toContain("correo");
    }
  });

  it("en una propuesta solo hay dos datos personales: nombre y cargo del contacto", () => {
    const personales = camposPara("propuesta").filter(
      (c) => c.sensibilidad === "personal" || c.sensibilidad === "sensible",
    );
    expect(personales.map((c) => c.clave).sort()).toEqual(["contacto.cargo", "contacto.nombre"]);
  });

  it("los alias antiguos resuelven al campo canónico", () => {
    expect(campoPorClave("cliente.nombre")?.clave).toBe("cuenta.nombre");
    expect(campoPorClave("CUENTA.NOMBRE")?.clave).toBe("cuenta.nombre");
    expect(campoPorClave("cuenta.no_existe")).toBeUndefined();
    expect(validarPlantillaCampos("{{cliente.nombre}}", "propuesta").usados).toEqual([
      "cuenta.nombre",
    ]);
  });

  it("es compatible con la sintaxis de plantillas.ts (ADR-020)", () => {
    const texto = "Hola {{cuenta.nombre}}, vigente hasta {{cotizacion.valida_hasta}}";
    expect(variablesUsadas(texto)).toEqual(["cuenta.nombre", "cotizacion.valida_hasta"]);
    expect(validarPlantillaCampos(texto, "propuesta").ok).toBe(true);
  });
});

describe("validación de plantillas", () => {
  it("rechaza tokens desconocidos y colecciones desconocidas", () => {
    const r = validarPlantillaCampos("{{cuenta.sueldo}} {{#cada puestos}}x{{/cada}}", "propuesta");
    expect(r.problemas.map((p) => p.codigo)).toEqual(["token_desconocido", "token_desconocido"]);
  });

  it("un campo permitido en contratos no pasa en propuestas, y viceversa se acepta", () => {
    const enPropuesta = validarPlantillaCampos("RUT {{persona.rut}}", "propuesta");
    expect(enPropuesta.ok).toBe(false);
    expect(enPropuesta.problemas[0]?.codigo).toBe("no_autorizado");
    expect(validarPlantillaCampos("RUT {{persona.rut}}", "contrato").ok).toBe(true);
  });

  it("rechaza formatos que no corresponden al tipo", () => {
    expect(
      validarPlantillaCampos("{{cotizacion.venta_mensual | mayusculas}}", "propuesta").problemas[0]
        ?.codigo,
    ).toBe("formato_invalido");
    expect(validarPlantillaCampos("{{cotizacion.venta_mensual | numero}}", "propuesta").ok).toBe(
      true,
    );
  });

  it.each([
    ["{{#cada instalaciones}}{{instalacion.nombre}}", "sin cerrar"],
    ["{{/cada}}", "cierre sin apertura"],
    ["{{#cada instalaciones}}{{#cada instalaciones}}x{{/cada}}{{/cada}}", "cada anidado"],
    ["{{ }}", "etiqueta vacía"],
    ["hola {{ 123 }} chao", "llaves sin sentido"],
    ["{{#si}}x{{/si}}", "si sin nombre"],
  ])("detecta estructura inválida: %s (%s)", (texto) => {
    const r = validarPlantillaCampos(texto, "propuesta");
    expect(r.ok).toBe(false);
    expect(r.problemas.some((p) => p.codigo === "estructura")).toBe(true);
  });
});
