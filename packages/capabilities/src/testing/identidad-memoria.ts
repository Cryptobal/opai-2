// Identidad en memoria para tests (CAR-43/CAR-54): lee y escribe las tablas falsas
// `session`/`twoFactor`/`user` y el ámbito `seguridad` de `auditoriaGlobal`.
import type { Identidad } from "../types";
import type { Fila } from "./db-memoria-util";

export function identidadEnMemoria(tabla: (n: string) => Fila[]): Identidad {
  return {
    async ultimoAcceso(userIds) {
      const ids = new Set(userIds);
      const ultimo = new Map<string, Date>();
      for (const f of tabla("session")) {
        const userId = f["userId"] as string;
        if (!ids.has(userId)) continue;
        const actualizado = f["updatedAt"] as Date;
        const previo = ultimo.get(userId);
        if (!previo || actualizado > previo) ultimo.set(userId, actualizado);
      }
      return ultimo;
    },
    async restablecerMfa(userId, _tx) {
      const antes = tabla("twoFactor").length;
      const restantes = tabla("twoFactor").filter((f) => f["userId"] !== userId);
      if (restantes.length === antes) return false;
      tabla("twoFactor").splice(0, tabla("twoFactor").length, ...restantes);
      const usuario = tabla("user").find((f) => f["id"] === userId);
      if (usuario) usuario["twoFactorEnabled"] = false;
      for (const s of tabla("session")) if (s["userId"] === userId) s["mfaVerified"] = false;
      return true;
    },
    async auditarSeguridad(hecho) {
      const previas = tabla("auditoriaGlobal").filter((f) => f["ambito"] === "seguridad");
      const seq = previas.length + 1;
      tabla("auditoriaGlobal").push({
        id: `mem-seg-${seq}`,
        ambito: "seguridad",
        seq,
        actorType: "user",
        actorId: hecho.actorId,
        viaUserId: null,
        capability: hecho.capability,
        tenantObjetivoId: null,
        origenTenantId: null,
        entityType: "user",
        entityId: hecho.entityId ?? hecho.actorId,
        payload: JSON.parse(JSON.stringify(hecho.payload ?? null)),
        antes: null,
        despues: null,
        ipCifrada: hecho.ipCifrada ?? null,
        userAgent: hecho.userAgent ?? null,
        createdAt: new Date(),
        hash: `memoria-seg-${seq}`,
      });
    },
  };
}
