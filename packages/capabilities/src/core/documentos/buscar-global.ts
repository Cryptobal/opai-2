import type { Contexto } from "../../types";
import type { ResultadoBusqueda } from "../maestros/buscadores";
import { documentosEnAlcance } from "./alcance-doc";
import { dondeTexto } from "./explorar-filtros";
import { filtroDocumentoSensible } from "./sensibles";

const MAX = 5;

/**
 * Documentos del tenant para ⌘K / `core.buscar` (CAR-526): reutiliza el filtro de texto del
 * explorador (`dondeTexto`), el alcance del supervisor y la exclusión de sensibles. Hasta 5.
 */
export async function buscarDocumentosGlobal(ctx: Contexto, q: string): Promise<ResultadoBusqueda[]> {
  const permitidos = await documentosEnAlcance(ctx);
  const filas = await ctx.db.documento.findMany({
    where: {
      AND: [
        filtroDocumentoSensible(ctx),
        { estado: "disponible" },
        ...(permitidos ? [{ id: { in: [...permitidos] } }] : []),
        dondeTexto(q),
      ],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MAX,
    select: { id: true, nombre: true, titulo: true },
  });
  return filas.map((d) => ({
    id: d.id,
    titulo: d.titulo?.trim() || d.nombre,
    detalle: d.titulo?.trim() ? d.nombre : null,
    href: `/documentos?ver=${d.id}`,
  }));
}
