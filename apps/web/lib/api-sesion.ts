import type { Contexto } from "@opai/capabilities";

const prohibido = (message: string) =>
  Response.json({ ok: false, error: { code: "FORBIDDEN", message } }, { status: 403 });

/**
 * `/api/v1` con sesión (CAR-38). El portal no sale nunca del cliente (encargo portal-sesión): si la
 * membresía actual tiene el ERP, el servidor fija `erp`, igual que las pantallas del ERP; si no, el
 * contexto queda con `portal: null` y `restriccion` lo rechaza como antes. Como la cookie viaja
 * sola, cualquier POST con sesión (también de plataforma o sin tenant) exige venir del propio origen (`Origin`) y un GET no puede venir de un
 * sitio ajeno (`Sec-Fetch-Site`), para que otra página no escriba ni deje lecturas auditadas a
 * nombre del usuario. Las API keys (Bearer) no pasan por aquí.
 */
export function contextoSesionApi(req: Request, ctx: Contexto): Contexto | Response {
  if (ctx.actor.tipo !== "user") return ctx;
  // Toda sesión, con o sin tenant o ERP (también `platform.*` y las sin tenant), pasa por el origen.
  const origen = new URL(req.url).origin;
  if (req.method === "GET") {
    const sitio = req.headers.get("sec-fetch-site");
    if (sitio && sitio !== "same-origin" && sitio !== "none") {
      return prohibido("Origen no permitido.");
    }
  } else if (req.headers.get("origin") !== origen) {
    return prohibido("Origen no permitido.");
  }
  if (!ctx.conTenant || !ctx.portalesMembresia.includes("erp")) return ctx;
  return { ...ctx, portal: "erp" };
}
