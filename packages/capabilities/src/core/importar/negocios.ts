// Negocios (módulo Comercial). Se crean directo en la etapa que dice la planilla, sin disparar los
// efectos de «ganar» (puestos ofrecidos, avisos): es carga histórica, no un cierre hecho hoy.
import type { DefinicionImportador } from "@opai/domain/importacion";

import { estadoDeTipo } from "../../comercial/dominio";
import { CAMPOS_CUENTA, CAMPO_ID_EXTERNO, entero, fecha, idsExternos, norm, resolverCuentas, texto } from "./comun";
import type { FilaPlan, Importador } from "./tipos";
import { idAutor } from "../../autor";

export type DatosNegocio = {
  cuentaId: string; titulo: string; embudoId: string; etapaId: string; estado: string; probabilidad: number;
  responsableId: string | null; montoEstimadoMensual: number | null; cierreEstimado: Date | null;
  ganadoEn: Date | null; perdidoEn: Date | null;
};

const def: DefinicionImportador = {
  id: "negocios",
  etiqueta: "Negocios",
  descripcion: "Oportunidades comerciales de cada cuenta, en la etapa del embudo que indique la planilla. Se reconocen por su título dentro de la cuenta.",
  campos: [
    CAMPO_ID_EXTERNO,
    ...CAMPOS_CUENTA,
    { clave: "titulo", etiqueta: "Título", tipo: "texto", requerido: true, sinonimos: ["title", "nombre", "negocio", "oportunidad", "deal"], ejemplo: "Guardias bodega Quilicura", largoMaximo: 200 },
    { clave: "etapa", etiqueta: "Etapa", tipo: "texto", sinonimos: ["stage", "estado", "status", "stageName"], ejemplo: "Cotización enviada", ayuda: "Nombre de una etapa del embudo. Si falta o no existe, queda en la primera etapa.", largoMaximo: 80 },
    { clave: "monto_estimado_mensual", etiqueta: "Monto mensual estimado (CLP)", tipo: "entero", sinonimos: ["amount", "monto", "valor", "monto mensual"], ejemplo: "2.500.000" },
    { clave: "probabilidad", etiqueta: "Probabilidad (%)", tipo: "entero", sinonimos: ["probability"], ejemplo: "60" },
    { clave: "cierre_estimado", etiqueta: "Cierre estimado", tipo: "fecha", sinonimos: ["expectedCloseDate", "fecha cierre estimada"], ejemplo: "15-12-2026" },
    { clave: "cerrado_en", etiqueta: "Fecha de cierre real", tipo: "fecha", sinonimos: ["closedAt", "fecha cierre", "ganado en", "perdido en"], ejemplo: "", ayuda: "Solo para negocios ganados o perdidos." },
    { clave: "responsable_email", etiqueta: "Correo del responsable", tipo: "email", sinonimos: ["owner", "ownerEmail", "responsable", "vendedor", "ejecutivo"], ejemplo: "vendedor@miempresa.cl" },
  ],
};

export const importadorNegocios: Importador<DatosNegocio> = {
  def,
  entidad: "negocio",
  permiso: "comercial:negocios.manage",
  modulo: "comercial",
  actualizables: ["montoEstimadoMensual", "cierreEstimado", "responsableId"],
  async planificar(ctx, filas, o) {
    const cuentaDe = await resolverCuentas(ctx, filas, o.sistema);
    const externos = await idsExternos(ctx, "negocio", o.sistema, filas.map((f) => texto(f.datos["id_externo"]) ?? ""));
    const embudo = await ctx.db.embudo.findFirst({ where: { porDefecto: true }, select: { id: true } });
    const etapas = embudo ? await ctx.db.etapa.findMany({ where: { embudoId: embudo.id, activa: true }, orderBy: { orden: "asc" } }) : [];
    const primera = etapas[0];
    const correos = [...new Set(filas.map((f) => texto(f.datos["responsable_email"])).filter((c): c is string => !!c))];
    const usuarios = correos.length ? await ctx.db.user.findMany({ where: { email: { in: correos } }, select: { id: true, email: true } }) : [];
    const miembros = usuarios.length
      ? await ctx.db.membership.findMany({ where: { userId: { in: usuarios.map((u) => u.id) }, estado: "activa" }, select: { userId: true } })
      : [];
    const activos = new Set(miembros.map((m) => m.userId));
    const porCorreo = new Map(usuarios.filter((u) => activos.has(u.id)).map((u) => [u.email.toLowerCase(), u.id]));
    const resueltas = filas.map((f) => ({ f, r: cuentaDe(f) }));
    const cuentaIds = [...new Set(resueltas.flatMap((x) => ("cuenta" in x.r ? [x.r.cuenta.id] : [])))];
    const existentes = await ctx.db.negocio.findMany({
      where: { OR: [{ cuentaId: { in: cuentaIds }, archivadoEn: null }, { id: { in: [...externos.values()] } }] },
    });
    const porId = new Map(existentes.map((n) => [n.id, n]));
    return resueltas.map(({ f, r }): FilaPlan<DatosNegocio> => {
      const titulo = texto(f.datos["titulo"]) ?? "";
      const idExterno = texto(f.datos["id_externo"]);
      const falla = (m: string): FilaPlan<DatosNegocio> => ({ fila: f.fila, clave: `fila:${f.fila}`, etiqueta: titulo, accion: "error", mensajes: [m] });
      if ("error" in r) return falla(r.error);
      if (!embudo || !primera) return falla("El embudo de la empresa no tiene etapas activas.");
      const pedida = texto(f.datos["etapa"]);
      const etapa = (pedida ? etapas.find((e) => norm(e.nombre) === norm(pedida)) : undefined) ?? primera;
      const correo = texto(f.datos["responsable_email"]);
      const responsableId = correo ? (porCorreo.get(correo) ?? null) : null;
      const mensajes = [
        ...(pedida && norm(etapa.nombre) !== norm(pedida) ? [`La etapa «${pedida}» no existe en el embudo: queda en «${etapa.nombre}».`] : []),
        ...(correo && !responsableId ? ["El responsable no es un usuario activo de la empresa: queda sin responsable."] : []),
      ];
      const estado = estadoDeTipo(etapa.tipo);
      const cierre = fecha(f.datos["cerrado_en"]) ?? new Date();
      const prob = entero(f.datos["probabilidad"]);
      const datos: DatosNegocio = {
        cuentaId: r.cuenta.id, titulo, embudoId: embudo.id, etapaId: etapa.id, estado,
        probabilidad: prob !== null && prob >= 0 && prob <= 100 ? prob : etapa.probabilidad, responsableId,
        montoEstimadoMensual: entero(f.datos["monto_estimado_mensual"]), cierreEstimado: fecha(f.datos["cierre_estimado"]),
        ganadoEn: estado === "ganado" ? cierre : null, perdidoEn: estado === "perdido" ? cierre : null,
      };
      const existente =
        (idExterno ? porId.get(externos.get(idExterno) ?? "") : undefined) ??
        existentes.find((n) => n.cuentaId === r.cuenta.id && norm(n.titulo) === norm(titulo));
      return {
        fila: f.fila, clave: idExterno ? `ext:${idExterno}` : `${r.cuenta.id}|${norm(titulo)}`, etiqueta: `${titulo} · ${r.cuenta.nombre}`,
        accion: existente ? "actualizar" : "crear", mensajes, datos, idExterno, ...(existente ? { existente } : {}),
      };
    });
  },
  async crear(tx, ctx, datos) {
    const n = await tx.negocio.create({ data: { ...datos, tenantId: ctx.tenantId }, select: { id: true } });
    await tx.historialEtapa.create({
      data: { tenantId: ctx.tenantId, negocioId: n.id, aEtapaId: datos.etapaId, actorTipo: ctx.actor.tipo, actorId: idAutor(ctx.actor), motivo: "Importación" },
    });
    return n.id;
  },
  async actualizar(tx, id, { montoEstimadoMensual, cierreEstimado, responsableId }) {
    const cambios = { montoEstimadoMensual, cierreEstimado, responsableId };
    await tx.negocio.update({ where: { id }, data: Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined)) });
  },
  actuales: (tx, ids) => tx.negocio.findMany({ where: { id: { in: [...ids] } } }),
  async bloqueos(tx, ids) {
    const filas = await tx.negocio.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, _count: { select: { instalaciones: true, contactos: true, solicitudes: true, actividadVinculos: true, historial: true, contexto: true } } },
    });
    const cotizados = await tx.cpqCotizacion.findMany({ where: { negocioId: { in: [...ids] } }, select: { negocioId: true } });
    const conCotizacion = new Set(cotizados.map((c) => c.negocioId));
    const con = filas.filter(({ id, _count: c }) => conCotizacion.has(id) || c.historial > 1 || c.instalaciones + c.contactos + c.solicitudes + c.actividadVinculos + c.contexto > 0);
    return new Map(con.map((n) => [n.id, "tiene cotizaciones, actividad o cambios de etapa posteriores"]));
  },
  async borrar(tx, ids) {
    await tx.negocio.deleteMany({ where: { id: { in: [...ids] } } });
  },
};
