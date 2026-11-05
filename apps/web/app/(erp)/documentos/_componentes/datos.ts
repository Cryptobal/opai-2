import type { Documento, TipoDocumento } from "@/app/_components/documentos/tipos";
import { estadoPantalla } from "@/lib/formato";
import { esUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";
import { vocabularioActual } from "@/lib/vocabulario";

import { opcionesDeSubida } from "./subida-permisos";

export const POR_PAGINA = 50;

export type FilaExplorador = Documento & {
  entidad: { tipo: string; id: string; nombre: string | null } | null;
  firma: "pendiente" | "firmado" | null;
};

type PaginaExplorador = { items: FilaExplorador[]; siguiente: string | null; total: number };

const VIGENCIAS = ["vigente", "por_vencer", "vencido", "sin_fecha"];
const ENTIDADES = ["tenant", "cuenta", "instalacion", "persona", "puesto"];
const ORDENES = ["recientes", "nombre", "vence"];
const dentro = (v: string | undefined, validos: string[]) =>
  v && validos.includes(v) ? v : undefined;

/** Parámetros de la URL → entrada de la capacidad; lo que no es válido se ignora (la URL es del usuario). */
export function entradaDe(p: Parametros) {
  const vigencia = dentro(p["estado"], VIGENCIAS);
  const entidadTipo = dentro(p["entidad"], ENTIDADES);
  const orden = dentro(p["orden"], ORDENES);
  return {
    limite: POR_PAGINA,
    ...(p["q"] ? { q: p["q"] } : {}),
    ...(vigencia ? { vigencia } : {}),
    ...(entidadTipo ? { entidadTipo } : {}),
    ...(orden ? { orden } : {}),
    ...(p["tipo"] && esUuid(p["tipo"]) ? { tipoId: p["tipo"] } : {}),
    ...(p["cursor"] && esUuid(p["cursor"]) ? { cursor: p["cursor"] } : {}),
  };
}

/**
 * Documentos de la página, los tipos para el filtro y la subida, y los permisos de la persona, en
 * paralelo (una sola pasada por navegación, ADR-045). La subida del explorador elige a qué vincular
 * (empresa por defecto, cuenta, instalación o persona); `vinculables` solo ofrece las entidades cuya
 * lista la persona puede leer. Quién puede vincular a cuál lo decide la capacidad de subida.
 */
export async function cargarExplorador(p: Parametros) {
  const [r, t, identidad, voc] = await Promise.all([
    ejecutarComoUsuario<PaginaExplorador>("erp", "core.documentos.explorar", entradaDe(p)),
    ejecutarComoUsuario<TipoDocumento[]>("erp", "core.documento_tipos.list", {}),
    requerirIdentidad("/documentos"),
    vocabularioActual(),
  ]);
  const tipos = t.ok ? t.data : [];
  // El supervisor sube a sus instalaciones con el permiso acotado; la empresa no está en su alcance.
  const subida = opcionesDeSubida(
    puedeDeIdentidad(identidad),
    identidad.actual?.rol,
    identidad.acceso.instalaciones !== null,
  );
  return {
    state: estadoPantalla(r),
    items: r.ok ? r.data.items : [],
    siguiente: r.ok ? r.data.siguiente : null,
    total: r.ok ? r.data.total : null,
    tipos,
    ...subida,
    tenantId: identidad.actual?.tenantId ?? "",
    voc,
  };
}
