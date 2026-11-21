import { filaListaConfig } from "./fila-lista-config";
import { type FilaLista, FiltroLista } from "./filtro-lista";
import { AREAS_MODULOS, ETIQUETA_AREA } from "./modulo-area";
import type { Seccion } from "./secciones";

const MAX_SIN_BUSCADOR = 7;

type Props = {
  entradas: readonly Seccion[];
  aprobaciones: number;
  seleccionada?: string;
};

function armarFilas(entradas: readonly Seccion[], aprobaciones: number, seleccionada?: string): FilaLista[] {
  const fijas = entradas.filter((s) => !s.id.startsWith("modulo-"));
  const mods = entradas.filter((s) => s.id.startsWith("modulo-"));
  const filas: FilaLista[] = fijas.map((s) =>
    filaListaConfig(s, s.id === seleccionada, aprobaciones),
  );
  for (const area of AREAS_MODULOS) {
    const delArea = mods.filter((m) => (m.areaMenu ?? "operaciones") === area);
    if (!delArea.length) continue;
    const etiqueta = ETIQUETA_AREA[area];
    filas.push({
      id: `area-${area}`,
      encabezado: true,
      texto: etiqueta,
      nodo: (
        <h3 className="t-caption px-4 pb-1 pt-4 text-fg-muted first:pt-2 md:px-4">{etiqueta}</h3>
      ),
    });
    for (const s of delArea) {
      filas.push(
        filaListaConfig(s, s.id === seleccionada, aprobaciones, `${etiqueta} ${s.titulo} ${s.descripcion}`),
      );
    }
  }
  return filas;
}

function sinEncabezadosHuerfanos(filas: FilaLista[]): FilaLista[] {
  const out: FilaLista[] = [];
  for (let i = 0; i < filas.length; i++) {
    const f = filas[i]!;
    if (!f.encabezado) {
      out.push(f);
      continue;
    }
    let hayModulo = false;
    for (let j = i + 1; j < filas.length; j++) {
      const g = filas[j]!;
      if (g.encabezado) break;
      hayModulo = true;
      break;
    }
    if (hayModulo) out.push(f);
  }
  return out;
}

/**
 * Lista del grupo Módulos: catálogo fijo y módulos contratados agrupados por área del menú (CAR-744).
 */
export function ListaModulos({ entradas, aprobaciones, seleccionada }: Props) {
  const filas = armarFilas(entradas, aprobaciones, seleccionada);
  const conBuscador = entradas.length > MAX_SIN_BUSCADOR;
  const lista = (
    <ul className="max-md:overflow-hidden max-md:rounded-lg max-md:border max-md:border-border max-md:bg-surface">
      {filas.map((f) => (
        <li key={f.id} className={f.encabezado ? undefined : "max-md:border-b max-md:border-border"}>
          {f.nodo}
        </li>
      ))}
    </ul>
  );
  return (
    <nav aria-label="Entradas de Módulos" className="flex flex-col pb-4">
      {conBuscador ? (
        <FiltroLista
          filas={filas}
          placeholder="Buscar un módulo"
          limpiarEncabezados={sinEncabezadosHuerfanos}
        />
      ) : (
        lista
      )}
    </nav>
  );
}