// Mundo de prueba de las reglas de aprobación (CAR-252): Ana (dueña), Beto (gerente, aprobador de
// la regla) y Ceci (viewer), con una capacidad de prueba marcada como aprobable.
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { defineCapability } from "../src/define";
import { limpiarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant, U2 } from "./semilla";

export const U3 = "0192f3a0-0000-7000-8000-0000000000a3";
export const REGLA = "0192f3a0-0000-7000-8000-0000000000d1";

export const emitir = defineCapability({
  id: "core.prueba_dte.emitir",
  descripcion: "Emite un documento de prueba al SII (capacidad de prueba de reglas de aprobación).",
  permiso: null,
  input: z.object({ monto: z.number().int() }),
  output: z.object({ ok: z.boolean() }),
  efecto: "irreversible",
  dryRun: true,
  aprobable: { accion: "emitir_dte", monto: async (_ctx, i) => i.monto },
  async handler() {
    return { ok: true };
  },
});

export function registrar() {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades([...capacidadesDelNucleo, emitir]);
}

export function mundo() {
  const s = semillaTenant("gerente");
  const semilla = {
    ...s,
    user: [...s.user, { id: U3, name: "Ceci", email: "ceci@prueba.cl" }],
    membership: [
      ...s.membership,
      { id: "m3", tenantId: TENANT_DE_PRUEBA, userId: U3, rol: "viewer", portales: ["erp"], estado: "activa", createdAt: new Date(3) },
    ],
    reglaAprobacion: [
      { id: REGLA, tenantId: TENANT_DE_PRUEBA, accion: "emitir_dte", montoMinimo: 1_000_000n, aprobadorRol: "gerente", aprobadorGrupoId: null, activa: true },
    ],
  };
  const base = contextoDePrueba({ semilla });
  const como = (id: string, nombre: string, rol: "owner" | "gerente" | "viewer") => ({
    ...base.ctx,
    actor: { tipo: "user" as const, id },
    usuario: { ...USUARIO_DE_PRUEBA, id, nombre },
    rol,
    autorizar: contextoDePrueba({ rol }).ctx.autorizar,
  });
  return {
    tabla: base.tabla,
    ana: como(USUARIO_DE_PRUEBA.id, "Ana", "owner"),
    beto: como(U2, "Beto", "gerente"),
    ceci: como(U3, "Ceci", "viewer"),
  };
}
