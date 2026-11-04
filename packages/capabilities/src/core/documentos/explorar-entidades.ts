import { PERMISOS_CORE } from "@opai/domain";

import type { Contexto } from "../../types";

export type EntidadVista = { tipo: string; id: string; nombre: string | null };

type Nombrada = { id: string; nombre: string };

/**
 * Propietario de cada documento de la página, con su nombre cuando el actor puede leer ese tipo de
 * entidad (cuentas, instalaciones/puestos, personas). Sin ese permiso el nombre queda en `null`: el
 * explorador no revela por la puerta de los documentos lo que otra pantalla le oculta. El alcance del
 * supervisor ya lo aplicó la consulta de documentos (el dueño está a cargo).
 */
export async function propietariosDe(
  ctx: Contexto,
  documentoIds: readonly string[],
): Promise<{ porDocumento: Map<string, EntidadVista>; personasReveladas: string[] }> {
  const porDocumento = new Map<string, EntidadVista>();
  if (!documentoIds.length) return { porDocumento, personasReveladas: [] };
  const vinculos = await ctx.db.documentoVinculo.findMany({
    where: { documentoId: { in: [...documentoIds] }, rol: "propietario" },
    select: { documentoId: true, entidadTipo: true, entidadId: true },
  });
  const ids = (tipo: string) => [
    ...new Set(vinculos.filter((v) => v.entidadTipo === tipo).map((v) => v.entidadId)),
  ];
  const leer = async (
    permiso: string,
    tipo: string,
    buscar: (ids: string[]) => Promise<Nombrada[]>,
  ) => (ctx.autorizar(permiso) && ids(tipo).length ? buscar(ids(tipo)) : []);
  const select = { id: true, nombre: true } as const;
  const [cuentas, instalaciones, puestos, personas] = await Promise.all([
    leer(PERMISOS_CORE.cuentasRead, "cuenta", (id) =>
      ctx.db.cuenta.findMany({ where: { id: { in: id } }, select }),
    ),
    leer(PERMISOS_CORE.instalacionesRead, "instalacion", (id) =>
      ctx.db.instalacion.findMany({ where: { id: { in: id } }, select }),
    ),
    leer(PERMISOS_CORE.instalacionesRead, "puesto", (id) =>
      ctx.db.puesto.findMany({ where: { id: { in: id } }, select }),
    ),
    leer(PERMISOS_CORE.personasRead, "persona", async (id) =>
      (
        await ctx.db.persona.findMany({
          where: { id: { in: id } },
          select: { id: true, nombres: true, apellidos: true },
        })
      ).map((p) => ({ id: p.id, nombre: `${p.nombres} ${p.apellidos}` })),
    ),
  ]);
  const nombres = new Map(
    [...cuentas, ...instalaciones, ...puestos, ...personas].map((e) => [e.id, e.nombre]),
  );
  for (const v of vinculos)
    porDocumento.set(v.documentoId, {
      tipo: v.entidadTipo,
      id: v.entidadId,
      nombre: nombres.get(v.entidadId) ?? null,
    });
  return { porDocumento, personasReveladas: personas.map((p) => p.id) };
}

/** Estado de firma por documento: pendiente si hay una solicitud viva; firmado si alguna se completó. */
export async function firmaDe(
  ctx: Contexto,
  documentoIds: readonly string[],
): Promise<Map<string, "pendiente" | "firmado">> {
  const mapa = new Map<string, "pendiente" | "firmado">();
  if (!documentoIds.length || !ctx.autorizar(PERMISOS_CORE.firmasRead)) return mapa;
  const solicitudes = await ctx.db.solicitudFirma.findMany({
    where: { documentoId: { in: [...documentoIds] } },
    select: { documentoId: true, estado: true },
  });
  for (const s of solicitudes) {
    if (["enviada", "en_curso", "espera_prestador"].includes(s.estado))
      mapa.set(s.documentoId, "pendiente");
    else if (s.estado === "completada" && !mapa.has(s.documentoId))
      mapa.set(s.documentoId, "firmado");
  }
  return mapa;
}
