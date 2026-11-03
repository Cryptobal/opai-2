// CAR-25 (B1) · Fixtures ficticios: un caso por combinación real de FinanceDteRecurringTemplate.
import { describe, expect, it } from "vitest";

import { calcularPlan } from "../../scripts/importar-opai1/plan";
import { estadoVacio } from "../../scripts/importar-opai1/destino-tipos";
import { programacionRecurrenteOpai1 } from "../../scripts/importar-opai1/origen";
import { construirReporte } from "../../scripts/importar-opai1/reporte";
import { fixture } from "./memoria";

const SELLO = { createdAt: "2025-01-01T12:00:00.000Z", updatedAt: "2025-01-01T12:00:00.000Z" };
const linea = { description: "Servicio ficticio", unitPrice: 100_000 };

function plantilla(parcial: Record<string, unknown>) {
  return programacionRecurrenteOpai1.parse({
    crmAccountId: "acc-a1",
    lines: [linea],
    ...SELLO,
    ...parcial,
  });
}

function planDe(...filas: ReturnType<typeof plantilla>[]) {
  const plan = calcularPlan(
    { ...fixture(), recurringInvoiceSchedules: filas },
    estadoVacio(),
    { modulosActivos: ["finanzas"] },
  );
  return { plan, por: (id: string) => plan.programaciones.find((p) => p.idOpai1 === id) };
}

describe("recurrentes con la forma real de 1.0", () => {
  it("UF con cantidad, descuento y precio en UF escalada", () => {
    const { por } = planDe(
      plantilla({
        id: "uf",
        currency: "UF",
        lines: [{ itemName: "Guardia", quantity: 2.5, unitPriceUf: 12.3456, discountPct: 15.5 }],
      }),
    );
    expect(por("uf")?.datos?.lineas[0]).toMatchObject({
      glosa: "Guardia",
      cantidad: "2.5000",
      precioUnitarioClp: null,
      precioUnitarioUf: 123_456,
      descuentoPct: 1550,
    });
  });

  it("línea exenta y tipos 34, 56 y 61", () => {
    const { por } = planDe(
      plantilla({ id: "ex", dteType: 34, lines: [{ ...linea, isExempt: true }] }),
      plantilla({ id: "nd", dteType: 56 }),
      plantilla({ id: "nc", dteType: 61 }),
    );
    expect(por("ex")?.datos?.lineas[0]?.exento).toBe(true);
    expect(por("ex")?.datos?.tipoDte).toBe(34);
    expect(por("nd")?.datos?.tipoDte).toBe(56);
    expect(por("nc")?.datos?.tipoDte).toBe(61);
  });

  it("frecuencias quincenal, semanal y anual, y día -1", () => {
    const { por } = planDe(
      plantilla({ id: "q", frequency: "biweekly" }),
      plantilla({ id: "s", frequency: "weekly", dayOfWeek: 3 }),
      plantilla({ id: "a", frequency: "yearly", monthOfYear: 6, dayOfMonth: -1 }),
    );
    expect(por("q")?.datos?.frecuencia).toBe("quincenal");
    expect(por("s")?.datos).toMatchObject({ frecuencia: "semanal", diaSemana: 3 });
    expect(por("a")?.datos).toMatchObject({ frecuencia: "anual", mesDelAnio: 6, diaGeneracion: -1 });
  });

  it("sin cuenta de 1.0 pero con RUT: resuelve por RUT; sin cuenta en 2.0 queda congelada con aviso", () => {
    const { plan, por } = planDe(
      plantilla({ id: "rut-origen", crmAccountId: null, receiverRut: "76.333.333-7" }),
      plantilla({
        id: "congelada",
        crmAccountId: null,
        receiverRut: "11.111.111-1",
        receiverName: "Receptor Ficticio",
        receiverGiro: "Servicios",
      }),
      plantilla({ id: "nada", crmAccountId: null }),
    );
    expect(por("rut-origen")?.datos?.cuentaId).toBe("nueva:acc-a6");
    expect(por("congelada")?.datos?.cuentaId).toBeNull();
    expect(por("congelada")?.datos?.receptor).toMatchObject({
      rut: "11111111-1",
      razonSocial: "Receptor Ficticio",
      giro: "Servicios",
    });
    expect(plan.avisos).toContainEqual({ codigo: "programacion_sin_cuenta_en_2_0", idOpai1: "congelada" });
    expect(por("nada")).toMatchObject({ accion: "omitido", motivo: "sin_cuenta_ni_rut" });
  });

  it("valores no soportados se omiten con motivo nombrado y no hacen fallar el resto", () => {
    const { plan, por } = planDe(
      plantilla({ id: "ok" }),
      plantilla({ id: "freq", frequency: "daily" }),
      plantilla({ id: "tipo", dteType: 39 }),
      plantilla({ id: "mon", currency: "USD" }),
      plantilla({ id: "dia", dayOfMonth: 0 }),
      plantilla({ id: "pol", ufFixingPolicy: "OTRA" }),
      plantilla({ id: "uf-sin-precio", currency: "UF" }),
      plantilla({ id: "vacia", lines: [] }),
    );
    expect(por("ok")?.accion).toBe("crear");
    expect(por("freq")?.motivo).toBe("frecuencia_no_soportada");
    expect(por("tipo")?.motivo).toBe("tipo_dte_no_soportado");
    expect(por("mon")?.motivo).toBe("moneda_no_soportada");
    expect(por("dia")?.motivo).toBe("dia_del_mes_fuera_de_rango");
    expect(por("pol")?.motivo).toBe("politica_uf_no_soportada");
    expect(por("uf-sin-precio")?.motivo).toBe("linea_sin_precio_de_la_moneda");
    expect(por("vacia")?.motivo).toBe("sin_lineas");
    const reporte = construirReporte(plan, "gard");
    const motivos = reporte.omitidas.filter((o) => o.entidad === "programacion_recurrente");
    expect(motivos.map((o) => o.motivo).sort()).toContain("frecuencia_no_soportada");
    expect(JSON.stringify(reporte.omitidas)).not.toMatch(/Servicio ficticio/);
  });

  it("entra pausada, sin próxima ejecución, y guarda el último período de 1.0", () => {
    const { por } = planDe(
      plantilla({
        id: "est",
        active: true,
        nextRunAt: "2026-12-01T12:00:00.000Z",
        lastRunAt: "2026-11-01T12:00:00.000Z",
        lastSuccessfulRun: { runAt: "2026-10-01T12:00:00.000Z" },
      }),
      plantilla({ id: "exacto", lastSuccessfulRun: { runAt: "2026-10-01T12:00:00.000Z", period: "2026-09" } }),
      plantilla({ id: "nunca" }),
    );
    expect(por("est")?.datos).toMatchObject({ activa: false, ultimoPeriodo10: "2026-10" });
    expect(por("est")?.datos).not.toHaveProperty("proximaEjecucionEn");
    expect(por("exacto")?.datos?.ultimoPeriodo10).toBe("2026-09");
    expect(por("nunca")?.datos?.ultimoPeriodo10).toBeNull();
  });

  it("destinatarios por correo (para y cc) sin repetir", () => {
    const { por, plan } = planDe(
      plantilla({
        id: "mail",
        receiverEmail: "Pagos@Ejemplo.cl",
        receiverEmailCc: ["cobranza@ejemplo.cl", "pagos@ejemplo.cl", "no-es-correo"],
      }),
    );
    expect(por("mail")?.datos?.destinatariosCorreo).toEqual([
      { correo: "pagos@ejemplo.cl", tipo: "para" },
      { correo: "cobranza@ejemplo.cl", tipo: "cc" },
    ]);
    expect(plan.destinatarios.asignados).toBeGreaterThanOrEqual(2);
  });

  it("IPC, política UF y fechas se conservan", () => {
    const { por } = planDe(
      plantilla({
        id: "ipc",
        hasIpcAdjustment: true,
        ipcAdjustmentMonths: 12,
        ipcStartDate: "2026-03-01T00:00:00.000Z",
        ufFixingPolicy: "CUSTOM_DAY",
        ufFixingDay: 5,
        startDate: "2025-01-15",
        endDate: "2027-01-14",
        autoSendEmail: true,
      }),
    );
    expect(por("ipc")?.datos).toMatchObject({
      ajusteIpcMeses: 12,
      ajusteIpcDesde: "2026-03-01",
      politicaUf: "CUSTOM_DAY",
      diaUf: 5,
      fechaInicio: "2025-01-15",
      fechaFin: "2027-01-14",
      envioAutomatico: true,
    });
  });

  it("la segunda corrida sobre un destino ya mapeado no crea nada", () => {
    const filas = [plantilla({ id: "idem" })];
    const destino = estadoVacio();
    destino.ids.push({ entidadTipo: "programacion_recurrente", idExterno: "idem", entidadId: "p-1" });
    const plan = calcularPlan({ ...fixture(), recurringInvoiceSchedules: filas }, destino, {
      modulosActivos: ["finanzas"],
    });
    expect(plan.programaciones.map((p) => p.accion)).toEqual(["sin_cambios"]);
  });
});
