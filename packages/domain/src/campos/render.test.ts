import { describe, expect, it } from "vitest";

import { formatearClp } from "../formato";
import { renderizarPlantillaCampos } from "./index";
import type { ValoresCampos } from "./index";

const tenantA: ValoresCampos = {
  campos: {
    "empresa.nombre": "Seguridad Ficticia A",
    "cuenta.nombre": "Cliente Ficticio Uno",
    "cotizacion.venta_mensual": 4_500_000,
    "cotizacion.valida_hasta": "2026-12-15",
    "persona.rut": "12.345.678-5",
  },
  colecciones: {
    instalaciones: [
      { "instalacion.nombre": "Planta Norte", "instalacion.direccion": "Av. Uno 100" },
      { "instalacion.nombre": "Bodega Sur", "instalacion.direccion": "Calle Dos 200" },
    ],
  },
};
const tenantB: ValoresCampos = {
  campos: { "empresa.nombre": "Aseo Ficticio B", "cuenta.nombre": "Cliente Ficticio Dos" },
};

describe("render del catálogo único", () => {
  it("presenta con el formateador único y resuelve alias", () => {
    const r = renderizarPlantillaCampos(
      "{{cliente.nombre}}: {{cotizacion.venta_mensual}} hasta {{cotizacion.valida_hasta}}",
      tenantA,
      { finalidad: "propuesta" },
    );
    expect(r).toMatchObject({
      ok: true,
      texto: `Cliente Ficticio Uno: ${formatearClp(4_500_000)} hasta 15-12-2026`,
      faltantes: [],
    });
  });

  it("repite por instalación con datos distintos, no el mismo párrafo", () => {
    const r = renderizarPlantillaCampos(
      "{{#cada instalaciones}}[{{instalacion.nombre}} · {{instalacion.direccion}}]{{/cada}}",
      tenantA,
      { finalidad: "propuesta" },
    );
    expect(r).toMatchObject({
      ok: true,
      texto: "[Planta Norte · Av. Uno 100][Bodega Sur · Calle Dos 200]",
    });
  });

  it("el bloque condicional solo aparece si hay valor", () => {
    const plantilla = "A{{#si cotizacion.valida_hasta}}-vigente{{/si}}B";
    expect(renderizarPlantillaCampos(plantilla, tenantA, { finalidad: "propuesta" })).toMatchObject(
      { texto: "A-vigenteB" },
    );
    expect(renderizarPlantillaCampos(plantilla, tenantB, { finalidad: "propuesta" })).toMatchObject(
      { texto: "AB" },
    );
  });

  it("informa faltantes sin inventarlos y puede exigir completitud", () => {
    const plantilla = "{{cuenta.nombre}} / {{cotizacion.codigo}}";
    const r = renderizarPlantillaCampos(plantilla, tenantB, { finalidad: "propuesta" });
    expect(r).toMatchObject({
      ok: true,
      texto: "Cliente Ficticio Dos / ",
      faltantes: ["cotizacion.codigo"],
    });
    const estricto = renderizarPlantillaCampos(plantilla, tenantB, {
      finalidad: "propuesta",
      exigirCompleto: true,
    });
    expect(estricto).toMatchObject({
      ok: false,
      problemas: [{ codigo: "faltante", token: "cotizacion.codigo" }],
    });
  });

  it("una colección vacía se informa como faltante", () => {
    const r = renderizarPlantillaCampos("{{#cada instalaciones}}x{{/cada}}", tenantB, {
      finalidad: "propuesta",
    });
    expect(r).toMatchObject({ ok: true, texto: "", faltantes: ["colecciones.instalaciones"] });
  });

  it("escapa HTML en cada valor y no escapa en texto plano", () => {
    const v: ValoresCampos = { campos: { "cuenta.nombre": '<script>alert("x")</script>' } };
    expect(
      renderizarPlantillaCampos("{{cuenta.nombre}}", v, { finalidad: "propuesta", html: true }),
    ).toMatchObject({ texto: "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;" });
    expect(
      renderizarPlantillaCampos("{{cuenta.nombre}}", v, { finalidad: "propuesta" }),
    ).toMatchObject({ texto: '<script>alert("x")</script>' });
  });

  it("rechaza enlaces que no son http(s)", () => {
    const v: ValoresCampos = {
      colecciones: { instalaciones: [{ "instalacion.mapa_url": "javascript:alert(1)" }] },
    };
    const r = renderizarPlantillaCampos(
      "{{#cada instalaciones}}{{instalacion.mapa_url}}{{/cada}}",
      v,
      { finalidad: "propuesta" },
    );
    expect(r).toMatchObject({ ok: false, problemas: [{ codigo: "url_invalida" }] });
  });

  it("un campo sensible de contrato no se filtra a la propuesta aunque el valor exista", () => {
    const contrato = renderizarPlantillaCampos("RUT {{persona.rut}}", tenantA, {
      finalidad: "contrato",
    });
    expect(contrato).toMatchObject({ ok: true, texto: "RUT 12.345.678-5" });
    const propuesta = renderizarPlantillaCampos("RUT {{persona.rut}}", tenantA, {
      finalidad: "propuesta",
    });
    expect(propuesta).toMatchObject({ ok: false, problemas: [{ codigo: "no_autorizado" }] });
    expect(JSON.stringify(propuesta)).not.toContain("12.345.678-5");
  });

  it("dos tenants ficticios no se mezclan: cada render usa solo sus valores", () => {
    const plantilla = "{{empresa.nombre}} → {{cuenta.nombre}}";
    expect(renderizarPlantillaCampos(plantilla, tenantA, { finalidad: "propuesta" })).toMatchObject(
      { texto: "Seguridad Ficticia A → Cliente Ficticio Uno" },
    );
    expect(renderizarPlantillaCampos(plantilla, tenantB, { finalidad: "propuesta" })).toMatchObject(
      { texto: "Aseo Ficticio B → Cliente Ficticio Dos" },
    );
  });

  it("no renderiza una plantilla inválida", () => {
    const r = renderizarPlantillaCampos("{{cuenta.nombre}} {{cuenta.sueldo}}", tenantA, {
      finalidad: "propuesta",
    });
    expect(r.ok).toBe(false);
  });
});
