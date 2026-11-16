"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Alerta, Empty, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

import {
  contarNoLeidas,
  filtrarItems,
  idsNoLeidasFiltradas,
  MODULO_TODOS,
  modulosConNovedades,
} from "./filtro-novedades";
import { EncabezadoNovedades, type FiltroNovedades } from "./encabezado-novedades";
import { GruposNovedades } from "./grupos-novedades";
import type { ItemNovedad } from "./tarjeta-novedad";
import { useMarcarNovedades } from "./use-marcar-novedades";
import { useMarcarUnaNovedad } from "./use-marcar-una-novedad";
import { VacioFiltroNovedades } from "./vacio-filtro-novedades";

type Respuesta = { items: ItemNovedad[]; noLeidas: number; destacadaPendiente: ItemNovedad | null };

function textoMarcarTodas(modulo: string): string {
  return modulo === MODULO_TODOS
    ? "Marcar todas como leídas"
    : `Marcar como leídas las de ${modulo}`;
}

export function ListaNovedades({ portal }: { portal: string }) {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState(false);
  const [errorMarca, setErrorMarca] = useState(false);
  const [filtro, setFiltroEstado] = useState<FiltroNovedades>("todas");
  const [modulo, setModuloEstado] = useState(MODULO_TODOS);
  const [leidasAqui, setLeidasAqui] = useState<ReadonlySet<string>>(new Set());
  const setFiltro = (f: FiltroNovedades) => {
    setLeidasAqui(new Set());
    setFiltroEstado(f);
  };
  const setModulo = (m: string) => {
    setLeidasAqui(new Set());
    setModuloEstado(m);
  };

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

  const marcar = useMarcarNovedades(
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

  const modulos = useMemo(() => (datos ? modulosConNovedades(datos.items) : []), [datos]);
  const moduloActivo =
    modulo === MODULO_TODOS || modulos.includes(modulo) ? modulo : MODULO_TODOS;
  const noLeidasFiltradas = datos ? contarNoLeidas(datos.items, moduloActivo) : 0;
  const visibles = datos
    ? filtrarItems({ items: datos.items, filtro, modulo: moduloActivo, leidasAqui })
    : [];

  const marcarFiltradas = () => {
    if (!datos) return;
    marcar(idsNoLeidasFiltradas(datos.items, moduloActivo));
  };

  const verTodas = () => {
    setFiltro("todas");
    setModulo(MODULO_TODOS);
  };

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