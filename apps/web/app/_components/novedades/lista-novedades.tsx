"use client";

import { useCallback, useEffect, useState } from "react";

import { Alerta, Button, Empty, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

import { TarjetaNovedad, type ItemNovedad } from "./tarjeta-novedad";
import { useMarcarNovedades } from "./use-marcar-novedades";
import { useMarcarUnaNovedad } from "./use-marcar-una-novedad";

type Respuesta = {
  items: ItemNovedad[];
  noLeidas: number;
  destacadaPendiente: ItemNovedad | null;
};

export function ListaNovedades({ portal }: { portal: string }) {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState(false);
  const [errorMarca, setErrorMarca] = useState(false);
  const [cerrando, setCerrando] = useState(false);

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

  const descartarDestacada = (id: string) => {
    setCerrando(true);
    void ejecutarCapacidad(portal, "core.novedades.descartar_destacada", { id }).then((r) => {
      setCerrando(false);
      if (r.ok) void cargar();
    });
  };

  const destacada = datos?.destacadaPendiente;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {destacada ? (
        <Alerta
          tono="info"
          titulo={destacada.titulo}
          accion={
            <Button
              variant="ghost"
              size="md"
              disabled={cerrando}
              onClick={() => descartarDestacada(destacada.id)}
            >
              Entendido
            </Button>
          }
        >
          <p className="t-body-sm whitespace-pre-wrap">{destacada.descripcion.split("\n")[0]}</p>
        </Alerta>
      ) : null}
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
          {datos.noLeidas > 0 ? (
            <div className="flex justify-end">
              <Button variant="secondary" onClick={marcarTodas}>
                Marcar todas como leídas ({datos.noLeidas})
              </Button>
            </div>
          ) : null}
          <ul className="flex flex-col gap-3">
            {datos.items.map((item) => (
              <li key={item.id} onClickCapture={() => marcarUna(item.id)}>
                <TarjetaNovedad item={item} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
