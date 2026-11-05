// CAR-41: toda escritura `platform.*` deja su evento en la auditoría global (ámbito plataforma), y
// las que cambian algo de todas las empresas (ajustes, precios) con antes y después. Si se agrega
// una escritura de plataforma sin caso aquí, el primer test falla: hay que sumarla.
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { executeCapability } from "../src/execute";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, listarCapacidades, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { cargoDePrueba } from "./plataforma-cobros-semilla";
import { semillaTenant, U2 } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos([
    defineModule({
      id: "crm",
      nombre: "CRM",
      version: "0.1.0",
      dependencias: [],
      permisos: [],
      navegacion: [],
      configuracion: z.object({}),
      eventos: [],
      capacidades: [],
    }),
  ]);
});

const owner = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
const TRABAJO_FALLIDO = "0192f3a0-0000-7000-8000-0000000000f1";
const TRABAJO_PENDIENTE = "0192f3a0-0000-7000-8000-0000000000f2";
const APROBACION_A = "0192f3a0-0000-7000-8000-0000000000f3";
const APROBACION_R = "0192f3a0-0000-7000-8000-0000000000f4";
const PROPUESTA = "0192f3a0-0000-7000-8000-0000000000f5";
const CARGO = "0192f3a0-0000-7000-8000-0000000000f6";
const manana = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

function semilla() {
  const s = semillaTenant();
  const trabajo = (id: string, estado: string) => ({
    id,
    tenantId: TENANT_DE_PRUEBA,
    tipo: "outbox.correo",
    payload: {},
    estado,
    intentos: 1,
    maxIntentos: 5,
    programadoPara: new Date(),
    ultimoError: null,
  });
  const aprobacion = (id: string) => ({
    id,
    origenTenantId: TENANT_DE_PRUEBA,
    apiKeyId: null,
    agente: "Key",
    viaUserId: owner.id,
    capability: "platform.tenants.update",
    input: { tenantId: TENANT_DE_PRUEBA, nombre: "Aprobado" },
    resumen: "platform.tenants.update",
    estado: "pendiente",
    venceEn: new Date(Date.now() + 86_400_000),
    createdAt: new Date(),
  });
  return {
    ...s,
    user: [
      ...s.user.map((u) =>
        u.id === owner.id
          ? { ...u, platformRole: "owner" }
          : u.id === U2
            ? { ...u, twoFactorEnabled: true }
            : u,
      ),
      { id: "0192f3a0-0000-7000-8000-0000000000c9", name: "Suelto", email: "suelto@prueba.cl" },
    ],
    trabajo: [trabajo(TRABAJO_FALLIDO, "fallido"), trabajo(TRABAJO_PENDIENTE, "pendiente")],
    aprobacionPlataforma: [aprobacion(APROBACION_A), aprobacion(APROBACION_R)],
    cobroCargo: [cargoDePrueba(CARGO)],
    propuestaIndicador: [
      {
        id: PROPUESTA,
        indicador: { clave: "imm", nombre: "Ingreso mínimo mensual" },
        valorJson: 560_000,
        vigente: { valorJson: 539_000 },
        vigenteDesde: new Date(),
        fuente: "https://www.previred.com/indicadores-previsionales/",
        consultadaEl: null,
      },
    ],
  };
}

const t = TENANT_DE_PRUEBA;
/** Un caso por escritura `platform.*`: su input mínimo válido sobre la semilla. */
const CASOS: Record<string, Record<string, unknown>> = {
  "platform.ajustes.set": { modulo: "core", clave: "remuneraciones_imm", valor: 560_000 },
  "platform.precios.set": {
    recurso: "ia.economica",
    unidad: "token",
    costoUnitarioMicro: 3,
    vigenteDesde: manana(),
  },
  "platform.tenants.update": { tenantId: t, nombre: "Gard Renombrada" },
  "platform.tenants.set_estado": { tenantId: t, estado: "trial" },
  "platform.tenants.create": {
    slug: "nueva-car41",
    nombre: "Nueva",
    vertical: "seguridad",
    adminEmail: "owner@nueva.cl",
  },
  "platform.modules.set": { tenantId: t, moduloId: "crm", estado: "trial" },
  "platform.admins.invite": { tenantId: t, email: "admin@gard.cl", rol: "admin" },
  "platform.trabajos.reintentar": { tenantId: t, trabajoId: TRABAJO_FALLIDO },
  "platform.trabajos.cancelar": { tenantId: t, trabajoId: TRABAJO_PENDIENTE },
  "platform.users.set_role": { email: "beto@prueba.cl", platformRole: "support" },
  "platform.usuarios.restablecer_mfa": { email: "beto@prueba.cl" },
  "platform.usuarios.borrar": { email: "suelto@prueba.cl" },
  "platform.aprobaciones.aprobar": { id: APROBACION_A },
  "platform.aprobaciones.rechazar": { id: APROBACION_R, motivo: "no corresponde" },
  "platform.indicadores.resolver": { propuestaId: PROPUESTA, aprobar: true },
  "platform.cobros.condiciones_set": {
    tenantId: t,
    moduloId: "crm",
    condicion: { moneda: "CLP", precio: "100000", cobroDesde: "2026-01-01" },
  },
  "platform.cobros.cargos_generar": { tenantId: t, periodo: "2026-01" },
  "platform.cobros.cargo_anular": { tenantId: t, cargoId: CARGO, motivo: "precio mal cargado" },
};

describe("auditoría global de las escrituras de plataforma (CAR-41)", () => {
  it("toda escritura platform.* registrada tiene su caso aquí", () => {
    const escrituras = listarCapacidades()
      .filter((c) => c.modulo === "platform" && c.efecto !== "lectura")
      .map((c) => c.id)
      .sort();
    expect(escrituras).toEqual(Object.keys(CASOS).sort());
  });

  for (const conTenant of [true, false])
    it(`cada escritura deja un evento en la auditoría global (${conTenant ? "con" : "sin"} empresa elegida)`, async () => {
      for (const [id, input] of Object.entries(CASOS)) {
        const { ctx, tabla } = contextoDePrueba({ usuario: owner, semilla: semilla(), conTenant });
        const r = await executeCapability(ctx, id, input);
        expect(r, id).toMatchObject({ ok: true });
        const propios = tabla("auditoriaGlobal").filter((e) => e["capability"] === id);
        expect(propios, id).toHaveLength(1);
        expect(propios[0], id).toMatchObject({
          ambito: "plataforma",
          actorType: "user",
          actorId: owner.id,
          origenTenantId: conTenant ? TENANT_DE_PRUEBA : null,
        });
      }
    });

  it("ajustes y precios guardan antes y después; precios.set es irreversible", async () => {
    const { ctx, tabla } = contextoDePrueba({ usuario: owner, semilla: semilla() });
    const ajuste = CASOS["platform.ajustes.set"];
    await executeCapability(ctx, "platform.ajustes.set", ajuste);
    await executeCapability(ctx, "platform.ajustes.set", { ...ajuste, valor: 570_000 });
    const ajustes = tabla("auditoriaGlobal").filter(
      (e) => e["capability"] === "platform.ajustes.set",
    );
    expect(ajustes.map((e) => [e["antes"], e["despues"]])).toEqual([
      [null, { valor: 560_000, version: 1 }],
      [
        { valor: 560_000, version: 1 },
        { valor: 570_000, version: 2 },
      ],
    ]);
    const precio = CASOS["platform.precios.set"];
    await executeCapability(ctx, "platform.precios.set", precio);
    await executeCapability(ctx, "platform.precios.set", { ...precio, costoUnitarioMicro: 4 });
    const precios = tabla("auditoriaGlobal").filter(
      (e) => e["capability"] === "platform.precios.set",
    );
    expect(precios[0]).toMatchObject({ antes: null, despues: { costoUnitarioMicro: 3 } });
    expect(precios[1]).toMatchObject({
      antes: { costoUnitarioMicro: 3 },
      despues: { costoUnitarioMicro: 4 },
    });
    const { obtenerCapacidad } = await import("../src/registry");
    expect(obtenerCapacidad("platform.precios.set")?.efecto).toBe("irreversible");
  });

  it("toda lectura platform.* también queda, sin su salida (CAR-40)", async () => {
    const { ctx, tabla } = contextoDePrueba({ usuario: owner, semilla: semilla() });
    await executeCapability(ctx, "platform.trabajos.list", { tenantId: t });
    expect(tabla("auditoriaGlobal")).toMatchObject([
      {
        capability: "platform.trabajos.list",
        tenantObjetivoId: t,
        payload: { lectura: true, input: { tenantId: t } },
      },
    ]);
    expect(tabla("user").find((u) => u["id"] === U2)).toBeDefined();
  });

  it("la empresa objetivo sigue viendo en su actividad lo que plataforma le cambió", async () => {
    const { ctx } = contextoDePrueba({ usuario: owner, semilla: semilla() });
    await executeCapability(ctx, "platform.tenants.update", CASOS["platform.tenants.update"]);
    const r = await executeCapability(ctx, "core.audit.list", {});
    // `entity_type` nulo: el filtro de lo ajeno no debe esconderla (lógica de tres valores).
    expect(r).toMatchObject({
      ok: true,
      data: { eventos: [{ capability: "platform.tenants.update", entityType: null }] },
    });
  });
});
