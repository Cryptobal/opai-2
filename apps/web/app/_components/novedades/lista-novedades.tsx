"use client";

import { useCallback, useEffect, useState } from "react";

import { Alerta, Button, Empty, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

import { EncabezadoNovedades, type FiltroNovedades } from "./encabezado-novedades";
import { GruposNovedades } from "./grupos-novedades";
import type { ItemNovedad } from "./tarjeta-novedad";
import { useMarcarNovedades } from "./use-marcar-novedades";
import { useMarcarUnaNovedad } from "./use-marcar-una-novedad";

type Respuesta = { items: ItemNovedad[]; noLeidas: number; destacadaPendiente: ItemNovedad | null };

export function ListaNovedades({ portal }: { portal: string }) {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState(false);
  const [errorMarca, setErrorMarca] = useState(false);
  const [filtro, setFiltroEstado] = useState<FiltroNovedades>("todas");
  // Las que se leen con «No leídas» activo siguen visibles hasta cambiar de filtro: la lista no salta.
  const [leidasAqui, setLeidasAqui] = useState<ReadonlySet<string>>(new Set());
  const setFiltro = (f: FiltroNovedades) => {
    setLeidasAqui(new Set());
    setFiltroEstado(f);
  };

  const cargar = useCallback(() => {
    setError(false);
    return ejecutarCapacidad(portal, "core.novedades.list", { portal }).then((r) => {
      if (!r.ok) {
        setError(true);
        return;
      }
      setDatos(r.data as Respuesta);
    });
  }, [portal]);

  useEffect(() => {
    let activo = true;
    void ejecutarCapacidad(portal, "core.novedades.list", { portal }).then((r) => {
      if (!activo) return;
      if (!r.ok) {
        setError(true);
        return;
      }
      setDatos(r.data as Respuesta);
    });
    return () => {
      activo = false;
    };
  }, [portal]);

  const marcarTodas = useMarcarNovedades(
    portal,
    datos,
    setDatos,
    setErrorMarca,
    () => void cargar(),
  );

  const marcarEnLista = useMarcarUnaNovedad(portal, datos, setDatos, setErrorMarca);
  const marcarUna = (id: string) => {
    if (filtro === "no_leidas") setLeidasAqui((s) => new Set(s).add(id));
    marcarEnLista(id);
  };

  const visibles = (datos?.items ?? []).filter(
    (i) => filtro === "todas" || !i.leida || leidasAqui.has(i.id),
  );

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
            noLeidas={datos.noLeidas}
            filtro={filtro}
            onFiltro={setFiltro}
            onMarcarTodas={marcarTodas}
          />
          {visibles.length === 0 ? (
            <Empty
              titulo="No tienes novedades sin leer"
              descripcion="Las que ya leíste siguen en «Todas»."
              accion={
                <Button variant="secondary" onClick={() => setFiltro("todas")}>
                  Ver todas
                </Button>
              }
            />
          ) : null}
          {visibles.length > 0 ? <GruposNovedades items={visibles} onMarcar={marcarUna} /> : null}
        </>
      )}
    </div>
  );
}
