import { defineDatosPersonales } from "@opai/domain";

/** Accesos de apps conectadas por OAuth al MCP (CAR-247): solo hashes de tokens y la persona. */
export const INVENTARIO_OAUTH = defineDatosPersonales("core", [
  {
    tabla: "oauth_access_tokens",
    finalidad:
      "Accesos de apps conectadas por OAuth (CAR-247): hash del token, persona y empresa autorizadas.",
    categorias: ["credenciales"],
    campos: ["token", "user_id"],
    baseLicitud: "contrato",
  },
  {
    tabla: "oauth_refresh_tokens",
    finalidad:
      "Renovación de los accesos de apps conectadas por OAuth (CAR-247): hash del token y persona.",
    categorias: ["credenciales"],
    campos: ["token", "user_id"],
    baseLicitud: "contrato",
  },
]);
