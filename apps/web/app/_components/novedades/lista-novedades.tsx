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
  const [filtro, setFiltro] = useState<FiltroNovedades>("todas");

  const cargar = useCallback(() => {
    setError(false);
    return ejecutarCapacidad(portal, "core.novedades.list", {}).then((r) => {
      if (!r.ok) {
        setError(true);
        return;
      }
      setDatos(r.data as Respuesta);
    });
  }, [portal]);

  useEffect(() => {
    let activo = true;
    void ejecutarCapacidad(portal, "core.novedades.list", {}).then((r) => {
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

  const marcarUna = useMarcarUnaNovedad(portal, datos, setDatos, setErrorMarca);

  const visibles = (datos?.items ?? []).filter((i) => filtro === "todas" || !i.leida);

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
          <GruposNovedades items={visibles} onMarcar={marcarUna} />
        </>
      )}
    </div>
  );
}
