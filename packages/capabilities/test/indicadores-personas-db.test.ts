import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { dato } from "./maestros-ayuda";

// Indicador de Personas «Fichas con documentos al día» (CAR-309, ADR-094) contra Postgres real, con
// RLS sin BYPASSRLS: una jefatura con tres personas a cargo; una tiene un documento vencido, otra uno
// vencido pero ya reemplazado y otra uno que vence después. Datos ficticios.
describe.skipIf(!urlPropietario)("indicador de documentos al día contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let usuaria = "";
  const sufijo = randomUUID().slice(0, 8);
  const persona: Record<string, string> = {};
  const MEDIR = "core.indicadores_gestion.medir";
  const INDICADOR = "core.personas_documentos_al_dia";
  type Salida = { mediciones: { sujetoId: string; valor: number | null }[] };
  let n = 0;

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: usuaria },
      usuario: { id: usuaria, nombre: "Gema", email: `g-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: [],
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const empresa = (slug: string) =>
      e.admin.tenant
        .create({ data: { slug, nombre: slug, vertical: "seguridad", timezone: "America/Santiago" } })
        .then((t) => t.id);
    a = await empresa(`ipd-a-${sufijo}`);
    b = await empresa(`ipd-b-${sufijo}`);
    usuaria = (
      await e.admin.user.create({ data: { name: "Gema", email: `g-${sufijo}@prueba.cl`, emailVerified: true } })
    ).id;
    for (const tenantId of [a, b]) {
      await e.admin.membership.create({ data: { tenantId, userId: usuaria, rol: "owner", portales: ["erp"] } });
    }
    const gerente = (await e.admin.cargo.create({ data: { tenantId: a, nombre: "Gerente" } })).id;
    const jefe = (
      await e.admin.cargo.create({
        data: { tenantId: a, nombre: "Supervisor", jefaturaCargoId: gerente, jefaturaVe: "equipo" },
      })
    ).id;
    // Nochero: se ve por asignación y nadie lo tiene asignado: sube al nivel que ve por equipo (Gerente).
    const nochero = (
      await e.admin.cargo.create({
        data: { tenantId: a, nombre: "Nochero", jefaturaCargoId: jefe, jefaturaVe: "asignadas" },
      })
    ).id;
    const guardia = (
      await e.admin.cargo.create({
        data: { tenantId: a, nombre: "Guardia", jefaturaCargoId: jefe, jefaturaVe: "equipo" },
      })
    ).id;
    const crear = async (clave: string, cargoId: string) => {
      n += 1;
      const p = await e.admin.persona.create({
        data: { tenantId: a, nombres: clave, apellidos: "Prueba", rut: `${20_000_000 + n}-${sufijo.slice(0, 1)}` },
      });
      persona[clave] = p.id;
      await e.admin.vinculoLaboral.create({
        data: { tenantId: a, personaId: p.id, cargoId, tipo: "indefinido", inicio: new Date("2026-01-01") },
      });
    };
    await crear("gina", gerente);
    await crear("julia", jefe);
    for (const g of ["vera", "victor", "valeria"]) await crear(g, guardia);
    await crear("wanda", nochero);
    const documento = async (
      clave: string,
      vence: string,
      extra: { reemplazaAId?: string; estado?: string; rol?: string } = {},
    ) => {
      n += 1;
      const d = await e.admin.documento.create({
        data: {
          tenantId: a,
          nombre: `doc-${n}.pdf`,
          mime: "application/pdf",
          tamano: 10,
          storageKey: `t/${sufijo}/${n}`,
          estado: extra.estado ?? "disponible",
          creadoPorTipo: "system",
          venceEn: new Date(`${vence}T00:00:00Z`),
          ...(extra.reemplazaAId ? { reemplazaAId: extra.reemplazaAId } : {}),
        },
      });
      await e.admin.documentoVinculo.create({
        data: {
          tenantId: a,
          documentoId: d.id,
          entidadTipo: "persona",
          entidadId: persona[clave] ?? "",
          rol: extra.rol ?? "propietario",
        },
      });
      return d.id;
    };
    await documento("vera", "2026-10-15");
    // Al confirmar la versión nueva, la anterior queda «reemplazado» (flujo real de Documentos).
    const viejo = await documento("victor", "2026-10-10", { estado: "reemplazado" });
    await documento("victor", "2027-10-10", { reemplazaAId: viejo });
    await documento("valeria", "2026-12-20");
    // No cuentan: una subida sin confirmar, una archivada y una referencia a un documento ajeno.
    await documento("valeria", "2026-10-01", { estado: "pendiente" });
    await documento("valeria", "2026-10-01", { estado: "archivado" });
    await documento("valeria", "2026-10-01", { rol: "referencia" });
    // Vence el último día del mes: al cierre de octubre ya está vencido; en septiembre no.
    await documento("wanda", "2026-10-31");
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("mide a la jefatura por su gente directa: vencido cuenta, reemplazado no, y por mes", async () => {
    const oct = await dato<Salida>(ctx(a), MEDIR, { indicador: INDICADOR, periodo: "2026-10" });
    const valor = (r: Salida, clave: string) => r.mediciones.find((m) => m.sujetoId === persona[clave])?.valor;
    // Julia: Vera tiene un vencido; Victor lo reemplazó; Valeria vence en diciembre: 2 de 3 al día.
    expect(valor(oct, "julia")).toBe(66.7);
    // Gina: Julia al día y Wanda (sin jefe asignado, sube a la gerencia) con uno que venció el 31.
    expect(valor(oct, "gina")).toBe(50);
    expect(oct.mediciones).toHaveLength(2);
    const sep = await dato<Salida>(ctx(a), MEDIR, { indicador: INDICADOR, periodo: "2026-09" });
    expect([valor(sep, "julia"), valor(sep, "gina")]).toEqual([100, 100]);
  });

  it("aísla por empresa: otra empresa no ve jefaturas ni documentos ajenos", async () => {
    const enB = await dato<Salida>(ctx(b), MEDIR, { indicador: INDICADOR, periodo: "2026-10" });
    expect(enB.mediciones).toEqual([]);
  });
});
