import type { Parametros } from "@/lib/parametros";
import { PaginacionCursor } from "@/lib/paginacion-cursor";

import { POR_PAGINA } from "./datos";

type Props = { p: Parametros; mostrados: number; siguiente: string | null; total: number | null };

export function Paginacion({ p, mostrados, siguiente, total }: Props) {
  return (
    <PaginacionCursor p={p} porPagina={POR_PAGINA} mostrados={mostrados} siguiente={siguiente} total={total} />
  );
}