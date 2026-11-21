import { filaListaConfig } from "./fila-lista-config";
import { FiltroLista } from "./filtro-lista";
import type { Seccion } from "./secciones";

/** Más de 7 entradas solo las tiene el grupo Módulos (REGLA §1.3); ahí aparece el buscador propio. */
const MAX_SIN_BUSCADOR = 7;

type Props = {
  /** Etiqueta del grupo (para el nombre accesible de la lista). */
  etiqueta: string;
  entradas: readonly Seccion[];
  aprobaciones: number;
  /** Id de la entrada activa (se resalta con `aria-current`). */
  seleccionada?: string;
};

/**
 * Lista de las entradas visibles de un grupo (columna izquierda del `SplitScreen` en iPad/escritorio
 * y pantalla única en teléfono). Solo pinta las entradas del grupo, nunca el índice completo (REGLA
 * §1, brief §4.2). El grupo Módulos puede pasar de 7 entradas y entonces trae su propio buscador.
 */
export function ListaGrupo({ etiqueta, entradas, aprobaciones, seleccionada }: Props) {
  const filas = entradas.map((s) =>
    filaListaConfig(s, s.id === seleccionada, aprobaciones),
  );
  const conBuscador = entradas.length > MAX_SIN_BUSCADOR;
  return (
    <nav aria-label={`Entradas de ${etiqueta}`} className="flex flex-col pb-4">
      {conBuscador ? (
        <FiltroLista filas={filas} placeholder="Buscar un módulo" />
      ) : (
        <ul className="max-md:overflow-hidden max-md:rounded-lg max-md:border max-md:border-border max-md:bg-surface">
          {filas.map((f) => (
            <li key={f.id} className="max-md:border-b max-md:border-border">
              {f.nodo}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}