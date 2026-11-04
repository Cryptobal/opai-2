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

const CUENTA = "0192b3a4-0000-7000-8000-000000000001";
const AJENA = "0192b3a4-0000-7000-8000-000000000002";
const PERSONA = "0192b3a4-0000-7000-8000-000000000003";
const USUARIO = USUARIO_DE_PRUEBA.id;
const agente = `agente-interno:${USUARIO}`;
const evento = (capability: string, entityType: string, entityId: string, dia: number) => ({
  id: `${capability}-${entityId}`,
  tenantId: TENANT_DE_PRUEBA,
  actorType: "agent",
  actorId: agente,
  viaUserId: USUARIO,
  capability,
  entityType,
  entityId,
  createdAt: new Date(Date.UTC(2026, 10, dia)),
});

function escenario(permisos: string[]) {
  return contextoDePrueba({
    modulosActivos: ["agente"],
    permisos: ["agente:usar", ...permisos],
    semilla: {
      cuenta: [{ id: CUENTA, tenantId: TENANT_DE_PRUEBA, nombre: "Banco Andino" }],
      persona: [{ id: PERSONA, tenantId: TENANT_DE_PRUEBA }],
      auditEvent: [
        evento("core.cuentas.update", "cuenta", CUENTA, 3),
        evento("core.cuentas.update", "cuenta", AJENA, 2),
        evento("core.personas.update", "persona", PERSONA, 1),
      ],
      aprobacion: [
        {
          id: "ap1",
          tenantId: TENANT_DE_PRUEBA,
          agenteInternoId: agente,
          viaUserId: USUARIO,
          capability: "core.cuentas.delete",
          input: { id: CUENTA },
          estado: "pendiente",
          resultado: null,
          createdAt: new Date(Date.UTC(2026, 10, 4)),
        },
      ],
    },
  }).ctx;
}

it("devuelve entidad y resultado, sin etiqueta de personas ni de fichas ajenas al permiso", async () => {
  const r = await executeCapability(
    escenario(["core:cuentas.read", "core:personas.read"]),
    "agente.historial.list",
    {},
  );
  expect(r).toMatchObject({ ok: true });
  const filas = (r as { data: { capacidad: string; resultado: string; entidad: unknown }[] }).data;
  expect(filas.map((f) => f.resultado)).toEqual(["pendiente", "ok", "ok", "ok"]);
  expect(filas[0]).toMatchObject({
    capacidad: "core.cuentas.delete",
    entidad: { tipo: "cuenta", id: CUENTA, etiqueta: "Banco Andino" },
  });
  // La cuenta que no existe en la empresa y la persona no filtran nombre.
  expect(filas[2]?.entidad).toBeNull();
  expect(filas[3]?.entidad).toEqual({ tipo: "persona", id: PERSONA, etiqueta: null });
});

it("sin permiso de lectura de la ficha no se revela la entidad", async () => {
  const r = await executeCapability(escenario([]), "agente.historial.list", {});
  const filas = (r as { data: { entidad: unknown }[] }).data;
  expect(filas.every((f) => f.entidad === null)).toBe(true);
});
