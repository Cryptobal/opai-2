import type { Contexto } from "@opai/capabilities";

export type LogoPdf = { bytes: Uint8Array; formato: "png" | "jpg" };

const TOPE_BYTES = 2 * 1024 * 1024;

/**
 * Logo principal de la marca del tenant (ADR-028) para incrustarlo en el PDF.
 * Solo PNG/JPG, con tope de tamaño y de tiempo; ante cualquier fallo devuelve `null` y el
 * documento usa el nombre de la empresa en texto (nunca se cae por el logo).
 */
export async function cargarLogoMarca(ctx: Contexto): Promise<LogoPdf | null> {
  try {
    const perfil = await ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } });
    if (!perfil?.logoPrincipalId || !ctx.servicios.almacenamiento.disponible) return null;
    const doc = await ctx.db.documento.findFirst({ where: { id: perfil.logoPrincipalId } });
    if (
      !doc ||
      doc.estado !== "disponible" ||
      !doc.mime.startsWith("image/") ||
      doc.tamano > TOPE_BYTES
    )
      return null;
    const tipo = doc.tipoId
      ? await ctx.db.documentoTipo.findFirst({ where: { id: doc.tipoId } })
      : null;
    if (!tipo?.codigo.startsWith("marca.")) return null;
    const url = await ctx.servicios.almacenamiento.urlDescarga(doc.storageKey, doc.nombre, 300);
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > TOPE_BYTES) return null;
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return { bytes, formato: "png" };
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return { bytes, formato: "jpg" };
    return null;
  } catch {
    return null;
  }
}
