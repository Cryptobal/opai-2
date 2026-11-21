import { Badge, cn, FilaSeleccionable } from "@opai/ds";

import { LinkIndice } from "@/app/_components/link-indice";

import { type FilaLista, FiltroLista } from "./filtro-lista";
import { AREAS_MODULOS, ETIQUETA_AREA } from "./modulo-area";
import type { Seccion } from "./secciones";

const MAX_SIN_BUSCADOR = 7;

type Props = {
  entradas: readonly Seccion[];
  aprobaciones: number;
  seleccionada?: string;
};

function filaEntrada(s: Seccion, activa: boolean, aprobaciones: number, area?: string): FilaLista {
  const n = s.id === "aprobaciones" ? aprobaciones : 0;
  const texto = `${area ?? ""} ${s.titulo} ${s.descripcion}`.trim();
  return {
    id: s.id,
    texto,
    nodo: (
      <>
        <FilaSeleccionable
          className="border-0 md:hidden"
          Link={LinkIndice}
          href={s.href}
          titulo={s.titulo}
          secundario={s.descripcion}
          seleccionada={activa}
          inicio={<s.icono aria-hidden className="size-[18px] flex-none text-fg-muted" />}
          fin={n ? <Badge tono="warning">{n}</Badge> : null}
        />
        <LinkIndice
          href={s.href}
          aria-current={activa ? "page" : undefined}
          className={cn(
            "relative hidden min-h-11 items-center gap-3 px-4 py-2 text-fg outline-none transition-colors duration-150 hover:bg-fill dark:hover:bg-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus md:flex",
            activa &&
              "bg-accent-muted hover:bg-accent-muted before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-[3px] before:bg-accent before:content-['']",
          )}
        >
          <s.icono aria-hidden className="size-[18px] flex-none text-fg-muted" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn("truncate text-base", activa ? "font-semibold" : "font-medium")}>
              {s.titulo}
            </span>
            <span className="t-caption truncate">{s.descripcion}</span>
          </span>
          {n ? <Badge tono="warning">{n}</Badge> : null}
        </LinkIndice>
      </>
    ),
  };
}

function armarFilas(entradas: readonly Seccion[], aprobaciones: number, seleccionada?: string): FilaLista[] {
  const fijas = entradas.filter((s) => !s.id.startsWith("modulo-"));
  const mods = entradas.filter((s) => s.id.startsWith("modulo-"));
  const filas: FilaLista[] = fijas.map((s) => filaEntrada(s, s.id === seleccionada, aprobaciones));
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
      filas.push(filaEntrada(s, s.id === seleccionada, aprobaciones, etiqueta));
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