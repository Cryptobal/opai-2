// CAR-207: el backfill de cobertura simula sin escribir, corrige solo lo que difiere, es idempotente
// y no toca otros tenants.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sincronizarCobertura } from "../scripts/sincronizar-cobertura-nucleo";
import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("sincronizar-cobertura", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  const t = { a: "", b: "" };
  const p = { conTitular: "", sinSerie: "", pasada: "", yaOk: "", inactivo: "", otro: "" };

  beforeAll(async () => {
    e = await prepararEntorno();
    const nuevo = (slug: string) => e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    t.a = (await nuevo(`cob-a-${sufijo}`)).id;
    t.b = (await nuevo(`cob-b-${sufijo}`)).id;
    const base = async (tenantId: string) => {
      const cuenta = await e.admin.cuenta.create({ data: { tenantId, nombre: "C" } });
      const inst = await e.admin.instalacion.create({ data: { tenantId, cuentaId: cuenta.id, nombre: "Planta" } });
      const cargo = await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia" } });
      const patron = await e.admin.patronTurno.create({ data: { tenantId, nombre: "4x4", diasTrabajo: 4, diasDescanso: 4 } });
      const persona = await e.admin.persona.create({ data: { tenantId, nombres: "P", apellidos: "Q", rut: `${Math.floor(Math.random() * 9e6) + 1e6}-K`, estado: "activa" } });
      const puesto = async (nombre: string, extra: Record<string, unknown> = {}) =>
        (await e.admin.puesto.create({ data: { tenantId, instalacionId: inst.id, cargoId: cargo.id, nombre, diasTrabajo: 4, diasDescanso: 4, horaInicio: "08:00", horaFin: "20:00", ...extra } })).id;
      const serie = (puestoId: string, titular: string | null, desde: string, hasta: string | null) =>
        e.admin.seriePauta.create({ data: { tenantId, puestoId, patronId: patron.id, inicioCiclo: new Date(desde), titularPersonaId: titular, vigenteDesde: new Date(desde), vigenteHasta: hasta ? new Date(hasta) : null } });
      return { puesto, serie, persona: persona.id };
    };
    const a = await base(t.a);
    p.conTitular = await a.puesto("Con titular");
    p.sinSerie = await a.puesto("Sin serie", { cobertura: "cubierto", coberturaMotivo: null });
    p.pasada = await a.puesto("Serie pasada", { cobertura: "cubierto", coberturaMotivo: null });
    p.yaOk = await a.puesto("Ya correcto", { cobertura: "cubierto", coberturaMotivo: null });
    p.inactivo = await a.puesto("Inactivo", { estado: "inactivo" });
    await a.serie(p.conTitular, a.persona, "2026-01-01", null);
    await a.serie(p.pasada, a.persona, "2026-01-01", "2026-01-31");
    await a.serie(p.yaOk, a.persona, "2026-01-01", null);
    await a.serie(p.inactivo, a.persona, "2026-01-01", null);
    const b = await base(t.b);
    p.otro = await b.puesto("Otro tenant");
    await b.serie(p.otro, b.persona, "2026-01-01", null);
  });

  afterAll(async () => { await e?.cerrar(); });

  it("simula sin escribir y lista solo lo que difiere", async () => {
    const r = await sincronizarCobertura(e.admin, { tenantId: t.a, aplicar: false, hoy: "2026-11-06" });
    expect(r.aplicado).toBe(false);
    expect(r.cambios.map((c) => c.nombre).sort()).toEqual(["Con titular", "Serie pasada", "Sin serie"]);
    expect((await e.admin.puesto.findUniqueOrThrow({ where: { id: p.conTitular } })).cobertura).toBe("ppc");
  });

  it("aplica, es idempotente, no toca puestos inactivos ni otros tenants", async () => {
    const r = await sincronizarCobertura(e.admin, { tenantId: t.a, aplicar: true, hoy: "2026-11-06" });
    expect(r.cambios).toHaveLength(3);
    expect(await e.admin.puesto.findUniqueOrThrow({ where: { id: p.conTitular } })).toMatchObject({ cobertura: "cubierto", coberturaMotivo: null });
    expect(await e.admin.puesto.findUniqueOrThrow({ where: { id: p.sinSerie } })).toMatchObject({ cobertura: "ppc", coberturaMotivo: "sin_asignar" });
    expect(await e.admin.puesto.findUniqueOrThrow({ where: { id: p.pasada } })).toMatchObject({ cobertura: "ppc" });
    expect((await e.admin.puesto.findUniqueOrThrow({ where: { id: p.inactivo } })).cobertura).toBe("ppc");
    expect((await e.admin.puesto.findUniqueOrThrow({ where: { id: p.otro } })).cobertura).toBe("ppc");
    expect((await sincronizarCobertura(e.admin, { tenantId: t.a, aplicar: true, hoy: "2026-11-06" })).cambios).toHaveLength(0);
  });
});
