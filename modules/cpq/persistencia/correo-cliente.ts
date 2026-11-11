import {
  asegurarAccesoContacto,
  enviarCorreo,
  previsualizarCorreo,
  type Contexto,
  type EstadoAccesoContacto,
} from "@opai/capabilities";

import {
  elegirAdjuntos,
  textoAcceso,
  textoAdjuntos,
  type EnlaceDocumento,
  type PdfEnvio,
} from "../domain/documento/correo-envio";

/** Evento comunicable del correo al cliente (el evento de dominio `cpq.cotizacion.enviada` no se renombra). */
export const EVENTO_CORREO_CLIENTE = "cpq.cotizacion.enviada_cliente";
const SIETE_DIAS = 7 * 24 * 60 * 60;

export type PdfParaCorreo = PdfEnvio & { contenido: Uint8Array | null; storageKey: string | null };

export type SolicitudCorreoCliente = {
  para: string;
  contactoId: string | null;
  cuentaId: string | null;
  /** Negocio de la cotización: el correo queda en su historial (CAR-233). */
  negocioId?: string | null;
  codigo: string;
  titulo: string;
  version: number | null;
  mensaje: string;
  pdfs: readonly PdfParaCorreo[];
};

const texto = (v: string | null | undefined) => v?.trim() ?? "";

/** Datos del correo: marca, contacto comercial y portal del tenant; nada de Gard en código (ADR-028). */
async function datosBase(ctx: Contexto, s: SolicitudCorreoCliente) {
  const [perfil, tenant, contacto] = await Promise.all([
    ctx.db.perfilEmpresa.findUnique({
      where: { tenantId: ctx.tenantId },
      select: { nombreComercial: true, correoComercial: true },
    }),
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
    s.contactoId
      ? ctx.db.contacto.findFirst({ where: { id: s.contactoId, tenantId: ctx.tenantId }, select: { nombres: true } })
      : null,
  ]);
  const nombre = texto(contacto?.nombres).split(/\s+/)[0] ?? "";
  return {
    saludo: nombre ? `Hola ${nombre},` : "Hola,",
    cotizacion: { codigo: s.codigo, titulo: s.titulo, version: s.version ?? "" },
    mensaje: s.mensaje,
    comercial: { correo: texto(perfil?.correoComercial) },
    empresa: { nombre: perfil?.nombreComercial ?? tenant?.nombre ?? "" },
    url: `${ctx.servicios.urlBase.replace(/\/$/, "")}/cliente`,
  };
}

async function accesoDelContacto(ctx: Contexto, s: SolicitudCorreoCliente, dryRun: boolean) {
  if (!s.contactoId || !s.cuentaId) return "no_aplica" as EstadoAccesoContacto;
  try {
    // El acceso se da al correo del contacto: si el destinatario es otro correo, no se le habla de un acceso ajeno.
    const c = await ctx.db.contacto.findFirst({
      where: { id: s.contactoId, tenantId: ctx.tenantId },
      select: { email: true },
    });
    if (texto(c?.email).toLowerCase() !== s.para.trim().toLowerCase()) return "no_aplica" as EstadoAccesoContacto;
    const r = await asegurarAccesoContacto(ctx, { cuentaId: s.cuentaId, contactoId: s.contactoId }, dryRun);
    if (!dryRun && (r.estado === "invitado" || r.estado === "vinculado")) {
      await ctx.transaccion(async (tx) => {
        await ctx.eventos.emitir(tx, {
          tipo: "cpq.envio_propuesta.acceso_cliente",
          entidadTipo: "cuenta",
          entidadId: s.cuentaId ?? "",
          payload: { cuentaId: s.cuentaId, contactoId: s.contactoId, estado: r.estado },
        });
      });
    }
    return r.estado;
  } catch {
    // El acceso es un complemento: si falla, el cliente igual recibe sus PDF (sin instrucciones de portal).
    return "no_aplica" as EstadoAccesoContacto;
  }
}

async function enlacesDe(ctx: Contexto, pdfs: readonly PdfParaCorreo[]): Promise<EnlaceDocumento[]> {
  if (!ctx.servicios.almacenamiento.disponible) return [];
  const r: EnlaceDocumento[] = [];
  for (const p of pdfs) {
    if (!p.storageKey) continue;
    r.push({ nombre: p.nombre, url: await ctx.servicios.almacenamiento.urlDescarga(p.storageKey, p.nombre, SIETE_DIAS) });
  }
  return r;
}

async function armar(ctx: Contexto, s: SolicitudCorreoCliente, dryRun: boolean) {
  const acceso = await accesoDelContacto(ctx, s, dryRun);
  const base = await datosBase(ctx, s);
  const { adjuntar, enlazar } = elegirAdjuntos(s.pdfs);
  const enlaces = dryRun ? [] : await enlacesDe(ctx, s.pdfs.filter((p) => enlazar.includes(p)));
  const datos = {
    ...base,
    adjuntos: textoAdjuntos(adjuntar.map((p) => p.nombre), dryRun ? enlazar.map((p) => ({ nombre: p.nombre, url: "(enlace de descarga)" })) : enlaces),
    acceso: textoAcceso(acceso, { url: base.url, comercial: base.comercial.correo }),
  };
  return { acceso, datos, adjuntar, enlazar };
}

const destino = (ctx: Contexto) => ({
  db: ctx.db,
  tenantId: ctx.tenantId,
  correo: ctx.servicios.correo,
  urlBase: ctx.servicios.urlBase,
});

/** Crea o invita el acceso del contacto y le envía la cotización con sus PDF. Nunca lanza. */
export async function enviarCorreoCliente(ctx: Contexto, s: SolicitudCorreoCliente) {
  try {
    const { acceso, datos, adjuntar } = await armar(ctx, s, false);
    const adjuntos = adjuntar.flatMap((p) => {
      const c = s.pdfs.find((x) => x.clave === p.clave)?.contenido;
      return c ? [{ nombre: p.nombre, contenidoBase64: Buffer.from(c).toString("base64"), mime: "application/pdf" }] : [];
    });
    const historial = { origen: "cotizacion" as const, cuentaId: s.cuentaId, contactoId: s.contactoId, negocioId: s.negocioId ?? null };
    const enviado = await enviarCorreo(destino(ctx), EVENTO_CORREO_CLIENTE, s.para, datos, { adjuntos, historial });
    return { enviado, acceso };
  } catch {
    return { enviado: false, acceso: "no_aplica" as EstadoAccesoContacto };
  }
}

/** Lo que recibiría el cliente, sin enviar ni crear nada (vista previa del envío). */
export async function previsualizarCorreoCliente(ctx: Contexto, s: SolicitudCorreoCliente) {
  const { acceso, datos, adjuntar, enlazar } = await armar(ctx, s, true);
  const r = await previsualizarCorreo(destino(ctx), EVENTO_CORREO_CLIENTE, datos);
  return {
    para: s.para,
    asunto: r?.asunto ?? "",
    texto: r?.texto ?? "",
    adjuntos: adjuntar.map((p) => p.nombre),
    enlazados: enlazar.map((p) => p.nombre),
    acceso,
  };
}
