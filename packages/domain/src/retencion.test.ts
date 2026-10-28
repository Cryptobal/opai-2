import { describe, expect, it } from "vitest";

import {
  POLITICA_RETENCION,
  describirRegla,
  elegibilidadPersona,
  evaluarRetencion,
  fechaCorte,
  reglaDe,
  reglasDelTrabajo,
} from "./retencion";

const ahora = new Date("2026-10-27T12:00:00Z");
const hace = (dias: number) => new Date(ahora.getTime() - dias * 86_400_000);
const trabajo = { accion: "anonimizar", gestion: "trabajo" } as const;

describe("evaluarRetencion", () => {
  it("vigente dentro del periodo y vencido pasado el periodo", () => {
    expect(evaluarRetencion(trabajo, { referencia: hace(10), dias: 30, ahora })).toBe("vigente");
    expect(evaluarRetencion(trabajo, { referencia: hace(31), dias: 30, ahora })).toBe("vencido");
  });

  it("el límite exacto ya está vencido (intervalo semiabierto)", () => {
    expect(evaluarRetencion(trabajo, { referencia: hace(30), dias: 30, ahora })).toBe("vencido");
  });

  it("sin días configurados o sin referencia no vence", () => {
    expect(evaluarRetencion(trabajo, { referencia: hace(9999), dias: 0, ahora })).toBe("sin_vencimiento");
    expect(evaluarRetencion(trabajo, { referencia: null, dias: 30, ahora })).toBe("sin_vencimiento");
  });

  it("un hecho regulado o una regla «conservar» nunca vence (ADR-023)", () => {
    const regulado = { accion: "conservar", gestion: "regulado" } as const;
    expect(evaluarRetencion(regulado, { referencia: hace(99999), dias: 1, ahora })).toBe("sin_vencimiento");
    const forzado = { accion: "anonimizar", gestion: "regulado" } as const;
    expect(evaluarRetencion(forzado, { referencia: hace(99999), dias: 1, ahora })).toBe("sin_vencimiento");
  });

  it("la obligación legal que sigue corriendo gana a la política", () => {
    const futuro = new Date(ahora.getTime() + 86_400_000);
    const r = evaluarRetencion(trabajo, { referencia: hace(100), dias: 30, ahora, conservarHasta: futuro });
    expect(r).toBe("conservar_por_ley");
    const pasada = hace(1);
    expect(evaluarRetencion(trabajo, { referencia: hace(100), dias: 30, ahora, conservarHasta: pasada })).toBe("vencido");
  });
});

describe("fechaCorte", () => {
  it("resta los días corridos y devuelve null sin periodo", () => {
    expect(fechaCorte(ahora, 365)?.toISOString()).toBe(hace(365).toISOString());
    expect(fechaCorte(ahora, 0)).toBeNull();
  });
});

describe("catálogo de retención", () => {
  it("una regla por tabla y claves únicas", () => {
    const tablas = POLITICA_RETENCION.map((r) => r.tabla);
    expect(new Set(tablas).size).toBe(tablas.length);
    const claves = POLITICA_RETENCION.map((r) => r.clave);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("los hechos regulados no tienen periodo ni acción destructiva", () => {
    for (const r of POLITICA_RETENCION.filter((x) => x.gestion === "regulado")) {
      expect(r.accion).toBe("conservar");
      expect(r.diasPropuestos).toBe(0);
    }
  });

  it("solo el trabajo diario actúa y lo hace sobre tablas no reguladas", () => {
    const t = reglasDelTrabajo().map((r) => r.tabla).sort();
    expect(t).toEqual(["contactos", "envios", "invitations", "personas"]);
  });

  it("lo que gestiona 07c no baja de los 30 días de la purga de intentos de login", () => {
    expect(reglaDe("login_intentos")).toMatchObject({ gestion: "externa", diasPropuestos: 30 });
  });

  it("los textos que ve el cliente no traen jerga interna ni nombres de personas", () => {
    const jerga = /ADR-|append-only|core\.|\bB\d+\b|brief|07[cd]|Carlos|Claude|PENDIENTE|PROPUESTA|_/;
    for (const r of POLITICA_RETENCION) {
      expect(r.nombre, r.clave).not.toMatch(jerga);
      for (const dias of [0, 30]) expect(describirRegla(r, dias), r.clave).not.toMatch(jerga);
    }
  });

  it("describe cada tipo de regla para el RAT", () => {
    const personas = reglaDe("personas");
    expect(personas && describirRegla(personas, 1825)).toMatch(/Anonimizar a los 1825 días/);
    expect(personas && describirRegla(personas, 0)).toMatch(/Sin vencimiento/);
    const aud = reglaDe("audit_events");
    expect(aud && describirRegla(aud, 0)).toMatch(/obligación legal/);
  });
});

describe("elegibilidadPersona", () => {
  const dia = (iso: string) => new Date(`${iso}T00:00:00Z`);
  const terminado = (termino: string) => ({ estado: "terminado", termino: dia(termino) });

  it("sin vínculos nunca hubo obligación laboral de conservar", () => {
    expect(elegibilidadPersona([], 1825, ahora)).toEqual({ ok: true });
  });

  it("un vínculo vigente o sin término lo impide", () => {
    expect(elegibilidadPersona([{ estado: "vigente", termino: null }], 1825, ahora)).toEqual({
      ok: false,
      motivo: "vinculo_vigente",
    });
    expect(elegibilidadPersona([terminado("2010-01-01"), { estado: "terminado", termino: null }], 1825, ahora).ok).toBe(false);
  });

  it("sin periodo configurado no se puede probar que venció", () => {
    expect(elegibilidadPersona([terminado("2010-01-01")], 0, ahora)).toEqual({
      ok: false,
      motivo: "politica_sin_definir",
    });
  });

  it("dentro del periodo de conservación se rechaza y dice desde cuándo procede", () => {
    const r = elegibilidadPersona([terminado("2024-10-27")], 1825, ahora);
    expect(r).toMatchObject({ ok: false, motivo: "en_conservacion" });
    expect(r.ok === false && r.hasta?.toISOString().slice(0, 10)).toBe("2029-10-26");
  });

  it("cuenta desde el ÚLTIMO término y procede una vez vencido", () => {
    const vinculos = [terminado("2015-01-01"), terminado("2020-01-01")];
    expect(elegibilidadPersona(vinculos, 1825, ahora)).toEqual({ ok: true });
    expect(elegibilidadPersona([...vinculos, terminado("2025-01-01")], 1825, ahora).ok).toBe(false);
  });
});
