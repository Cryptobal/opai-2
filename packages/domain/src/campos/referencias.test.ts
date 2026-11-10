import { describe, expect, it } from "vitest";

import {
  camposPara,
  clasificarCampos,
  nombreReferencia,
  referenciaVigente,
  renderizarPlantillaCampos,
  validarPlantillaCampos,
  valoresReferencia,
} from "./index";

const cuenta = { nombre: "Ficticia Logística SpA", giro: "Logística", comuna: "Quilicura" };
const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("referencias de clientes · catálogo (CAR-138 PR 7)", () => {
  it("solo están en propuestas y documentos, nunca en contratos ni correos", () => {
    const enContrato = validarPlantillaCampos(
      "{{#cada referencias}}{{referencia.cliente}}{{/cada}}",
      "contrato",
    );
    expect(enContrato.problemas.map((p) => p.codigo)).toEqual(["no_autorizado"]);
    expect(camposPara("correo").some((c) => c.clave.startsWith("referencia."))).toBe(false);
    const ok = validarPlantillaCampos(
      "{{#cada referencias}}{{referencia.cliente}} · {{referencia.cliente_desde | fecha}}{{/cada}}",
      "propuesta",
    );
    expect(ok.ok).toBe(true);
    expect(ok.colecciones).toEqual(["referencias"]);
  });

  it("las lee quien puede leer cuentas", () => {
    const sin = clasificarCampos("propuesta", () => false);
    expect(sin.sinPermiso.some((c) => c.clave === "referencia.cliente")).toBe(true);
    const con = clasificarCampos("propuesta", (p) => p === "core:cuentas.read");
    expect(con.autorizados.some((c) => c.clave === "referencia.cita")).toBe(true);
  });
});

describe("referencias · nombre y valores", () => {
  it("muestra el nombre real solo si el cliente lo autorizó; si no, lo anonimiza", () => {
    expect(nombreReferencia({ cuenta, mostrarNombre: true })).toBe("Ficticia Logística SpA");
    expect(nombreReferencia({ cuenta, mostrarNombre: false })).toBe(
      "Cliente de Logística en Quilicura",
    );
    expect(
      nombreReferencia({ cuenta: { nombre: "X", comuna: "Maipú" }, mostrarNombre: false }),
    ).toBe("Cliente en Maipú");
    expect(nombreReferencia({ cuenta: { nombre: "X" }, mostrarNombre: false })).toBe(
      "Cliente (reservado)",
    );
  });

  it("no inventa descripción ni cita; se renderizan con condición", () => {
    const v = valoresReferencia({ cuenta, mostrarNombre: false, descripcion: "  ", cita: null });
    expect(v["referencia.descripcion"]).toBeNull();
    const r = renderizarPlantillaCampos(
      "{{#cada referencias}}- {{referencia.cliente}}{{#si referencia.cita}}: «{{referencia.cita}}»{{/si}}\n{{/cada}}",
      { colecciones: { referencias: [v] } },
      { finalidad: "propuesta" },
    );
    expect(r).toMatchObject({
      ok: true,
      texto: "- Cliente de Logística en Quilicura\n",
      faltantes: [],
    });
  });

  it("sin referencias autorizadas, la repetición queda como faltante (no se rellena)", () => {
    const r = renderizarPlantillaCampos(
      "{{#cada referencias}}{{referencia.cliente}}{{/cada}}",
      { colecciones: { referencias: [] } },
      { finalidad: "propuesta" },
    );
    expect(r).toMatchObject({ ok: true, texto: "", faltantes: ["colecciones.referencias"] });
  });
});

describe("referencias · vigencia del consentimiento (opt-in)", () => {
  const otorgado = { estado: "otorgado", otorgadoEn: d("2026-11-01"), vigenteHasta: null };
  it.each([
    ["sin registro", null, false],
    ["otorgado y vigente", otorgado, true],
    ["revocado", { estado: "revocado", otorgadoEn: null, vigenteHasta: null }, false],
    ["otorgado con fecha futura", { ...otorgado, otorgadoEn: d("2026-12-01") }, false],
    ["vencido", { ...otorgado, vigenteHasta: d("2026-11-09") }, false],
    ["vence hoy", { ...otorgado, vigenteHasta: d("2026-11-10") }, true],
  ] as const)("%s", (_n, ultima, esperado) => {
    expect(referenciaVigente(ultima, "2026-11-10")).toBe(esperado);
  });
});
