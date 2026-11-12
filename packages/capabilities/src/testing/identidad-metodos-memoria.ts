// Métodos de autenticación propios en memoria (CAR-286), con las mismas reglas que
// `@opai/db/identidad-metodos`: solo del propio usuario y rastro de seguridad por cada cambio.
import type { Identidad } from "../types";
import type { Fila } from "./db-memoria-util";

type Metodos = Pick<
  Identidad,
  "metodosDe" | "renombrarPasskey" | "quitarPasskey" | "desactivarTotp" | "consumirReautenticacion"
>;

export function metodosEnMemoria(tabla: (n: string) => Fila[]): Metodos {
  const usuario = (id: string) => tabla("user").find((u) => u["id"] === id);
  const propia = (userId: string, id: string) =>
    tabla("passkey").find((p) => p["id"] === id && p["userId"] === userId);
  const rastro = (tipo: string, userId: string, via: string) =>
    tabla("eventoSeguridad").push({ tipo, userId, via });
  const sincronizar = (userId: string) => {
    const u = usuario(userId);
    if (u) u["passkeyEnabled"] = tabla("passkey").some((p) => p["userId"] === userId);
  };
  return {
    async metodosDe(userId) {
      const passkeys = tabla("passkey")
        .filter((p) => p["userId"] === userId)
        .map((p) => ({
          id: String(p["id"]),
          nombre: (p["name"] as string | null | undefined) ?? null,
          creadaEn: p["createdAt"] instanceof Date ? p["createdAt"] : null,
          sincronizada: p["backedUp"] === true,
        }));
      const tienePassword = tabla("account").some(
        (a) => a["userId"] === userId && a["providerId"] === "credential",
      );
      return { totp: usuario(userId)?.["twoFactorEnabled"] === true, passkeys, tienePassword };
    },
    async renombrarPasskey(_tx, userId, id, nombre, o) {
      const p = propia(userId, id);
      if (!p) return false;
      p["name"] = nombre;
      rastro("seguridad.passkey.renombrada", userId, o.via);
      return true;
    },
    async quitarPasskey(_tx, userId, id, o) {
      const p = propia(userId, id);
      if (!p) return false;
      const filas = tabla("passkey");
      filas.splice(filas.indexOf(p), 1);
      sincronizar(userId);
      rastro("seguridad.passkey.baja", userId, o.via);
      return true;
    },
    async desactivarTotp(_tx, userId, o) {
      const u = usuario(userId);
      if (u?.["twoFactorEnabled"] !== true) return false;
      u["twoFactorEnabled"] = false;
      const filas = tabla("twoFactor");
      filas.splice(0, filas.length, ...filas.filter((f) => f["userId"] !== userId));
      rastro("seguridad.mfa.desactivacion", userId, o.via);
      return true;
    },
    async consumirReautenticacion(_tx, userId) {
      const filas = tabla("reautenticacion");
      const i = filas.findIndex((f) => f["userId"] === userId);
      if (i < 0) return false;
      filas.splice(i, 1);
      return true;
    },
  };
}
