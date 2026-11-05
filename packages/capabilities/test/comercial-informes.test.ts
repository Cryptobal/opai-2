import { beforeEach, describe, expect, it } from "vitest";

import { TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { alertasDe, diasEntre, montoMensual, porcentaje } from "../src/comercial/informes-calculo";
import { codigo, dato } from "./maestros-ayuda";
import { CU, CU2, E, MP, MPO, ctxComercial, etapaId, reiniciarComercial } from "./comercial-ayuda";

beforeEach(reiniciarComercial);

const hace = (d: number) => new Date(Date.now() - d * 86_400_000);
const dia = (f: Date) => f.toISOString().slice(0, 10);
let n = 0;
const neg = (extra: Record<string, unknown>) => ({
  id: `0192f3a0-0000-7000-8000-00000000ab${String(++n).padStart(2, "0")}`,
  tenantId: TENANT_DE_PRUEBA,
  cuentaId: CU,
  embudoId: E,
  etapaId: etapaId(0),
  estado: "abierto",
  titulo: "Negocio",
  probabilidad: 10,
  createdAt: hace(60),
  updatedAt: hace(60),
  ...extra,
});

describe("informes de Comercial · cálculo puro", () => {
  it("monto mensual prefiere la cotización vigente y porcentaje es entero", () => {
    expect(montoMensual({ valorMensual: 5, montoEstimadoMensual: 9 })).toBe(5);
    expect(montoMensual({ valorMensual: null, montoEstimadoMensual: 9 })).toBe(9);
    expect(montoMensual({ valorMensual: null, montoEstimadoMensual: null })).toBe(0);
    expect(porcentaje(1, 3)).toBe(33);
    expect(porcentaje(1, 0)).toBe(0);
    expect(diasEntre("2026-11-01", "2026-11-15")).toBe(14);
  });

  it("alertas: monto, cierre y inactividad; sin permiso no afirma inactividad", () => {
    const base = {
      etapaExigeMonto: true,
      etapaExigeCierre: true,
      monto: 0,
      cierreEstimado: "2026-10-01",
      ultimaActividad: "2026-10-01",
      creadoEn: "2026-09-01T00:00:00Z",
    };
    expect(alertasDe(base, "2026-11-04", 14, true).alertas).toEqual([
      "sin_monto",
      "cierre_vencido",
      "sin_actividad",
    ]);
    const sin = alertasDe({ ...base, cierreEstimado: null }, "2026-11-04", 14, false);
    expect(sin.alertas).toEqual(["sin_monto", "sin_fecha_cierre"]);
    expect(sin.diasSinActividad).toBeNull();
  });
});

describe("comercial.informes.perdidos_por_motivo", () => {
  it("agrupa por motivo, calcula porcentaje y respeta el rango", async () => {
    const { ctx, tabla } = ctxComercial();
    tabla("negocio").push(
      neg({
        estado: "perdido",
        etapaId: etapaId(7),
        motivoPerdidaId: MP,
        perdidoEn: hace(10),
        montoEstimadoMensual: 1_000_000,
      }),
      neg({
        estado: "perdido",
        etapaId: etapaId(7),
        motivoPerdidaId: MP,
        perdidoEn: hace(5),
        valorMensual: 500_000,
      }),
      neg({ estado: "perdido", etapaId: etapaId(7), motivoPerdidaId: MPO, perdidoEn: hace(3) }),
      neg({
        estado: "perdido",
        etapaId: etapaId(7),
        motivoPerdidaId: MP,
        perdidoEn: hace(200),
        valorMensual: 9,
      }),
      neg({ estado: "abierto" }),
    );
    const r = await dato<{
      totalPerdidos: number;
      montoMensualPerdidoClp: number;
      motivos: { nombre: string; cantidad: number; porcentaje: number; montoMensualClp: number }[];
    }>(ctx, "comercial.informes.perdidos_por_motivo", {});
    expect(r.totalPerdidos).toBe(3);
    expect(r.montoMensualPerdidoClp).toBe(1_500_000);
    expect(r.motivos[0]).toMatchObject({
      nombre: "Precio",
      cantidad: 2,
      porcentaje: 67,
      montoMensualClp: 1_500_000,
    });
    expect(r.motivos[1]).toMatchObject({ nombre: "Otro", cantidad: 1, porcentaje: 33 });
  });

  it("rechaza fechas mal formadas y exige el permiso de lectura", async () => {
    const { ctx } = ctxComercial();
    expect(await codigo(ctx, "comercial.informes.perdidos_por_motivo", { desde: "ayer" })).toBe(
      "INVALID_INPUT",
    );
    const sin = ctxComercial({ permisos: [] });
    expect(await codigo(sin.ctx, "comercial.informes.perdidos_por_motivo", {})).toBe("FORBIDDEN");
  });
});

describe("comercial.informes.cierre", () => {
  it("cuenta ganados y perdidos, tasa y pipeline abierto, agrupado por mes", async () => {
    const { ctx, tabla } = ctxComercial();
    tabla("negocio").push(
      neg({ estado: "ganado", etapaId: etapaId(6), ganadoEn: hace(10), valorMensual: 2_000_000 }),
      neg({ estado: "ganado", etapaId: etapaId(6), ganadoEn: hace(8), valorMensual: 1_000_000 }),
      neg({
        estado: "perdido",
        etapaId: etapaId(7),
        perdidoEn: hace(7),
        montoEstimadoMensual: 600_000,
      }),
      neg({ estado: "abierto", montoEstimadoMensual: 400_000 }),
      neg({ estado: "ganado", etapaId: etapaId(6), ganadoEn: hace(300), valorMensual: 7 }),
    );
    const r = await dato<{
      ganados: number;
      perdidos: number;
      tasaGanePct: number;
      montoGanadoMensualClp: number;
      pipelineAbierto: { cantidad: number; montoMensualClp: number };
      grupos: { clave: string }[];
    }>(ctx, "comercial.informes.cierre", {});
    expect(r).toMatchObject({
      ganados: 2,
      perdidos: 1,
      tasaGanePct: 67,
      montoGanadoMensualClp: 3_000_000,
    });
    expect(r.pipelineAbierto).toEqual({ cantidad: 1, montoMensualClp: 400_000 });
    expect(r.grupos.length).toBeGreaterThanOrEqual(1);
  });

  it("agrupa por responsable con su nombre y por origen sin responsable", async () => {
    const { ctx, tabla } = ctxComercial();
    tabla("negocio").push(
      neg({
        estado: "ganado",
        etapaId: etapaId(6),
        ganadoEn: hace(2),
        valorMensual: 100,
        responsableId: USUARIO_DE_PRUEBA.id,
      }),
      neg({ estado: "perdido", etapaId: etapaId(7), perdidoEn: hace(2), valorMensual: 50 }),
    );
    const r = await dato<{ grupos: { etiqueta: string; ganados: number; perdidos: number }[] }>(
      ctx,
      "comercial.informes.cierre",
      { agruparPor: "responsable" },
    );
    const ana = r.grupos.find((g) => g.etiqueta === "Ana");
    expect(ana).toMatchObject({ ganados: 1, perdidos: 0 });
    expect(r.grupos.find((g) => g.etiqueta === "Sin responsable")).toMatchObject({ perdidos: 1 });
    expect(r.grupos.reduce((s, g) => s + g.ganados + g.perdidos, 0)).toBe(2);
  });
});

describe("comercial.negocios.alertas", () => {
  it("marca etapa avanzada sin monto, cierre vencido y falta de actividad", async () => {
    const { ctx, tabla } = ctxComercial();
    const sinMonto = neg({
      etapaId: etapaId(3),
      titulo: "Sin monto",
      cierreEstimado: new Date(`${dia(hace(-30))}T00:00:00Z`),
    });
    const vencido = neg({
      etapaId: etapaId(3),
      titulo: "Vencido",
      montoEstimadoMensual: 1_000_000,
      cierreEstimado: new Date(`${dia(hace(5))}T00:00:00Z`),
      cuentaId: CU2,
    });
    const sano = neg({ etapaId: etapaId(0), titulo: "Reciente", createdAt: hace(1) });
    tabla("negocio").push(sinMonto, vencido, sano);
    const r = await dato<{
      inactividadEvaluada: boolean;
      total: number;
      items: { titulo: string; alertas: string[] }[];
    }>(ctx, "comercial.negocios.alertas", {});
    expect(r.inactividadEvaluada).toBe(true);
    expect(r.total).toBe(2);
    const por = Object.fromEntries(r.items.map((i) => [i.titulo, i.alertas]));
    expect(por["Sin monto"]).toEqual(["sin_monto", "sin_actividad"]);
    expect(por["Vencido"]).toEqual(["cierre_vencido", "sin_actividad"]);
    expect(por["Reciente"]).toBeUndefined();
  });

  it("una actividad reciente en el negocio quita la alerta de inactividad", async () => {
    const { ctx, tabla } = ctxComercial();
    const n1 = neg({ etapaId: etapaId(0), titulo: "Con contacto" });
    tabla("negocio").push(n1);
    tabla("actividad").push({
      id: "0192f3a0-0000-7000-8000-0000000000aa",
      tenantId: TENANT_DE_PRUEBA,
      tipo: "llamada",
      titulo: "Llamada",
      ocurrioEn: hace(2),
    });
    tabla("actividadVinculo").push({
      id: "0192f3a0-0000-7000-8000-0000000000ab",
      tenantId: TENANT_DE_PRUEBA,
      actividadId: "0192f3a0-0000-7000-8000-0000000000aa",
      negocioId: n1.id,
    });
    const r = await dato<{ total: number }>(ctx, "comercial.negocios.alertas", {});
    expect(r.total).toBe(0);
  });
});
