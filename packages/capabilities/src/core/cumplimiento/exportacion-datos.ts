import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { filtroDocumentoAnexo } from "../documentos/sensibles";
import { dia } from "../maestros/comun";
import type { TitularVista } from "./comunes";

/** Documentos vinculados a una entidad, solo metadatos (sin exponer el archivo). */
async function documentosDe(ctx: Contexto, tipo: string, id: string) {
  const vinculos = await ctx.db.documentoVinculo.findMany({ where: { entidadTipo: tipo, entidadId: id } });
  const ids = vinculos.map((v) => v.documentoId);
  if (!ids.length) return [];
  const docs = await ctx.db.documento.findMany({
    // El documento de un anexo (sueldos) sale solo para quien puede ver anexos.
    where: {
      id: { in: ids },
      estado: { in: ["disponible", "reemplazado"] },
      AND: filtroDocumentoAnexo(ctx),
    },
  });
  return docs.map((d) => ({
    nombre: d.nombre,
    titulo: d.titulo,
    emitidoEn: dia(d.emitidoEn),
    venceEn: dia(d.venceEn),
    subidoEn: d.confirmadoEn?.toISOString() ?? null,
  }));
}

/**
 * Reúne los datos del titular para la exportación de acceso/portabilidad (§4.4). No crea un almacén
 * paralelo: lee lo que ya existe por entidad (persona/contacto, vínculos, documentos) dentro del
 * tenant (RLS). Devuelve un objeto legible por máquina.
 */
export async function armarExportacion(ctx: Contexto, titular: TitularVista) {
  if (titular.tipo === "persona") {
    const p = await ctx.db.persona.findUnique({ where: { id: titular.id } });
    if (!p) throw noEncontrado("El titular (persona)");
    const vinculos = await ctx.db.vinculoLaboral.findMany({ where: { personaId: p.id } });
    return {
      tipo: "persona",
      identificacion: { nombres: p.nombres, apellidos: p.apellidos, rut: p.rut, nacionalidad: p.nacionalidad },
      contacto: { emailPersonal: p.emailPersonal, emailLaboral: p.emailLaboral, telefono: p.telefono },
      domicilio: { calle: p.calle, comuna: p.comuna, region: p.region, pais: p.pais },
      laboral: vinculos.map((v) => ({ cargoId: v.cargoId, tipo: v.tipo, inicio: dia(v.inicio), termino: dia(v.termino) })),
      documentos: await documentosDe(ctx, "persona", p.id),
    };
  }
  const c = await ctx.db.contacto.findUnique({ where: { id: titular.id } });
  if (!c) throw noEncontrado("El titular (contacto)");
  return {
    tipo: "contacto",
    identificacion: { nombres: c.nombres, apellidos: c.apellidos },
    contacto: { email: c.email, telefono: c.telefono, cargo: c.cargo },
    cuentaId: c.cuentaId,
    documentos: await documentosDe(ctx, "contacto", c.id),
  };
}
