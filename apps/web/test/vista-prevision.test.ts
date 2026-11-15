import { describe, expect, it } from "vitest";

import type { Prevision } from "@/app/(erp)/personas/_componentes/lecturas-ficha";
import {
  gruposPrevision,
  inicialPrevision,
  porVerificar,
} from "@/app/(erp)/personas/_componentes/vista-prevision";

const base: Prevision = {
  personaId: "p", afp: "habitat", regimen: "afp", sistemaSalud: "isapre", isapreNombre: "Colmena",
  planIsapre: "Plan Esencial", planUf: "3.2", cotizacionUfPct: null, jubilado: false, tipoPension: "no",
  cotizaAfp: true, cotizaAfc: true, cotizaSalud: true, saludAdicionalPct: "2.1", apvInstitucion: null,
  apvRegimen: null, apvMonto: null, apvMoneda: null, tramoAsignacion: "B", cargasSimples: 2,
  cargasMaternales: 0, cargasInvalidez: 0, discapacidadInvalidez: "no", sensiblesOcultos: false,
};
const valor = (d: Prevision, grupo: string, etiqueta: string) =>
  gruposPrevision(d).find((g) => g.titulo === grupo)?.pares.find((p) => p.etiqueta === etiqueta)?.valor;

describe("tarjeta Previsión (CAR-276)", () => {
  it("muestra etiquetas del catálogo agrupadas como el diseño", () => {
    expect(gruposPrevision(base).map((g) => g.titulo)).toEqual([
      "Sistema previsional", "Salud", "Cotiza", "APV, cargas y discapacidad",
    ]);
    expect(valor(base, "Sistema previsional", "AFP")).toBe("Habitat");
    expect(valor(base, "Salud", "Isapre y plan")).toBe("Colmena · Plan Esencial");
    expect(valor(base, "Salud", "% adicional")).toBe("2,1 %");
    expect(valor(base, "APV, cargas y discapacidad", "APV")).toBe("Sin APV");
    expect(valor(base, "APV, cargas y discapacidad", "Cargas familiares")).toBe("2 simples · Tramo B");
  });

  it("APV con monto en UF y textos anteriores al selector", () => {
    const d = { ...base, afp: "AFP Habitat", apvInstitucion: "Principal", apvRegimen: "A", apvMonto: "1.5", apvMoneda: "uf" };
    expect(valor(d, "Sistema previsional", "AFP")).toBe("Habitat");
    expect(valor(d, "APV, cargas y discapacidad", "APV")).toBe("Principal · Régimen A · 1,5 UF");
    expect(porVerificar(d)).toBe(false);
    expect(porVerificar({ ...base, afp: "Otra AFP" })).toBe(true);
    expect(inicialPrevision({ ...base, afp: "Otra AFP" }).afp).toBeNull();
  });

  it("con datos sensibles ocultos no inventa «Sin APV» ni «Sin cargas»", () => {
    const d = { ...base, sensiblesOcultos: true, saludAdicionalPct: null, tramoAsignacion: null, cargasSimples: null, cargasMaternales: null, cargasInvalidez: null, discapacidadInvalidez: null };
    expect(valor(d, "APV, cargas y discapacidad", "APV")).toBeNull();
    expect(valor(d, "APV, cargas y discapacidad", "Cargas familiares")).toBeNull();
  });
});
