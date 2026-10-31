import { describe, expect, it } from "vitest";

import {
  CONFIG_PORTAL_DEFECTO,
  disponibilidadSeccion,
  instalacionesVisibles,
  normalizarCorreo,
  normalizarDestinatarios,
  SECCIONES_PORTAL,
  tipoNuncaVisibleParaCliente,
  tiposDocumentoPermitidos,
  type AccesoBase,
  type InstalacionDeCuenta,
} from "./portal-cliente";

const inst = (id: string, cuentaId: string, extra: Partial<InstalacionDeCuenta> = {}) => ({
  id,
  cuentaId,
  estado: "activa",
  archivada: false,
  ...extra,
});

const acceso = (extra: Partial<AccesoBase> = {}): AccesoBase => ({
  estado: "activo",
  cuentaId: "c1",
  todasInstalaciones: false,
  instalaciones: [],
  ...extra,
});

describe("instalacionesVisibles (fail-closed, ADR-022)", () => {
  const todas = [inst("i1", "c1"), inst("i2", "c1"), inst("i3", "c2")];

  it("sin acceso no ve nada", () => {
    expect(instalacionesVisibles(null, todas)).toEqual([]);
  });

  it("un acceso sin instalaciones habilitadas no ve nada", () => {
    expect(instalacionesVisibles(acceso(), todas)).toEqual([]);
  });

  it("solo ve las habilitadas de su cuenta", () => {
    expect(instalacionesVisibles(acceso({ instalaciones: ["i2"] }), todas)).toEqual(["i2"]);
  });

  it("una instalación habilitada que es de otra cuenta se ignora", () => {
    expect(instalacionesVisibles(acceso({ instalaciones: ["i3"] }), todas)).toEqual([]);
  });

  it("todasInstalaciones concede las de su cuenta y ninguna ajena", () => {
    expect(instalacionesVisibles(acceso({ todasInstalaciones: true }), todas)).toEqual(["i1", "i2"]);
  });

  it("suspendido y revocado no ven nada, aunque tengan todas", () => {
    for (const estado of ["suspendido", "revocado", "pendiente", ""])
      expect(instalacionesVisibles(acceso({ estado, todasInstalaciones: true }), todas)).toEqual([]);
  });

  it("prospectos, inactivas y archivadas no se muestran", () => {
    const mezcla = [
      inst("a", "c1"),
      inst("p", "c1", { estado: "prospecto" }),
      inst("x", "c1", { estado: "inactiva" }),
      inst("z", "c1", { archivada: true }),
    ];
    expect(instalacionesVisibles(acceso({ todasInstalaciones: true }), mezcla)).toEqual(["a"]);
  });
});

describe("tipos de documento (Ley 21.719)", () => {
  it("liquidaciones, salud y finiquitos nunca son visibles", () => {
    for (const c of [
      "liquidacion_sueldo",
      "Liquidación de sueldo",
      "examen_salud",
      "finiquito",
      "licencia_medica",
      "sueldo",
    ])
      expect(tipoNuncaVisibleParaCliente(c)).toBe(true);
  });

  it("credencial, curso y antecedentes sí pueden marcarse", () => {
    for (const c of ["credencial_os10", "curso_os10", "certificado_antecedentes", "contrato_trabajo"])
      expect(tipoNuncaVisibleParaCliente(c)).toBe(false);
  });

  it("tiposDocumentoPermitidos descarta los vedados y los repetidos", () => {
    expect(
      tiposDocumentoPermitidos(["credencial_os10", "liquidacion_sueldo", "credencial_os10"]),
    ).toEqual(["credencial_os10"]);
  });
});

describe("destinatarios del informe", () => {
  it("normaliza, deduplica y separa los inválidos", () => {
    expect(normalizarDestinatarios([" Ana@Atlas.cl ", "ana@atlas.cl", "malo", "b@c.cl"])).toEqual({
      validos: ["ana@atlas.cl", "b@c.cl"],
      invalidos: ["malo"],
    });
    expect(normalizarCorreo("sin-arroba")).toBeNull();
  });
});

describe("configuración por defecto", () => {
  it("no muestra ningún tipo de documento y omite el RUT en reportes", () => {
    expect(CONFIG_PORTAL_DEFECTO.tiposDocumentoVisibles).toEqual([]);
    expect(CONFIG_PORTAL_DEFECTO.rutEnReportes).toBe("omitido");
  });

  it("hoy ninguna sección tiene datos propios: todas son pendientes, sin cifras", () => {
    for (const s of SECCIONES_PORTAL) expect(disponibilidadSeccion(s)).toBe("pendiente");
  });
});
