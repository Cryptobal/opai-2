// `ctx.identidad` en memoria: mismas reglas que las operaciones reales sobre las tablas de prueba
// (`user`, `session`, `twoFactor`, `membership`, `apiKey`).
import type { Identidad } from "../types";
import type { Fila } from "./db-memoria-util";
import { metodosEnMemoria } from "./identidad-metodos-memoria";

export function identidadEnMemoria(tabla: (n: string) => Fila[]): Identidad {
  const quitar = (n: string, userId: string) => {
    const filas = tabla(n);
    const antes = filas.length;
    filas.splice(0, filas.length, ...filas.filter((f) => f["userId"] !== userId));
    return antes - filas.length;
  };
  return {
    async ultimosAccesos(userIds) {
      const ultimo = new Map<string, Date>();
      for (const s of tabla("session")) {
        const id = String(s["userId"]);
        const fecha = s["updatedAt"];
        if (!userIds.includes(id) || !(fecha instanceof Date)) continue;
        const prev = ultimo.get(id);
        if (!prev || fecha > prev) ultimo.set(id, fecha);
      }
      return ultimo;
    },
    async enOtrasEmpresas(userId, tenantId) {
      return tabla("membership").some((m) => m["userId"] === userId && m["tenantId"] !== tenantId);
    },
    async restablecerSegundoFactor(_tx, userId) {
      const enrolamientos = quitar("twoFactor", userId);
      const passkeys = quitar("passkey", userId);
      for (const u of tabla("user"))
        if (u["id"] === userId)
          Object.assign(u, { twoFactorEnabled: false, passkeyEnabled: false });
      return { enrolamientos, passkeys, sesiones: quitar("session", userId) };
    },
    ...metodosEnMemoria(tabla),
    async borrarUsuario(_tx, userId) {
      const usuarios = tabla("user");
      const u = usuarios.find((f) => f["id"] === userId);
      if (!u) return "inexistente";
      if (u["platformRole"] != null) return "plataforma";
      const ref = (n: string) => tabla(n).some((f) => f["userId"] === userId);
      if (ref("membership") || ref("apiKey")) return "con_referencias";
      usuarios.splice(usuarios.indexOf(u), 1);
      quitar("session", userId);
      quitar("twoFactor", userId);
      return "borrado";
    },
  };
}
