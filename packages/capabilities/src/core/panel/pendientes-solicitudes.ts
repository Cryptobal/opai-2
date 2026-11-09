import type { Contexto } from "../../types";

const LEER = "comercial:solicitudes.read";
const GESTIONAR = "comercial:solicitudes.manage";

type Item = {
  tipo: "solicitudes";
  titulo: string;
  detalle: string;
  tono: "warning" | "danger" | "neutro";
  href: string;
  accion: string;
};

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/**
 * «Requiere tu decisión hoy» para el Inicio de quien revisa solicitudes (CAR-211): las nuevas que
 * esperan que alguien las procese y las que se derivaron a revisión. Una derivada con responsable le
 * aparece a él; sin responsable, a quien puede gestionarlas (si no, nadie la vería). Solo cuenta
 * estados: sin texto ni datos de las personas que escribieron.
 */
export async function pendientesSolicitudes(ctx: Contexto): Promise<Item[]> {
  if (!ctx.modulosActivos.includes("comercial")) return [];
  if (!ctx.autorizar(LEER) || !ctx.autorizar(GESTIONAR)) return [];
  const yo = ctx.actor.tipo === "user" ? ctx.actor.id : null;
  const [nuevas, enRevision] = await Promise.all([
    ctx.db.solicitud.count({ where: { estado: "nueva" } }),
    ctx.db.solicitud.count({
      where: {
        estado: "en_revision",
        OR: [{ responsableId: null }, ...(yo ? [{ responsableId: yo }] : [])],
      },
    }),
  ]);
  const items: Item[] = [];
  if (nuevas)
    items.push({
      tipo: "solicitudes",
      titulo: `${plural(nuevas, "solicitud nueva", "solicitudes nuevas")}`,
      detalle: "Procésalas, derívalas a revisión o descártalas",
      tono: "warning",
      href: "/solicitudes?estado=nueva",
      accion: "Revisar",
    });
  if (enRevision)
    items.push({
      tipo: "solicitudes",
      titulo: `${plural(enRevision, "solicitud en revisión", "solicitudes en revisión")} a tu cargo`,
      detalle: "Conviértelas en negocio o descártalas con motivo",
      tono: "neutro",
      href: "/solicitudes?estado=en_revision",
      accion: "Revisar",
    });
  return items;
}
