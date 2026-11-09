// Ayudantes de los casos sintéticos de la prueba gratis (CAR-222): empresas ficticias en memoria.
import { beforeEach } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

export const OTRA = "0192f3a0-0000-7000-8000-00000000000b";
export const owner = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
export const support = { ...USUARIO_DE_PRUEBA, platformRole: "support" as const };
export const dia = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
export const fecha = (n: number) => new Date(`${dia(n)}T00:00:00Z`);
const modulo = (id: string) =>
  defineModule({
    id,
    nombre: id,
    version: "0.1.0",
    dependencias: [],
    permisos: [],
    navegacion: [],
    configuracion: z.object({}),
    eventos: [],
    capacidades: [],
  });

/** Registra el núcleo y los módulos de prueba antes de cada caso. */
export function registrarEntorno() {
  beforeEach(() => {
    limpiarRegistro();
    limpiarModulos();
    registrarCapacidades(capacidadesDelNucleo);
    registrarModulos([modulo("cpq"), modulo("finanzas"), modulo("tickets")]);
  });
}

export const prueba = (tenantId: string, hasta: Date, extensiones = 0) => ({
  id: `p-${tenantId.slice(-4)}`,
  tenantId,
  moduloId: "cpq",
  inicio: fecha(-9),
  hasta,
  extensiones,
  cerradaEn: null,
});
export const modCpq = (tenantId: string, estado: string) => ({
  id: `m-${tenantId.slice(-4)}`,
  tenantId,
  moduloId: "cpq",
  estado,
});
export const rut = [{ tenantId: TENANT_DE_PRUEBA, rut: "76123456-0", razonSocial: "Gard SpA" }];

/** Contexto de Plataforma con dos empresas ficticias; `extra` pisa o agrega tablas. */
export function plataforma(
  extra: Record<string, unknown[]> = {},
  usuario: typeof owner | typeof support | typeof USUARIO_DE_PRUEBA = owner,
) {
  const s = semillaTenant();
  return contextoDePrueba({
    usuario,
    conTenant: false,
    rol: null,
    semilla: {
      ...s,
      tenant: [...s.tenant, { ...s.tenant[0], id: OTRA, slug: "otra", nombre: "Otra" }],
      user: s.user.map((u) => (u.id === owner.id ? { ...u, platformRole: "owner" } : u)),
      perfilEmpresa: rut,
      ...extra,
    },
  });
}
export const extender = (dias?: number) => ({
  tenantId: TENANT_DE_PRUEBA,
  moduloId: "cpq",
  ...(dias === undefined ? {} : { dias }),
});
