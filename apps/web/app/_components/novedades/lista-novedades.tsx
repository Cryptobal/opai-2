"use client";

import { Alerta, Empty, Skeleton } from "@opai/ds";

import { EncabezadoNovedades } from "./encabezado-novedades";
import { MODULO_TODOS } from "./filtro-novedades";
import { GruposNovedades } from "./grupos-novedades";
import { useListaNovedadesEstado } from "./use-lista-novedades-estado";
import { VacioFiltroNovedades } from "./vacio-filtro-novedades";

function textoMarcarTodas(modulo: string): string {
  return modulo === MODULO_TODOS
    ? "Marcar todas como leídas"
    : `Marcar como leídas las de ${modulo}`;
}

export function ListaNovedades({ portal }: { portal: string }) {
  const estado = useListaNovedadesEstado(portal);
  const {
    error,
    errorMarca,
    datos,
    filtro,
    setFiltro,
    moduloActivo,
    modulos,
    setModulo,
    noLeidasFiltradas,
    visibles,
    marcarUna,
    marcarFiltradas,
    verTodas,
  } = estado;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {error ? <Alerta tono="danger" titulo="No pudimos cargar las novedades" /> : null}
      {errorMarca ? (
        <Alerta tono="danger" titulo="No pudimos marcar las novedades como leídas" />
      ) : null}
      {datos === null ? (
        <Skeleton className="h-40" />
      ) : datos.items.length === 0 ? (
        <Empty
          titulo="No hay novedades para mostrar"
          descripcion="Cuando integremos un cambio visible en OPAI, aparecerá aquí."
        />
      ) : (
        <>
          <EncabezadoNovedades
            noLeidas={noLeidasFiltradas}
            filtro={filtro}
            onFiltro={setFiltro}
            modulo={moduloActivo}
            modulos={modulos}
            onModulo={setModulo}
            onMarcarFiltradas={marcarFiltradas}
            textoMarcar={textoMarcarTodas(moduloActivo)}
          />
          {visibles.length === 0 ? (
            <VacioFiltroNovedades filtro={filtro} modulo={moduloActivo} onVerTodas={verTodas} />
          ) : null}
          <GruposNovedades items={visibles} onMarcar={marcarUna} />
        </>
      )}
    </div>
  );
}