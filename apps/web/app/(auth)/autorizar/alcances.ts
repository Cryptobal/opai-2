/** Qué podrá hacer la app, en palabras de la persona (CAR-247). Un alcance desconocido no se muestra. */
export const TEXTO_ALCANCE: Record<string, { titulo: string; detalle: string }> = {
  "mcp:leer": {
    titulo: "Ver lo que tú ves",
    detalle: "Consultar la información de la empresa a la que ya tienes acceso.",
  },
  "mcp:escribir": {
    titulo: "Preparar y hacer cambios por ti",
    detalle: "Con tus mismos permisos. Lo que no se puede deshacer te pedirá aprobación.",
  },
  offline_access: {
    titulo: "Seguir conectada",
    detalle:
      "Sin volver a pedirte la contraseña durante 30 días. Puedes desconectarla cuando quieras.",
  },
};

export const alcancesVisibles = (alcances: readonly string[]) =>
  alcances.filter((a) => a in TEXTO_ALCANCE);
