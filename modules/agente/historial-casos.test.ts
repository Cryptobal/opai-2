import { beforeEach, expect, it } from "vitest";
import {
  capacidadesDelNucleo,
  executeCapability,
  limpiarModulos,
  limpiarRegistro,
  registrarCapacidades,
  registrarModulos,
} from "@opai/capabilities";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "@opai/capabilities/testing";

import { manifest } from "./manifest";

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos([manifest]);
});

const id = (n: number) => `0192b3a4-0000-7000-8000-00000000010${n}`;
const [C_VISTA, C_FUERA, I_VISTA, I_FUERA, PERSONA] = [id(1), id(2), id(3), id(4), id(5)];
const USUARIO = USUARIO_DE_PRUEBA.id;
const agente = `agente-interno:${USUARIO}`;
const evento = (entityType: string, entityId: string, dia: number, viaUserId = USUARIO) => ({
  id: `e-${entityId}-${viaUserId}`,
  tenantId: TENANT_DE_PRUEBA,
  actorType: "agent",
  actorId: agente,
  viaUserId,
  capability: "core.x.update",
  entityType,
  entityId,
  createdAt: new Date(Date.UTC(2026, 10, dia)),
});
const aprobacion = (estado: string, resultado: unknown, dia: number, viaUserId = USUARIO) => ({
  id: `a-${estado}-${dia}`,
  tenantId: TENANT_DE_PRUEBA,
  agenteInternoId: agente,
  viaUserId,
  capability: "core.cuentas.delete",
  input: {},
  estado,
  resultado,
  createdAt: new Date(Date.UTC(2026, 10, dia)),
});
const PERMISOS = [
  "agente:usar",
  "core:cuentas.read",
  "core:instalaciones.read",
  "core:personas.read",
];
type Fila = { resultado: string; entidad: { tipo: string; id: string } | null };
const listar = async (o: Parameters<typeof contextoDePrueba>[0]) => {
  const r = await executeCapability(
    contextoDePrueba({ modulosActivos: ["agente"], ...o }).ctx,
    "agente.historial.list",
    {},
  );
  if (!r.ok) throw new Error("La lectura falló");
  return r.data as Fila[];
};

it("un actor acotado solo ve entidades a su cargo y no ve personas", async () => {
  const filas = await listar({
    permisos: PERMISOS,
    alcance: { instalaciones: [I_VISTA] },
    semilla: {
      cuenta: [
        { id: C_VISTA, tenantId: TENANT_DE_PRUEBA, nombre: "A" },
        { id: C_FUERA, tenantId: TENANT_DE_PRUEBA, nombre: "B" },
      ],
      instalacion: [
        { id: I_VISTA, tenantId: TENANT_DE_PRUEBA, nombre: "Torre", cuentaId: C_VISTA },
        { id: I_FUERA, tenantId: TENANT_DE_PRUEBA, nombre: "Otra", cuentaId: C_FUERA },
      ],
      persona: [{ id: PERSONA, tenantId: TENANT_DE_PRUEBA }],
      auditEvent: [
        evento("cuenta", C_VISTA, 5),
        evento("cuenta", C_FUERA, 4),
        evento("instalacion", I_VISTA, 3),
        evento("instalacion", I_FUERA, 2),
        evento("persona", PERSONA, 1),
      ],
    },
  });
  expect(filas.map((f) => f.entidad?.id ?? null)).toEqual([C_VISTA, null, I_VISTA, null, null]);
});

it("muestra error, rechazado y vencido; un resultado sin ok cuenta como error", async () => {
  const filas = await listar({
    permisos: PERMISOS,
    semilla: {
      aprobacion: [
        aprobacion("aprobada", { ok: false, error: { code: "CONFLICT" } }, 5),
        aprobacion("rechazada", null, 4),
        aprobacion("vencida", null, 3),
        aprobacion("aprobada", null, 2),
        aprobacion("aprobada", { ok: true, data: {} }, 1),
      ],
    },
  });
  expect(filas.map((f) => f.resultado)).toEqual(["error", "rechazado", "vencido", "error", "ok"]);
});

it("lista vacía, servicio sin historial y filas de otro usuario ocultas", async () => {
  expect(await listar({ permisos: PERMISOS })).toEqual([]);
  const semilla = { auditEvent: [evento("cuenta", C_VISTA, 1)] };
  expect(
    await listar({ permisos: PERMISOS, principal: { tipo: "servicio", id: "s" }, semilla }),
  ).toEqual([]);
  const ajeno = id(9);
  expect(
    await listar({
      permisos: PERMISOS,
      semilla: {
        auditEvent: [evento("cuenta", C_VISTA, 1, ajeno)],
        aprobacion: [aprobacion("pendiente", null, 2, ajeno)],
      },
    }),
  ).toEqual([]);
});
