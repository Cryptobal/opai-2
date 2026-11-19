import { PaginacionEnlaces } from "@/app/_components/maestros/paginacion-enlaces";
import type { Parametros } from "@/lib/parametros";

type Props = { p: Parametros; mostrados: number; siguiente: string | null; total: number | null };

/** "1–50 de 57 personas" con Anterior/Siguiente por cursor (la pila de cursores va en `?prev=`; "0" es la primera página). */
export function Paginacion({ p, mostrados, siguiente, total }: Props) {
  return <PaginacionEnlaces p={p} mostrados={mostrados} siguiente={siguiente} total={total} />;
}