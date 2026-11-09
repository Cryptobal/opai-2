"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { Alerta, Badge, Button, Empty, Enlace, SeccionTarjeta, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

type ItemNovedad = {
  id: string;
  fecha: string;
  moduloEtiqueta: string;
  titulo: string;
  descripcion: string;
  ruta: string | null;
  imagen: string | null;
  destacada: boolean;
  car: string | null;
  leida: boolean;
};

type Respuesta = {
  items: ItemNovedad[];
  noLeidas: number;
  destacadaPendiente: ItemNovedad | null;
};

function formatearFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

export function ListaNovedades({ portal }: { portal: string }) {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState(false);
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

  const marcarTodas = () =>
    void ejecutarCapacidad(portal, "core.novedades.marcar_todas", {}).then((r) => {
      if (r.ok) void cargar();
    });

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
              <li key={item.id}>
                <SeccionTarjeta
                  titulo={item.leida ? item.titulo : `Nueva · ${item.titulo}`}
                  accion={<Badge tono="neutro" punto={false}>{item.moduloEtiqueta}</Badge>}
                >
                  <p className="t-caption mb-2 text-fg-muted">
                    {formatearFecha(item.fecha)}
                    {item.car ? ` · ${item.car}` : ""}
                  </p>
                  <p className="t-body whitespace-pre-wrap text-fg">{item.descripcion}</p>
                  {item.imagen ? (
                    <div className="relative mt-3 aspect-video w-full max-w-md overflow-hidden rounded-md border border-border">
                      <Image
                        src={item.imagen}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 400px"
                      />
                    </div>
                  ) : null}
                  {item.ruta ? (
                    <div className="mt-3">
                      <Enlace href={item.ruta}>Ver en OPAI</Enlace>
                    </div>
                  ) : null}
                </SeccionTarjeta>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
