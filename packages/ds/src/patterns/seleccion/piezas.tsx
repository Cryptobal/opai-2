"use client";

import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

import { Button } from "../../components/button";
import { Checkbox } from "../../components/checkbox";
import { BarraSeleccion } from "../../components/segmentado";

type Seleccion = {
  /** Ids elegidos, en el orden de la lista. */
  ids: readonly string[];
  alternar: (id: string) => void;
  todas: (marcar: boolean) => void;
  limpiar: () => void;
  visibles: readonly string[];
};

const Contexto = createContext<Seleccion | null>(null);

/**
 * Selección de varias filas de una lista (ADR-109, CAR-335 D4a). Las acciones masivas de cada
 * pantalla la leen con `useSeleccion` y llaman a su propia capacidad, que autoriza fila por fila.
 */
export function useSeleccion(): Seleccion {
  const s = useContext(Contexto);
  if (!s) throw new Error("useSeleccion fuera de una lista con selección");
  return s;
}

/** Envuelve la lista; se reinicia si cambian las filas visibles (otra página u otro filtro). */
export function ProveedorSeleccion({
  visibles,
  children,
}: {
  visibles: readonly string[];
  children: ReactNode;
}) {
  const clave = visibles.join("\n");
  const [estado, setEstado] = useState<{ clave: string; ids: readonly string[] }>({
    clave,
    ids: [],
  });
  const marcados = estado.clave === clave ? estado.ids : [];
  const valor = useMemo<Seleccion>(() => {
    // Funcional: dos cambios en el mismo instante no se pisan.
    const cambiar = (f: (actuales: readonly string[]) => readonly string[]) =>
      setEstado((e) => {
        const actuales = e.clave === clave ? e.ids : [];
        const nuevos = f(actuales);
        return { clave, ids: visibles.filter((v) => nuevos.includes(v)) };
      });
    return {
      ids: marcados,
      visibles,
      alternar: (id) => cambiar((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id])),
      todas: (marcar) => cambiar(() => (marcar ? visibles : [])),
      limpiar: () => cambiar(() => []),
    };
  }, [clave, marcados, visibles]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Casilla de la cabecera: marca o quita todas las filas visibles. */
export function CasillaTodas() {
  const s = useSeleccion();
  const todas = s.visibles.length > 0 && s.ids.length === s.visibles.length;
  return (
    <Checkbox
      soloControl
      etiqueta="Seleccionar todas las filas"
      marcado={todas}
      onCambiar={s.todas}
    />
  );
}

/** Casilla de una fila; va sobre el enlace estirado de la fila (z-10) para no abrir la ficha. */
export function CasillaFila({ id, etiqueta }: { id: string; etiqueta: string }) {
  const s = useSeleccion();
  return (
    // Sobre el enlace estirado (z-10) y sin llegar al clic de la fila, que abriría la ficha.
    <span className="relative z-10 inline-flex" onClick={(e) => e.stopPropagation()}>
      <Checkbox
        soloControl
        etiqueta={`Seleccionar ${etiqueta}`}
        marcado={s.ids.includes(id)}
        onCambiar={() => s.alternar(id)}
      />
    </span>
  );
}

/** Barra «N filas seleccionadas» con las acciones de la pantalla y «Quitar selección». */
export function BarraSeleccionLista({ acciones }: { acciones: ReactNode }) {
  const s = useSeleccion();
  const n = s.ids.length;
  const texto = `${n} ${n === 1 ? "fila seleccionada" : "filas seleccionadas"}`;
  const quitar = () => {
    s.limpiar();
    // La barra desaparece con el foco dentro: vuelve a la casilla de la cabecera.
    document.querySelector<HTMLElement>('[aria-label="Seleccionar todas las filas"]')?.focus();
  };
  return (
    <>
      <span role="status" className="sr-only">
        {n ? texto : ""}
      </span>
      {n ? (
        <BarraSeleccion texto={texto}>
          {acciones}
          <Button
            variant="ghost"
            className="text-inverse-fg hover:bg-inverse-fg/10"
            onClick={quitar}
          >
            Quitar selección
          </Button>
        </BarraSeleccion>
      ) : null}
    </>
  );
}
