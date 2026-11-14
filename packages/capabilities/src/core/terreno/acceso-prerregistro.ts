import { verificarInvitacion } from "../../acceso/huella";
import { fechaDia } from "../../acceso/prerregistro-comun";
import type { Contexto } from "../../types";
import type { Rechazos } from "./acceso-tipos";

/** Visitante prerregistrado que entra un día (R14): de él salen el documento y los datos si no vienen en la entrada. */
export type VisitanteDia = {
  visitanteId: string;
  dia: string;
  docTipo: string;
  huella: string;
  huellaKid: string;
  mascara: string;
  nombre: string;
  empresa: string | null;
  patente: string | null;
};
type Pedido = { clave: string; dia: string; invitacion?: string | undefined; huellas: string[] };

const texto = (d: Date) => d.toISOString().slice(0, 10);

/** Visitantes no cancelados de la instalación cuyos prerregistros cubren alguno de los días del lote. */
async function visitantes(
  ctx: Contexto,
  instalacionId: string,
  ids: string[],
  huellas: string[],
  dias: string[],
) {
  if (ids.length + huellas.length === 0) return [];
  const orden = [...dias].sort();
  return ctx.db.prerregistroVisitante.findMany({
    where: {
      OR: [{ id: { in: ids } }, { huella: { in: huellas } }],
      prerregistro: {
        instalacionId,
        canceladoEn: null,
        desde: { lte: fechaDia(orden.at(-1) ?? "") },
        hasta: { gte: fechaDia(orden[0] ?? "") },
      },
    },
    include: {
      prerregistro: { select: { desde: true, hasta: true } },
      usos: { where: { dia: { in: dias.map(fechaDia) } }, select: { dia: true } },
    },
  });
}

/**
 * Cruza las entradas del lote con los prerregistros de la instalación (R2, R14). Con invitación, el QR debe ser de
 * esta empresa y de ese día, del prerregistro vigente de esta instalación y sin usar; si no, la entrada se rechaza.
 * Sin invitación, un documento con prerregistro vigente y sin usar ese día también cuenta. Cada día sirve una vez.
 */
export async function cruzarPrerregistros(
  ctx: Contexto,
  instalacionId: string,
  pedidos: readonly Pedido[],
  rechazos: Rechazos,
): Promise<Map<string, VisitanteDia>> {
  const qr = new Map(
    pedidos.flatMap((p) =>
      p.invitacion ? [[p.clave, verificarInvitacion(ctx.tenantId, p.invitacion)]] : [],
    ),
  );
  const ids = [...qr.values()].flatMap((v) => (v ? [v.visitanteId] : []));
  const vs = await visitantes(
    ctx,
    instalacionId,
    ids,
    pedidos.flatMap((p) => p.huellas),
    pedidos.map((p) => p.dia),
  );
  const usados = new Set(vs.flatMap((v) => v.usos.map((u) => `${v.id}:${texto(u.dia)}`)));
  const libre = (v: (typeof vs)[number], dia: string) =>
    texto(v.prerregistro.desde) <= dia &&
    dia <= texto(v.prerregistro.hasta) &&
    !usados.has(`${v.id}:${dia}`);
  const salida = new Map<string, VisitanteDia>();
  for (const p of pedidos) {
    const leido = qr.get(p.clave);
    const v = p.invitacion
      ? vs.find((x) => leido && x.id === leido.visitanteId && leido.dia === p.dia)
      : vs.find((x) => p.huellas.includes(x.huella) && libre(x, p.dia));
    const valido = v && libre(v, p.dia) && (p.huellas.length === 0 || p.huellas.includes(v.huella));
    if (!valido) {
      if (p.invitacion) rechazos.set(p.clave, "invitacion_invalida");
      continue;
    }
    usados.add(`${v.id}:${p.dia}`);
    salida.set(p.clave, {
      visitanteId: v.id,
      dia: p.dia,
      docTipo: v.docTipo,
      huella: v.huella,
      huellaKid: v.huellaKid,
      mascara: v.mascara,
      nombre: v.nombre,
      empresa: v.empresa,
      patente: v.patente,
    });
  }
  return salida;
}
