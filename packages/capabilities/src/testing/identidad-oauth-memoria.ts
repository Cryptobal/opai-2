// Apps conectadas por OAuth en memoria (CAR-247), con las mismas reglas que
// `@opai/db/identidad-oauth`: solo de la persona en esa empresa y rastro de seguridad al desconectar.
import type { Identidad } from "../types";
import type { Fila } from "./db-memoria-util";

type AppsOAuth = Pick<Identidad, "appsConectadas" | "desconectarApp">;

export function appsOAuthEnMemoria(tabla: (n: string) => Fila[]): AppsOAuth {
  const de = (n: string, userId: string, tenantId: string, clientId?: string) =>
    tabla(n).filter(
      (f) =>
        f["userId"] === userId &&
        f["referenceId"] === tenantId &&
        (clientId === undefined || f["clientId"] === clientId),
    );
  return {
    async appsConectadas(userId, tenantId) {
      return de("oauthConsent", userId, tenantId).flatMap((c) => {
        const app = tabla("oauthClient").find((a) => a["clientId"] === c["clientId"]);
        if (!app || app["disabled"] === true) return [];
        const usos = de("oauthAccessToken", userId, tenantId, String(c["clientId"]))
          .map((t) => t["createdAt"])
          .filter((d): d is Date => d instanceof Date)
          .sort((a, b) => b.getTime() - a.getTime());
        return [
          {
            clientId: String(c["clientId"]),
            nombre: (app["name"] as string | null) ?? null,
            sitio: (app["uri"] as string | null) ?? null,
            alcances: (c["scopes"] as string[]) ?? [],
            conectadaEn: c["createdAt"] as Date,
            ultimoUso: usos[0] ?? null,
          },
        ];
      });
    },
    async desconectarApp(_tx, userId, tenantId, clientId, o) {
      let n = 0;
      for (const t of de("oauthAccessToken", userId, tenantId, clientId))
        if (t["revoked"] == null) {
          t["revoked"] = new Date();
          n++;
        }
      const renovaciones = tabla("oauthRefreshToken");
      const siguen = renovaciones.filter(
        (r) => !de("oauthRefreshToken", userId, tenantId, clientId).includes(r),
      );
      n += renovaciones.length - siguen.length;
      renovaciones.splice(0, renovaciones.length, ...siguen);
      const consentimientos = tabla("oauthConsent");
      const quedan = consentimientos.filter(
        (c) => !de("oauthConsent", userId, tenantId, clientId).includes(c),
      );
      n += consentimientos.length - quedan.length;
      consentimientos.splice(0, consentimientos.length, ...quedan);
      if (n === 0) return false;
      tabla("eventoSeguridad").push({ tipo: "seguridad.oauth.desconexion", userId, via: o.via });
      return true;
    },
  };
}
