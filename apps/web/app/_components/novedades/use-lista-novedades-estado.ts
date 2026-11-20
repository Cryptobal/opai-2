"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";

import type { FiltroNovedades } from "./encabezado-novedades";
import {
  contarNoLeidas,
  filtrarItems,
  idsNoLeidasFiltradas,
  MODULO_TODOS,
  modulosConNovedades,
} from "./filtro-novedades";
import type { ItemNovedad } from "./tarjeta-novedad";
import { useMarcarNovedades } from "./use-marcar-novedades";
import { useMarcarUnaNovedad } from "./use-marcar-una-novedad";

type Respuesta = { items: ItemNovedad[]; noLeidas: number; destacadaPendiente: ItemNovedad | null };

export function useListaNovedadesEstado(portal: string) {
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

  const marcar = useMarcarNovedades(portal, datos, setDatos, setErrorMarca, () => void cargar());
  const marcarEnLista = useMarcarUnaNovedad(portal, datos, setDatos, setErrorMarca);

  const modulos = useMemo(() => (datos ? modulosConNovedades(datos.items) : []), [datos]);
  const moduloActivo =
    modulo === MODULO_TODOS || modulos.includes(modulo) ? modulo : MODULO_TODOS;
  const noLeidasFiltradas = datos ? contarNoLeidas(datos.items, moduloActivo) : 0;
  const visibles = datos
    ? filtrarItems({ items: datos.items, filtro, modulo: moduloActivo, leidasAqui })
    : [];

  return {
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
    marcarUna: (id: string) => {
      if (filtro === "no_leidas") setLeidasAqui((s) => new Set(s).add(id));
      marcarEnLista(id);
    },
    marcarFiltradas: () => {
      if (!datos) return;
      marcar(idsNoLeidasFiltradas(datos.items, moduloActivo));
    },
    verTodas: () => {
      setFiltro("todas");
      setModulo(MODULO_TODOS);
    },
  };
}